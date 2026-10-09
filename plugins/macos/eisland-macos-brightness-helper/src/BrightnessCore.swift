/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */
 
/**
 * @file BrightnessCore.swift
 * @description 统一硬件亮度百分比、目标选择与 Swift C ABI。
 * @author 鸡哥
 */
import Foundation

/** 延迟读取硬件，优先系统亮度接口；DDC 只在无可用原生屏幕时访问。 */
struct BrightnessTarget {
  let id: String
  let source: String
  let read: () -> Double?
  let write: (Double) -> Bool
}

/** 与 Windows 插件保持同一百分比快照结构。 */
struct BrightnessSnapshot {
  let currentBrightness: Int
  let instanceName: String
  let source: String
  let levels: [Int]? = nil
}

/**
 * 从有序目标中取得第一个可读屏幕。
 * @param targets - 内置屏、主屏、其他系统屏与 DDC 回退的延迟枚举。
 * @returns 当前百分比；无受支持硬件时为 nil。
 */
func queryBrightness(_ targets: () -> [BrightnessTarget]) -> BrightnessSnapshot? {
  for target in targets() {
    guard let value = target.read(), value.isFinite, (0...1).contains(value) else { continue }
    return BrightnessSnapshot(currentBrightness: Int((value * 100).rounded()), instanceName: target.id, source: target.source)
  }
  return nil
}

/**
 * 设置当前原生屏幕；没有可读原生屏幕时设置可读的 DDC 屏幕。
 * @param percent - 有限的百分比，按 Windows 行为四舍五入并限制在 0–100。
 * @param targets - 与查询相同的硬件目标顺序。
 * @returns 至少一个目标成功写入时为 true。
 */
func changeBrightness(_ percent: Double, targets: () -> [BrightnessTarget]) -> Bool {
  guard percent.isFinite else { return false }
  let value = min(100, max(0, percent.rounded())) / 100
  var updated = false
  for target in targets() {
    guard let current = target.read(), current.isFinite, (0...1).contains(current) else { continue }
    if target.source != "ddc-ci" { return target.write(value) }
    updated = target.write(value) || updated
  }
  return updated
}

/** 不同 Node Worker 的硬件操作需串行，防止交叉访问同一 I2C 总线。 */
private let hardwareLock = NSLock()

/**
 * 返回 UTF-8 JSON；无可读屏幕返回 JSON null。
 * @returns 调用方需通过 brightness_free 释放的字符串。
 */
@_cdecl("brightness_get")
public func brightnessGet() -> UnsafeMutablePointer<CChar>? {
  hardwareLock.lock()
  defer { hardwareLock.unlock() }
  let snapshot = queryBrightness(nativeBrightnessTargets)
  let value: Any = snapshot.map { ["currentBrightness": $0.currentBrightness, "instanceName": $0.instanceName, "source": $0.source, "levels": NSNull()] as [String: Any] } ?? NSNull()
  let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])
  return strdup(data.flatMap { String(data: $0, encoding: .utf8) } ?? "null")
}

/**
 * 设置硬件亮度。
 * @param percent - 有限百分比，自动限制在 0–100。
 * @returns 1 表示至少一个目标成功，0 表示失败。
 */
@_cdecl("brightness_set")
public func brightnessSet(_ percent: Double) -> Int32 {
  hardwareLock.lock()
  defer { hardwareLock.unlock() }
  return changeBrightness(percent, targets: nativeBrightnessTargets) ? 1 : 0
}

/**
 * 释放 Swift 分配的 JSON 字符串。
 * @param value - brightness_get 返回的指针，可为 nil。
 * @returns 无返回值。
 */
@_cdecl("brightness_free")
public func brightnessFree(_ value: UnsafeMutablePointer<CChar>?) { free(value) }
