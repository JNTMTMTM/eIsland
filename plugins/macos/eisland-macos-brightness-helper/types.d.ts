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
 * @file types.d.ts
 * @description macOS 硬件亮度快照类型。
 * @author 鸡哥
 */
/** 字段与 Windows 亮度快照一致，source 使用 macOS 后端标识。 */
export interface BrightnessInfo {
  /** 0–100 的整数百分比。 */
  currentBrightness: number;
  /** 当前后端不报告离散亮度档位，固定为 null。 */
  levels: null;
  /** display:<CGDisplayID> 或 ioreg:<RegistryEntryID>。 */
  instanceName: string;
  /** 实际读取的硬件后端。 */
  source: 'display-services' | 'iokit' | 'ddc-ci';
}
