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
 * @file NativeCoreTests.swift
 * @description 通过注入硬件目标测试真实 Swift 选择逻辑与 DDC 帧，不修改屏幕亮度。
 * @author 鸡哥
 */
import Foundation

/** 独立原生断言入口，结果由 Vitest 汇总。 */
@main
struct NativeCoreTests {
  /**
   * 校验亮度目标选择、写入隔离与 DDC 损坏回复处理。
   * @returns 向标准输出写入 JSON 断言列表。
   */
  static func main() {
    var results: [[String: Any]] = []
    func check(_ name: String, _ passed: Bool) {
      results.append(["name": name, "passed": passed])
    }
    func target(_ id: String, _ source: String = "display-services", _ value: Double?, _ write: @escaping (Double) -> Bool = { _ in true }) -> BrightnessTarget {
      BrightnessTarget(id: id, source: source, read: { value }, write: write)
    }
    check("returns nil without readable displays", queryBrightness { [] } == nil)
    var ddcReads = 0
    let first = queryBrightness {
      [target("builtin", "display-services", 0.456), BrightnessTarget(id: "external", source: "ddc-ci", read: { ddcReads += 1; return 0.8 }, write: { _ in true })]
    }
    check("prefers system display without accessing DDC", first?.currentBrightness == 46 && first?.instanceName == "builtin" && first?.levels == nil && ddcReads == 0)
    let fallback = queryBrightness {
      [target("missing", "display-services", nil), target("nan", "display-services", .nan), target("range", "display-services", 2), target("ddc", "ddc-ci", 0.25)]
    }
    check("skips unavailable and invalid native readings", fallback?.source == "ddc-ci" && fallback?.currentBrightness == 25)
    var values: [Double] = []
    let native = target("builtin", "display-services", 0.5, { values.append($0); return true })
    let external = target("ddc", "ddc-ci", 0.5, { _ in values.append(-1); return true })
    check("writes only the selected system display", changeBrightness(50.6) { [native, external] } && values == [0.51])
    values = []
    _ = changeBrightness(-5) { [native] }
    _ = changeBrightness(105) { [native] }
    check("clamps finite percentages at native boundary", values == [0, 1])
    var enumerations = 0
    let invalid = changeBrightness(.nan) { enumerations += 1; return [native] }
    let infinity = changeBrightness(.infinity) { enumerations += 1; return [native] }
    check("rejects nonfinite input before enumerating hardware", !invalid && !infinity && enumerations == 0)
    values = []
    let failed = target("native", "display-services", 0.5, { _ in false })
    check("does not change unrelated screens after native write failure", !changeBrightness(60) { [failed, external] } && values.isEmpty)
    var writes: [String] = []
    let a = target("a", "ddc-ci", 0.5, { _ in writes.append("a"); return true })
    let b = target("b", "ddc-ci", 0.5, { _ in writes.append("b"); return false })
    let c = target("c", "ddc-ci", nil, { _ in writes.append("c"); return true })
    check("writes every readable DDC target despite individual failure", changeBrightness(70) { [a, b, c] } && writes == ["a", "b"])
    check("reports failure when no writable target succeeds", !changeBrightness(30) { [b, c] })
    check("encodes Get VCP 0x10 with correct checksum", brightnessDDCPacket() == [0x51, 0x82, 0x01, 0x10, 0xac])
    check("encodes both bytes of Set VCP with correct checksum", brightnessDDCPacket(0x1234) == [0x51, 0x84, 0x03, 0x10, 0x12, 0x34, 0x8e])
    func reply(_ maximum: UInt16, _ current: UInt16, result: UInt8 = 0, feature: UInt8 = 0x10) -> [UInt8] {
      var bytes: [UInt8] = [0x6e, 0x88, 0x02, result, feature, 0, UInt8(maximum >> 8), UInt8(maximum & 0xff), UInt8(current >> 8), UInt8(current & 0xff)]
      bytes.append(bytes.reduce(0x50, ^))
      return bytes
    }
    let valid = reply(1000, 500)
    let decoded = parseBrightnessDDCReply(valid)
    check("decodes a valid 16-bit DDC brightness range", decoded?.maximum == 1000 && decoded?.current == 500)
    var corrupted = valid
    corrupted[9] ^= 1
    check("rejects truncated and checksum-corrupted replies", parseBrightnessDDCReply(Array(valid.dropLast())) == nil && parseBrightnessDDCReply(corrupted) == nil)
    check("rejects unsupported status and unrelated feature replies", parseBrightnessDDCReply(reply(100, 50, result: 1)) == nil && parseBrightnessDDCReply(reply(100, 50, feature: 0x12)) == nil)
    check("rejects zero maxima and impossible current values", parseBrightnessDDCReply(reply(0, 0)) == nil && parseBrightnessDDCReply(reply(100, 101)) == nil)
    check("scales and rounds against actual monitor maximum", scaledDDCBrightness(0.501, maximum: 1000) == 501 && scaledDDCBrightness(0.5, maximum: 255) == 128 && scaledDDCBrightness(-1, maximum: 100) == 0 && scaledDDCBrightness(2, maximum: 100) == 100)
    let data = try! JSONSerialization.data(withJSONObject: results)
    print(String(data: data, encoding: .utf8)!)
  }
}
