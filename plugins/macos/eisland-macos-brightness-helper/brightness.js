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
 * @file brightness.js
 * @description 与 Windows 相同的同步亮度查询、百分比归一化和设置接口。
 * @author 鸡哥
 */
const { loadNative } = require('./native-loader');

/**
 * 查询优先受支持屏幕的硬件亮度。
 * @returns 0–100 百分比快照；无可读屏幕时为 null。
 */
function getBrightness() {
  return JSON.parse(loadNative().getJson());
}

/**
 * 设置原生屏幕或 DDC 回退屏幕的亮度。
 * @param brightness - 有限百分比，四舍五入并限制在 0–100。
 * @returns 至少一个目标成功写入时为 true。
 */
function setBrightness(brightness) {
  if (!Number.isFinite(brightness)) throw new RangeError('Brightness must be a finite number.');
  return loadNative().setBrightness(Math.max(0, Math.min(100, Math.round(brightness))));
}
module.exports = { getBrightness, setBrightness };
