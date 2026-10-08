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

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-application-icon-helper only supports Windows.');
}

const { callIcon } = require('./ffi-loader');

/**
 * 根据进程名获取应用图标
 * @param {string} processName - 进程名（如 "notepad"、"chrome"）
 * @returns {{ data: Buffer, size: number, format: 'png' }|null} 图标结果对象，未找到时返回 null
 */
function getIconByProcessName(processName) {
  return callIcon('icon_get_by_process_name', processName);
}

/**
 * 根据进程 PID 获取应用图标
 * @param {number} pid - 进程 ID
 * @returns {{ data: Buffer, size: number, format: 'png' }|null} 图标结果对象，未找到时返回 null
 */
function getIconByPid(pid) {
  return callIcon('icon_get_by_pid', pid);
}

/**
 * 根据可执行文件路径获取应用图标
 * @param {string} exePath - 可执行文件完整路径
 * @returns {{ data: Buffer, size: number, format: 'png' }|null} 图标结果对象，未找到时返回 null
 */
function getIconByPath(exePath) {
  return callIcon('icon_get_by_path', exePath);
}

/**
 * 根据快捷方式路径获取应用图标（解析 .lnk 目标）
 * @param {string} lnkPath - 快捷方式文件完整路径
 * @returns {{ data: Buffer, size: number, format: 'png' }|null} 图标结果对象，未找到时返回 null
 */
function getIconByShortcutPath(lnkPath) {
  return callIcon('icon_get_by_shortcut', lnkPath);
}

module.exports = {
  getIconByProcessName,
  getIconByPid,
  getIconByPath,
  getIconByShortcutPath,
};
