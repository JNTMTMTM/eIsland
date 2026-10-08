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
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandSmtcHelper.dll'),
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'eIslandSmtcHelper.dll'),
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
    'Unable to find eIslandSmtcHelper.dll. Run "npm run build" first.'
  );
}

/** 加载 DLL */
const lib = koffi.load(dllPath);

/**
 * 普通 str 只复制字符串，不释放 DLL 分配的 CoTaskMem。
 * 使用 DLL 自己的释放函数，确保每次转换后归还原始缓冲区。
 */
const freeString = lib.func('void smtc_free_string(void *)');
const ownedString = koffi.disposable('str', freeString);

const smtc = {
  // ── 原有命令 ──
  smtc_play:               lib.func('int smtc_play()'),
  smtc_pause:              lib.func('int smtc_pause()'),
  smtc_next:               lib.func('int smtc_next()'),
  smtc_previous:           lib.func('int smtc_previous()'),
  smtc_get_status:         lib.func('smtc_get_status', ownedString, []),
  smtc_get_last_error:     lib.func('smtc_get_last_error', ownedString, []),

  // ── 会话监控 ──
  smtc_start_monitoring:   lib.func('int smtc_start_monitoring()'),
  smtc_stop_monitoring:    lib.func('int smtc_stop_monitoring()'),
  smtc_wait_for_changes:   lib.func('int smtc_wait_for_changes(int)'),
  smtc_get_sessions_changed: lib.func('int smtc_get_sessions_changed()'),
  smtc_get_all_sessions:   lib.func('smtc_get_all_sessions', ownedString, []),
  smtc_get_session:        lib.func('smtc_get_session', ownedString, ['str']),
  smtc_get_timestamp:      lib.func('smtc_get_timestamp', ownedString, []),

  // ── 扩展控制 ──
  smtc_seek:               lib.func('int smtc_seek(double)'),
  smtc_stop:               lib.func('int smtc_stop()'),
  smtc_set_shuffle:        lib.func('int smtc_set_shuffle(int)'),
  smtc_set_repeat_mode:    lib.func('int smtc_set_repeat_mode(int)'),
  smtc_set_playback_rate:  lib.func('int smtc_set_playback_rate(double)'),
};

/**
 * 调用返回 JSON 字符串的 DLL 函数，解析并返回对象
 * @param {string} fnName - smtc 函数名
 * @param {any[]} args - 参数
 * @returns {any|null}
 */
function callJson(fnName, ...args) {
  const str = smtc[fnName](...args);
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
  return smtc.smtc_get_last_error() || '';
}

module.exports = { smtc, callJson, getLastError, dllPath };
