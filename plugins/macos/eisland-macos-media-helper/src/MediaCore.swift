/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file MediaCore.swift
 * @description Swift 当前播放源缓存、桥接监听与异步媒体命令。
 * @author 鸡哥
 */
import Foundation
import Darwin

/** 每个 Node 客户端独立拥有监听进程和缓存，不跨 Worker 共享运行环境。 */
final class MediaCore {
  private let lock = NSRecursiveLock()
  private let streamQueue = DispatchQueue(label: "eisland.media.stream")
  private let script: String
  private let framework: String
  private let timeout: Double
  private var listener: Process?
  private var requests: [UUID: Process] = [:]
  private var generation = 0
  private var closed = false
  private var payload: [String: Any] = [:]
  private var anchorPosition: Double = 0
  private var anchorUptime: Double = 0
  private var revision = 0
  private var streamError: String?

  /**
   * 创建独立的 Swift 媒体缓存。
   * @param script - Perl 桥接脚本的绝对路径。
   * @param framework - 桥接框架的绝对路径。
   * @param timeout - 单次桥接请求的超时秒数。
   */
  init(script: String, framework: String, timeout: Double) {
    self.script = script
    self.framework = framework
    self.timeout = timeout
  }

  /** @returns 是否已提供有效的绝对资源路径。 */
  private func resourceError() -> String? {
    guard script.hasPrefix("/"), framework.hasPrefix("/") else {
      return "Media bridge paths must be absolute."
    }
    guard FileManager.default.fileExists(atPath: script),
          FileManager.default.fileExists(atPath: framework) else {
      return "Media bridge resources are missing. Run npm run build."
    }
    return nil
  }

  /** @param arguments - 通过参数数组传递给 Perl，不执行 shell 拼接。 */
  private func makeProcess(_ arguments: [String]) -> Process {
    let process = Process()
    // Rosetta 下不能假定子进程沿用 Node 的架构，需与随包框架保持一致。
    #if arch(arm64)
    let architecture = "arm64"
    #else
    let architecture = "x86_64"
    #endif
    process.executableURL = URL(fileURLWithPath: "/usr/bin/arch")
    process.arguments = ["-\(architecture)", "/usr/bin/perl", script, framework] + arguments
    return process
  }

