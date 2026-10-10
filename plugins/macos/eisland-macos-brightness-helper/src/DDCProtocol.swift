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
 * @file DDCProtocol.swift
 * @description DDC/CI 亮度 VCP 0x10 请求、校验和与范围归一化。
 * @author 鸡哥
 */
import Foundation

/**
 * 生成 Get/Set VCP 亮度帧，包含源地址与 XOR 校验和。
 * @param value - nil 查询亮度；数值设置设备原始亮度。
 * @returns 发往 0x6E 地址的帧。
 */
func brightnessDDCPacket(_ value: UInt16? = nil) -> [UInt8] {
  var packet: [UInt8]
  if let value = value {
    packet = [0x51, 0x84, 0x03, 0x10, UInt8(value >> 8), UInt8(value & 0xff)]
  } else {
    packet = [0x51, 0x82, 0x01, 0x10]
  }
  packet.append(packet.reduce(0x6e, ^))
  return packet
}

/**
 * 验证完整 DDC VCP 回复，拒绝不支持、错误特征码和损坏的范围。
 * @param reply - 11 字节标准 VCP 回复。
 * @returns 当前原始值与最大值；无效回复为 nil。
 */
func parseBrightnessDDCReply(_ reply: [UInt8]) -> (current: UInt16, maximum: UInt16)? {
  guard reply.count == 11, reply[0] == 0x6e, reply[1] == 0x88,
        reply[2] == 0x02, reply[3] == 0, reply[4] == 0x10,
        reply.dropLast().reduce(UInt8(0x50), ^) == reply.last else { return nil }
  let maximum = UInt16(reply[6]) << 8 | UInt16(reply[7])
  let current = UInt16(reply[8]) << 8 | UInt16(reply[9])
  guard maximum > 0, current <= maximum else { return nil }
  return (current, maximum)
}

/**
 * 将百分比归一化值换算成显示器原始范围。
 * @param value - 0–1 的有限亮度比例。
 * @param maximum - 显示器报告的原始最大亮度。
 * @returns 适合 VCP 0x10 写入的无符号数值。
 */
func scaledDDCBrightness(_ value: Double, maximum: UInt16) -> UInt16 {
  UInt16((min(1, max(0, value)) * Double(maximum)).rounded())
}
