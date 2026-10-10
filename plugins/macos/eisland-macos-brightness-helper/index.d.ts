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
 * @file index.d.ts
 * @description macOS 亮度插件公共类型，与 Windows 查询和事件签名兼容。
 * @author 鸡哥
 */
export type { BrightnessInfo } from './types';
// eslint-disable-next-line import-x/extensions -- 声明对应 CommonJS 命名导出。
export { getBrightness, setBrightness } from './brightness';
// eslint-disable-next-line import-x/extensions -- 声明对应 CommonJS 命名导出。
export { BrightnessMonitor } from './brightness-monitor';