  /** @returns 启动结果；重复启动不创建额外进程。 */
  func start() -> [String: Any] {
    lock.lock()
    defer { lock.unlock() }
    if closed { return failure("Media client is closed.") }
    if listener != nil { return success() }
    if let error = resourceError() { return failure(error) }

    generation += 1
    let token = generation
    let process = makeProcess(["stream", "--no-diff", "--micros", "--debounce=100", "--allow-missing-title"])
    let output = Pipe()
    let errors = Pipe()
    let errorBuffer = ProcessOutput(limit: 65536)
    let errorReader = DispatchGroup()
    errorReader.enter()
    process.standardOutput = output
    process.standardError = errors
    listener = process
    streamError = nil
    var buffer = Data()

    output.fileHandleForReading.readabilityHandler = { [weak self] handle in
      let chunk = handle.availableData
      guard !chunk.isEmpty, let self else { return }
      self.streamQueue.async {
        self.lock.lock()
        defer { self.lock.unlock() }
        guard self.generation == token, self.listener != nil else { return }
        buffer.append(chunk)
        if buffer.count > 12 * 1024 * 1024 {
          self.streamError = "Media bridge output exceeded 12 MiB."
          self.payload = [:]
          self.revision += 1
          terminateMediaProcess(process)
          return
        }
        while let newline = buffer.firstIndex(of: 10) {
          let line = Data(buffer[..<newline])
          buffer.removeSubrange(...newline)
          do {
            guard let envelope = try JSONSerialization.jsonObject(with: line) as? [String: Any],
                  envelope["type"] as? String == "data",
                  envelope["diff"] as? Bool == false,
                  let data = envelope["payload"] as? [String: Any] else {
              throw NSError(domain: "eisland.media", code: 1)
            }
            self.update(data)
          } catch {
            self.streamError = "Invalid media bridge stream JSON."
            self.payload = [:]
            self.revision += 1
          }
        }
      }
    }
    process.terminationHandler = { [weak self] ended in
      output.fileHandleForReading.readabilityHandler = nil
      // 退出通知可能先于 stderr 的 EOF 读取，避免丢失最后的诊断信息。
      _ = errorReader.wait(timeout: .now() + 1)
      self?.streamQueue.async { [weak self] in
        guard let self else { return }
        self.lock.lock()
        defer { self.lock.unlock() }
        guard self.generation == token else { return }
        self.listener = nil
        self.payload = [:]
        self.revision += 1
        let message = String(data: errorBuffer.result().0, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
        self.streamError = self.streamError ?? (message?.isEmpty == false ? message! : "Media bridge exited (\(ended.terminationStatus)).")
      }
    }
    do {
      try process.run()
      try? output.fileHandleForWriting.close()
      try? errors.fileHandleForWriting.close()
      DispatchQueue.global(qos: .utility).async {
        errorBuffer.drain(errors.fileHandleForReading)
        errorReader.leave()
      }
      return success()
    } catch {
      errorReader.leave()
      output.fileHandleForReading.readabilityHandler = nil
      listener = nil
      streamError = error.localizedDescription
      return failure(error.localizedDescription)
    }
  }

  /** 停止监听并丢弃旧进程迟到的回调，允许再次启动。 */
  func stop() {
    lock.lock()
    generation += 1
    let process = listener
    listener = nil
    payload = [:]
    streamError = nil
    revision += 1
    lock.unlock()
    if let process { terminateMediaProcess(process) }
  }

  /** 关闭客户端，并取消 Worker 退出时仍在运行的后台请求。 */
  func close() {
    lock.lock()
    closed = true
    let pending = Array(requests.values)
    lock.unlock()
    stop()
    pending.forEach(terminateMediaProcess)
  }

  /** @param data - 完整快照；刷新不含封面时仅在同一曲目保留旧封面。 */
  private func update(_ data: [String: Any], preserveArtwork: Bool = false) {
    var next = data.filter { !($0.value is NSNull) }
    if preserveArtwork,
       sourceID(next) == sourceID(payload),
       next["title"] as? String == payload["title"] as? String,
       next["artist"] as? String == payload["artist"] as? String,
       next["uniqueIdentifier"] as? String == payload["uniqueIdentifier"] as? String {
      next["artworkData"] = payload["artworkData"]
      next["artworkMimeType"] = payload["artworkMimeType"]
    }
    payload = next
    let elapsed = number(next, "elapsedTimeMicros") / 1_000_000
    let timestamp = number(next, "timestampEpochMicros") / 1_000_000
    let age = timestamp > 0 ? max(0, Date().timeIntervalSince1970 - timestamp) : 0
    anchorPosition = max(0, elapsed + age * effectiveRate())
    anchorUptime = ProcessInfo.processInfo.systemUptime
    streamError = nil
    revision += 1
  }

  /** @returns 播放时的有效速率，暂停时强制为零。 */
  private func effectiveRate() -> Double {
    guard payload["playing"] as? Bool == true else { return 0 }
    return payload["playbackRate"] == nil ? 1 : max(0, number(payload, "playbackRate"))
  }

  /** @returns 使用单调时钟计算的位置，避免系统时钟调整导致歌词跳动。 */
  private func position() -> Double {
    let estimated = max(0, anchorPosition + max(0, ProcessInfo.processInfo.systemUptime - anchorUptime) * effectiveRate())
    let duration = number(payload, "durationMicros") / 1_000_000
    return duration > 0 ? min(duration, estimated) : estimated
  }

  /** @param data - 原始快照；优先使用浏览器等媒体宿主的 Bundle ID。 */
  private func sourceID(_ data: [String: Any]) -> String {
    if let parent = data["parentApplicationBundleIdentifier"] as? String, !parent.isEmpty { return parent }
    return (data["bundleIdentifier"] as? String) ?? ""
  }

  /** @returns 有大小限制的封面 data URI，缺失或无效时返回 null。 */
  private func artwork() -> Any {
    guard let encoded = payload["artworkData"] as? String,
          encoded.utf8.count <= 12 * 1024 * 1024,
          let mime = payload["artworkMimeType"] as? String,
          ["image/jpeg", "image/png", "image/webp", "image/gif", "image/tiff", "image/heic"].contains(mime),
          let data = Data(base64Encoded: encoded), !data.isEmpty, data.count <= 8 * 1024 * 1024 else {
      return NSNull()
    }
    return "data:\(mime);base64,\(encoded)"
  }

  /** @returns 与 Windows 状态结构兼容的时间线，单位为秒。 */
  private func timeline() -> [String: Any] {
    let duration = max(0, number(payload, "durationMicros") / 1_000_000)
    return ["startTime": 0, "endTime": duration, "position": position(), "minSeekTime": 0, "maxSeekTime": duration]
  }

  /** @returns 当前可观测播放源的状态；控制能力未知时保留 null。 */
  private func status() -> [String: Any] {
    let available = !sourceID(payload).isEmpty
    return [
      "isAvailable": available,
      "title": payload["title"] ?? NSNull(), "artist": payload["artist"] ?? NSNull(),
      "albumTitle": payload["album"] ?? NSNull(), "albumArtist": NSNull(),
      "trackNumber": payload["trackNumber"] ?? NSNull(),
      "genres": (payload["genre"] as? String).map { [$0] } as Any? ?? NSNull(),
      "playbackStatus": available ? (effectiveRate() > 0 ? "playing" : "paused") : "unknown",
      "isShuffleActive": (payload["shuffleMode"] as? NSNumber).map { $0.intValue > 1 } as Any? ?? NSNull(),
      "repeatMode": (payload["repeatMode"] as? NSNumber).map { max(0, $0.intValue - 1) } as Any? ?? NSNull(),
      "playbackRate": payload["playbackRate"] ?? NSNull(),
      "sourceAppUserModelId": available ? sourceID(payload) as Any : NSNull(),
      "thumbnail": artwork(), "timeline": available ? timeline() as Any : NSNull(), "controls": NSNull()
    ]
  }

  /** @param kind - 0=状态，1=时间戳，2=会话，3=监听状态。 */
  func snapshot(_ kind: Int32) -> Any {
    lock.lock()
    defer { lock.unlock() }
    let available = !sourceID(payload).isEmpty
    if kind == 3 { return ["revision": revision, "running": listener != nil, "error": streamError as Any? ?? NSNull()] }
    if kind == 1 {
      return ["isAvailable": available, "playbackStatus": available ? (effectiveRate() > 0 ? "playing" : "paused") : "unknown", "timeline": available ? timeline() as Any : NSNull()]
    }
    if kind == 2 {
      guard available else { return [] as [Any] }
      return [[
        "sourceAppId": sourceID(payload),
        "media": ["title": payload["title"] ?? "", "artist": payload["artist"] ?? "", "albumTitle": payload["album"] ?? "", "albumArtist": "", "genres": (payload["genre"] as? String).map { [$0] } ?? [], "albumTrackCount": payload["totalTrackCount"] ?? 0, "trackNumber": payload["trackNumber"] ?? 0, "thumbnail": artwork()],
        "playback": ["playbackStatus": effectiveRate() > 0 ? 4 : 5, "playbackType": 0],
        "timeline": ["position": position(), "duration": max(0, number(payload, "durationMicros") / 1_000_000)]
      ]] as [[String: Any]]
    }
    return status()
  }

  /** @param arguments - 已验证的桥接参数；本方法仅由 N-API 后台任务调用。 */
  private func run(_ arguments: [String]) -> (Data?, String?) {
    if let error = resourceError() { return (nil, error) }
    let process = makeProcess(arguments)
    let output = Pipe()
    let errors = Pipe()
    let outBuffer = ProcessOutput(limit: 12 * 1024 * 1024)
    let errBuffer = ProcessOutput(limit: 65536)
    let done = DispatchSemaphore(value: 0)
    let readers = DispatchGroup()
    let id = UUID()
    process.standardOutput = output
    process.standardError = errors
    process.terminationHandler = { _ in done.signal() }
    lock.lock()
    if closed { lock.unlock(); return (nil, "Media client is closed.") }
    do {
      try process.run()
      requests[id] = process
      lock.unlock()
    } catch {
      lock.unlock()
      return (nil, error.localizedDescription)
    }
    try? output.fileHandleForWriting.close()
    try? errors.fileHandleForWriting.close()
    readers.enter()
    DispatchQueue.global(qos: .utility).async { outBuffer.drain(output.fileHandleForReading); readers.leave() }
    readers.enter()
    DispatchQueue.global(qos: .utility).async { errBuffer.drain(errors.fileHandleForReading); readers.leave() }
    let timedOut = done.wait(timeout: .now() + timeout) == .timedOut
    if timedOut {
      terminateMediaProcess(process)
      _ = done.wait(timeout: .now() + 1)
    }
    _ = readers.wait(timeout: .now() + 1)
    try? output.fileHandleForReading.close()
    try? errors.fileHandleForReading.close()
    lock.lock()
    requests.removeValue(forKey: id)
    let wasClosed = closed
    lock.unlock()
    if wasClosed { return (nil, "Media client is closed.") }
    if timedOut { return (nil, "Media bridge request timed out.") }
    let (data, overflow) = outBuffer.result()
    let (errorData, errorOverflow) = errBuffer.result()
    if overflow || errorOverflow { return (nil, "Media bridge output exceeded its size limit.") }
    let message = String(data: errorData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if process.terminationStatus != 0 { return (nil, message.isEmpty ? "Media bridge exited (\(process.terminationStatus))." : message) }
    if message.localizedCaseInsensitiveContains("timed out") { return (nil, message) }
    return (data, nil)
  }

  /** @param operation - refresh 或媒体命令；success 仅代表桥接命令已发送。 */
  func request(_ operation: String, value: Double) -> [String: Any] {
    let arguments: [String]
    switch operation {
    case "refresh": arguments = []
    case "play": arguments = ["send", "0"]
    case "pause": arguments = ["send", "1"]
    case "next": arguments = ["send", "4"]
    case "previous": arguments = ["send", "5"]
    case "stop": arguments = ["send", "3"]
    case "seek":
      guard value.isFinite, value >= 0, value < Double(Int64.max) / 1_000_000 else { return failure("Invalid seek position.") }
      arguments = ["seek", String(Int64((value * 1_000_000).rounded()))]
    case "shuffle":
      guard value == 0 || value == 1 else { return failure("Invalid shuffle value.") }
      arguments = ["shuffle", value == 1 ? "3" : "1"]
    case "repeat":
      guard value == 0 || value == 1 || value == 2 else { return failure("Invalid repeat mode.") }
      arguments = ["repeat", String(Int(value) + 1)]
    case "rate":
      guard value.isFinite, value > 0, value.rounded() == value, value <= Double(Int32.max) else {
        return failure("This MediaRemote bridge supports positive integer playback rates only.")
      }
      arguments = ["speed", String(Int(value))]
    default: return failure("Unsupported media command.")
    }

    let query = ["get", "--micros", "--allow-missing-title"] + (operation == "refresh" ? [] : ["--no-artwork"])
    lock.lock()
    let queryRevision = revision
    let wasMonitoring = listener != nil
    lock.unlock()
    let (data, queryError) = run(query)
    if let queryError { return failure(queryError) }
    do {
      guard let data else { return failure("Empty media bridge response.") }
      let raw = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
      guard raw is NSNull || raw is [String: Any] else { return failure("Invalid media bridge response.") }
      lock.lock()
      defer { lock.unlock() }
      if closed { return failure("Media client is closed.") }
      // 监听已收到新快照时，丢弃较晚返回的旧查询，避免曲目信息倒退。
      if !wasMonitoring || revision == queryRevision {
        update(raw as? [String: Any] ?? [:], preserveArtwork: operation != "refresh")
      }
    } catch {
      return failure("Invalid media bridge response JSON.")
    }
    if operation == "refresh" { return success() }
    lock.lock()
    let available = !sourceID(payload).isEmpty
    lock.unlock()
    if !available { return failure("No active media source.") }
    let (_, commandError) = run(arguments)
    return commandError.map(failure) ?? success()
  }
}

/** @returns JSON 数值；忽略非有限值以保护时间线序列化。 */
private func number(_ payload: [String: Any], _ key: String) -> Double {
  let value = (payload[key] as? NSNumber)?.doubleValue ?? 0
  return value.isFinite ? value : 0
}

/** @returns 仅代表命令已发送的成功结果，不代表播放器最终状态。 */
private func success() -> [String: Any] { ["success": true, "error": NSNull()] }

/** @param error - 可供调用方诊断的技术错误，不直接作为 UI 文案。 */
private func failure(_ error: String) -> [String: Any] { ["success": false, "error": error] }

/** @returns 调用方拥有的 UTF-8 JSON 缓冲区。 */
private func jsonString(_ value: Any) -> UnsafeMutablePointer<CChar>? {
  guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
        let string = String(data: data, encoding: .utf8) else { return nil }
  return strdup(string)
}

/** @returns 指定 C 句柄对应的 Swift 客户端。 */
private func core(_ handle: UnsafeMutableRawPointer) -> MediaCore {
  Unmanaged<MediaCore>.fromOpaque(handle).takeUnretainedValue()
}

/** @returns 调用方拥有的客户端句柄。 */
@_cdecl("media_create")
public func mediaCreate(_ script: UnsafePointer<CChar>, _ framework: UnsafePointer<CChar>, _ timeout: Double) -> UnsafeMutableRawPointer {
  Unmanaged.passRetained(MediaCore(script: String(cString: script), framework: String(cString: framework), timeout: timeout)).toOpaque()
}

/** 为后台任务延长句柄生命周期。 */
@_cdecl("media_retain")
public func mediaRetain(_ handle: UnsafeMutableRawPointer) { _ = Unmanaged<MediaCore>.fromOpaque(handle).retain() }

/** 释放一个句柄引用。 */
@_cdecl("media_release")
public func mediaRelease(_ handle: UnsafeMutableRawPointer) { Unmanaged<MediaCore>.fromOpaque(handle).release() }

/** 取消所有媒体子进程。 */
@_cdecl("media_close")
public func mediaClose(_ handle: UnsafeMutableRawPointer) { core(handle).close() }

/** @returns 启动监听的结果 JSON。 */
@_cdecl("media_start")
public func mediaStart(_ handle: UnsafeMutableRawPointer) -> UnsafeMutablePointer<CChar>? { jsonString(core(handle).start()) }

/** 停止监听，保留客户端以供再次启动。 */
@_cdecl("media_stop")
public func mediaStop(_ handle: UnsafeMutableRawPointer) { core(handle).stop() }

/** @returns 指定缓存快照的 JSON。 */
@_cdecl("media_snapshot")
public func mediaSnapshot(_ handle: UnsafeMutableRawPointer, _ kind: Int32) -> UnsafeMutablePointer<CChar>? { jsonString(core(handle).snapshot(kind)) }

/** @returns 后台媒体请求的结果 JSON。 */
@_cdecl("media_request")
public func mediaRequest(_ handle: UnsafeMutableRawPointer, _ operation: UnsafePointer<CChar>, _ value: Double) -> UnsafeMutablePointer<CChar>? {
  jsonString(core(handle).request(String(cString: operation), value: value))
}

/** 释放 C ABI 返回的字符串。 */
@_cdecl("media_free")
public func mediaFree(_ value: UnsafeMutablePointer<CChar>) { free(value) }
