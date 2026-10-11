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

const path = require('node:path');
const fs = require('node:fs');
const koffi = require('koffi');

/** Target framework moniker — keep in sync with eIslandScreenshotHelper.csproj */
const TFM = 'net10.0-windows10.0.19041.0';

const dllCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandScreenshotHelper.dll'),
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'eIslandScreenshotHelper.dll'),
];

function toUnpackedDllPath(candidate) {
  return candidate.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
}

let dllPath;
for (const candidate of dllCandidates) {
  const loadableCandidate = toUnpackedDllPath(candidate);
  try {
    fs.accessSync(loadableCandidate);
    dllPath = loadableCandidate;
    break;
  } catch { /* try next */ }
}

if (!dllPath) {
  throw new Error('Unable to find eIslandScreenshotHelper.dll. Run "npm run build" first.');
}

const lib = koffi.load(dllPath);

// 普通 str 只复制内容；必须用 DLL 的分配器配对释放 CoTaskMem。
const freeString = lib.func('void sc_free_string(void*)');
const ownedString = koffi.disposable('str', freeString);

const sc = {
  sc_free_string: freeString,
  sc_get_last_error: lib.func('sc_get_last_error', ownedString, []),
  sc_capture_primary_display_png: lib.func('sc_capture_primary_display_png', ownedString, []),
  sc_capture_all_displays_png: lib.func('sc_capture_all_displays_png', ownedString, []),
  sc_get_visible_windows: lib.func('sc_get_visible_windows', ownedString, []),
};

// 老 DLL 可继续使用原有字符串导出；正常发布的新 DLL 全程使用二进制接口。
for (const name of ['sc_capture_primary_display_png', 'sc_capture_all_displays_png']) {
  try { sc[`${name}_bytes`] = lib.func(`void* ${name}_bytes(_Out_ int* size)`); }
  catch { /* 允许现有用户尚未重建的旧 DLL 回退。 */ }
}

function getLastError() {
  return sc.sc_get_last_error() || '';
}

function callPng(fnName) {
  if (typeof sc[`${fnName}_bytes`] !== 'function') {
    const base64 = sc[fnName]();
    if (!base64 || base64.length > Math.ceil(64 * 1024 * 1024 / 3) * 4) return null;
    const data = Buffer.from(base64, 'base64');
    return data.length ? { data, size: data.length, format: 'png' } : null;
  }
  const size = [0];
  const ptr = sc[`${fnName}_bytes`](size);
  if (!ptr) return null;
  try {
    if (!Number.isInteger(size[0]) || size[0] <= 0 || size[0] > 64 * 1024 * 1024) return null;
    // 只复制一次 native PNG；必须在释放 CoTaskMem 前取得 JS 拥有的字节。
    const data = Buffer.from(new Uint8Array(koffi.view(ptr, size[0])));
    return { data, size: data.length, format: 'png' };
  } finally { freeString(ptr); }
}

function callJson(fnName) {
  const raw = sc[fnName]();
  if (!raw) return null;
  return JSON.parse(raw);
}

module.exports = { sc, callPng, callJson, getLastError, dllPath, TFM };