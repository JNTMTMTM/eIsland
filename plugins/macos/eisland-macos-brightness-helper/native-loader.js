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
 * @file native-loader.js
 * @description 按架构加载亮度原生模块，支持 Electron ASAR 解包路径。
 * @author 鸡哥
 */
const { existsSync } = require('node:fs');
const { join, sep } = require('node:path');
let native;

/**
 * 延迟加载插件，确保其他平台导入类型或注册测试时不会访问 macOS 框架。
 * @returns 当前架构的 Node-API 模块。
 */
function loadNative() {
  if (process.platform !== 'darwin') throw new Error('eisland-macos-brightness-helper only supports macOS.');
  if (!['arm64', 'x64'].includes(process.arch)) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
  if (!native) {
    const binary = join(__dirname, 'prebuilds', `darwin-${process.arch}`, 'brightness.node')
      .replace(`${sep}app.asar${sep}`, `${sep}app.asar.unpacked${sep}`);
    if (!existsSync(binary)) throw new Error('macOS brightness prebuild is missing. Run npm run build in eisland-macos-brightness-helper.');
    native = require(binary);
  }
  return native;
}
module.exports = { loadNative };
