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
s
/**
 * @file index.js
 * @description macOS 原生亮度插件的公共导出入口。
 * @author 鸡哥
 */
// eslint-disable-next-line import-x/extensions -- CommonJS 无扩展名导入与同名声明文件对应。
const { getBrightness, setBrightness } = require('./brightness');
// eslint-disable-next-line import-x/extensions -- CommonJS 无扩展名导入与同名声明文件对应。
const { BrightnessMonitor } = require('./brightness-monitor');
module.exports = { getBrightness, setBrightness, BrightnessMonitor };
