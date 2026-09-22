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
 * @file ffi-loader.js
 * @description 通过 koffi 加载 Native AOT DLL，定义所有 C 函数签名
 */

const path = require('node:path');
const fs = require('node:fs');
const koffi = require('koffi');

const TFM = 'net10.0-windows10.0.19041.0';

/** DLL 搜索路径（优先 native 自包含版本） */
const dllCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandWifiHelper.dll'),
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'eIslandWifiHelper.dll'),
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
  throw new Error(
    'Unable to find eIslandWifiHelper.dll. Run "npm run build" first.'
  );
}

/** 加载 DLL */
const lib = koffi.load(dllPath);

// 普通 str 只复制内容；必须用 DLL 的分配器配对释放 CoTaskMem。
const freeString = lib.func('void wf_free_string(void*)');
const ownedString = koffi.disposable('str', freeString);

const wf = {
  // ── 字符串释放 ──
  wf_free_string:            freeString,
  wf_get_last_error:         lib.func('wf_get_last_error', ownedString, []),

  // ── WiFi 查询 ──
  wf_get_wifi_info:          lib.func('wf_get_wifi_info', ownedString, []),

  // ── WiFi 监控 ──
  wf_start_monitoring:       lib.func('int wf_start_monitoring()'),
  wf_stop_monitoring:        lib.func('int wf_stop_monitoring()'),
  wf_wait_for_changes:       lib.func('int wf_wait_for_changes(int)'),
  wf_get_changes_count:      lib.func('int wf_get_changes_count()'),
  wf_get_monitored_wifi_info: lib.func('wf_get_monitored_wifi_info', ownedString, []),
};

/**
 * 调用返回 JSON 字符串的 DLL 函数，解析并返回对象
 * @param {string} fnName - wf 函数名
 * @param {any[]} args - 参数
 * @returns {any|null}
 */
function callJson(fnName, ...args) {
  const str = wf[fnName](...args);
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * 获取最后一次 DLL 错误信息
 * @returns {string}
 */
function getLastError() {
  return wf.wf_get_last_error() || '';
}

module.exports = { wf, callJson, getLastError, dllPath };
