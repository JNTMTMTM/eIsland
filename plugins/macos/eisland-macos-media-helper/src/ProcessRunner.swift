/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file ProcessRunner.swift
 * @description 有界读取桥接子进程的输出，避免封面和错误输出阻塞管道。
 * @author 鸡哥
 */
import Foundation
import Darwin

/** 子进程标准输出与错误输出的线程安全缓冲区。 */
final class ProcessOutput {
  private let lock = NSLock()
  private var storage = Data()
  private var overflow = false
  private let limit: Int

  /** @param limit - 最大保留字节数，超限后继续排空管道。 */
  init(limit: Int) { self.limit = limit }

  /** @param handle - 子进程的输出管道；读取至 EOF 后返回。 */
  func drain(_ handle: FileHandle) {
    do {
      while let chunk = try handle.read(upToCount: 65536), !chunk.isEmpty {
        lock.lock()
        if storage.count + chunk.count <= limit && !overflow {
          storage.append(chunk)
        } else {
          overflow = true
        }
        lock.unlock()
      }
    } catch {
      // 关闭客户端时会关闭管道，中断等待中的读取。
    }
  }

  /** @returns 输出及是否超过大小上限。 */
  func result() -> (Data, Bool) {
    lock.lock()
    defer { lock.unlock() }
    return (storage, overflow)
  }
}

/** @param process - 需要终止的子进程；先发送 SIGTERM，再强制结束拒绝退出的进程。 */
func terminateMediaProcess(_ process: Process) {
  guard process.isRunning else { return }
  process.terminate()
  let pid = process.processIdentifier
  DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 0.25) {
    if process.isRunning { kill(pid, SIGKILL) }
  }
}
