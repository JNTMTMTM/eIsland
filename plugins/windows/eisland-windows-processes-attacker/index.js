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
 * @file index.js
 * @description 关闭进程插件入口，加载 Release 原生绑定并兼容 Debug 构建。
 * @author 鸡哥
 */
const path = require('node:path');

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-processes-attacker only supports Windows.');
}

const candidates = [
  path.join(__dirname, 'build', 'Release', 'eisland_windows_processes_attacker.node'),
  path.join(__dirname, 'build', 'Debug', 'eisland_windows_processes_attacker.node'),
];
let nativeBinding;
let lastError;
candidates.some((candidate) => {
  try {
    nativeBinding = require(candidate);
    return true;
  } catch (error) {
    lastError = error;
    return false;
  }
});
if (!nativeBinding) {
  throw lastError ?? new Error('Unable to load eisland_windows_processes_attacker native binding.');
}
module.exports = nativeBinding;
