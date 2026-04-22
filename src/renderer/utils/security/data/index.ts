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
 * @file index.ts
 * @description 安全相关常量定义（Base32 与 TOTP 默认参数）。
 * @author 鸡哥
 */

/** Base32 字母表（RFC 4648） */
export const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** TOTP 默认位数 */
export const DEFAULT_TOTP_DIGITS = 6;

/** TOTP 默认步长（秒） */
export const DEFAULT_TOTP_PERIOD_SECONDS = 30;

/** TOTP 默认 HMAC 哈希算法 */
export const DEFAULT_TOTP_HMAC_HASH = 'SHA-1';
