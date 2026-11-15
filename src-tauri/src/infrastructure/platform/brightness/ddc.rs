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

//! 供 macOS I2C 传输层使用的 VESA DDC/CI 亮度帧。

/// DDC/CI「读取 VCP 0x10（亮度）」应答帧的固定 11 字节缓冲区。
pub(super) type Reply = [u8; 11];

/// 生成亮度 VCP 帧
/// @param value - `Some` 生成设置亮度帧（显示器原始刻度）；`None` 生成读取亮度帧
/// @returns 含源地址与校验和的完整帧
pub(super) fn packet(value: Option<u16>) -> Vec<u8> {
    let mut packet = if let Some(value) = value {
        let [high, low] = value.to_be_bytes();
        vec![0x51, 0x84, 0x03, 0x10, high, low]
    } else {
        vec![0x51, 0x82, 0x01, 0x10]
    };
    packet.push(checksum(0x6e, &packet));
    packet
}

fn checksum(seed: u8, bytes: &[u8]) -> u8 {
    bytes.iter().fold(seed, |sum, byte| sum ^ byte)
}

/// 解析亮度读取应答
/// @param reply - 显示器返回的应答帧
/// @returns `(当前值, 最大值)`；帧头、VCP 代码、校验和或取值范围不合法时为 `None`
pub(super) fn range(reply: &Reply) -> Option<(u16, u16)> {
    if reply[..5] != [0x6e, 0x88, 0x02, 0, 0x10] || reply[10] != checksum(0x50, &reply[..10]) {
        return None;
    }
    let maximum = u16::from_be_bytes([reply[6], reply[7]]);
    let current = u16::from_be_bytes([reply[8], reply[9]]);
    (maximum > 0 && current <= maximum).then_some((current, maximum))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frames_preserve_vcp_code_and_checksum() {
        assert_eq!(packet(None), [0x51, 0x82, 0x01, 0x10, 0xac]);
        assert_eq!(packet(Some(300)), [0x51, 0x84, 0x03, 0x10, 1, 44, 0x85]);
    }

    #[test]
    fn rejects_wrong_vcp_replies_and_out_of_range_values() {
        let mut reply = [0x6e, 0x88, 2, 0, 0x10, 0, 1, 44, 0, 200, 0];
        reply[10] = checksum(0x50, &reply[..10]);
        assert_eq!(range(&reply), Some((200, 300)));
        reply[9] ^= 1;
        assert_eq!(range(&reply), None);
        reply[8] = 2;
        reply[10] = checksum(0x50, &reply[..10]);
        assert_eq!(range(&reply), None);
    }
}
