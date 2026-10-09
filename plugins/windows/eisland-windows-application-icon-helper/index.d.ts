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

// ── 数据类型 ──────────────────────────────────────────────────

/** 图标数据结构 */
export interface IconResult {
  /** PNG 图标数据 */
  data: Buffer;
  /** 图标数据大小（字节） */
  size: number;
  /** 图像格式 */
  format: 'png';
}

// ── 图标获取函数 ──────────────────────────────────────────────

/** 根据进程名获取应用图标 */
export function getIconByProcessName(processName: string): IconResult | null;
/** 根据进程 PID 获取应用图标 */
export function getIconByPid(pid: number): IconResult | null;
/** 根据可执行文件路径获取应用图标 */
export function getIconByPath(exePath: string): IconResult | null;
/** 根据快捷方式路径获取应用图标（解析 .lnk 目标） */
export function getIconByShortcutPath(lnkPath: string): IconResult | null;
