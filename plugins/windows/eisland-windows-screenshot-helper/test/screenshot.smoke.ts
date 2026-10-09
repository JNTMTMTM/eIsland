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
 * @file screenshot.smoke.ts
 * @description Windows 截图助手原生模块冒烟测试
 * @author 鸡哥
 */

const fs = require('node:fs');
const path = require('node:path');

/** Target framework moniker — keep in sync with eIslandScreenshotHelper.csproj */
const TFM = 'net10.0-windows10.0.19041.0';
const dllPath = path.join(__dirname, '..', 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandScreenshotHelper.dll');
if (!fs.existsSync(dllPath)) {
  throw new Error('Native DLL not found. Run npm run build first.');
}

const { capturePrimaryDisplayPng, captureAllDisplaysPng } = require('..');

const primary = capturePrimaryDisplayPng();
if (!primary || !Buffer.isBuffer(primary.data) || primary.data.length === 0) {
  throw new Error('Failed to capture primary display PNG.');
}
console.log(`[Primary] Captured ${primary.size} bytes as ${primary.format}.`);

const allDisplays = captureAllDisplaysPng();
if (!allDisplays || !Buffer.isBuffer(allDisplays.data) || allDisplays.data.length === 0) {
  throw new Error('Failed to capture all displays PNG.');
}
console.log(`[AllDisplays] Captured ${allDisplays.size} bytes as ${allDisplays.format}.`);