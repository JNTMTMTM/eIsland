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
 * @file toolsUtils.ts
 * @description Expanded 系统工具 Tab 的拖入文件校验与名称推导。
 * @author 鸡哥
 */

const LAUNCHABLE_EXTENSION = /\.(exe|lnk)$/i;

/**
 * 判断拖入路径是否为可启动的 .exe 或 .lnk 文件。
 * @param filePath - 文件路径
 * @returns 是否可作为快捷启动项
 */
export function isLaunchablePath(filePath: string): boolean {
  return LAUNCHABLE_EXTENSION.test(filePath);
}

/**
 * 从 Windows 路径推导去掉扩展名的应用名称。
 * @param filePath - 文件路径
 * @returns 应用名称，无法推导时为空串
 */
export function getAppNameFromPath(filePath: string): string {
  return filePath.split('\\').pop()?.replace(LAUNCHABLE_EXTENSION, '') || '';
}
