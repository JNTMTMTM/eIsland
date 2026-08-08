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
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandVolumeAnalyzer.dll'),
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'eIslandVolumeAnalyzer.dll'),
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
    'Unable to find eIslandVolumeAnalyzer.dll. Run "npm run build" first.'
  );
}

/** 加载 DLL */
const lib = koffi.load(dllPath);

const analyzer = {
  audio_analyzer_start:       lib.func('int audio_analyzer_start(uint)'),
  audio_analyzer_start_ex:    lib.func('int audio_analyzer_start_ex(uint, int)'),
  audio_analyzer_stop:        lib.func('int audio_analyzer_stop()'),
  audio_analyzer_get_result:  lib.func('str audio_analyzer_get_result()'),
  audio_analyzer_get_status:  lib.func('str audio_analyzer_get_status()'),
  audio_analyzer_get_last_error: lib.func('str audio_analyzer_get_last_error()'),
};

/**
 * 调用返回 JSON 字符串的 DLL 函数，解析并返回对象
 * @param {string} fnName
 * @param {any[]} args
 * @returns {any|null}
 */
function callJson(fnName, ...args) {
  const str = analyzer[fnName](...args);
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
  return analyzer.audio_analyzer_get_last_error() || '';
}

module.exports = { analyzer, callJson, getLastError, dllPath };
