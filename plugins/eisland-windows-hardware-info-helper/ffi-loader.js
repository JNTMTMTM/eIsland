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
 * @description Load Native AOT DLL via koffi, define all C function signatures
 */

const path = require('node:path');
const fs = require('node:fs');
const koffi = require('koffi');

const TFM = 'net10.0-windows10.0.19041.0';

const dllCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'native', 'eIslandHardwareInfoHelper.dll'),
  path.join(__dirname, 'src', 'bin', 'Release', TFM, 'win-x64', 'eIslandHardwareInfoHelper.dll'),
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
    'Unable to find eIslandHardwareInfoHelper.dll. Run "npm run build" first.'
  );
}

const lib = koffi.load(dllPath);

const hi = {
  hi_free_string:            lib.func('void hi_free_string(void*)'),
  hi_get_last_error:         lib.func('str hi_get_last_error()'),
  hi_get_cpu_info:           lib.func('str hi_get_cpu_info()'),
  hi_get_gpu_info:           lib.func('str hi_get_gpu_info()'),
  hi_get_memory_info:        lib.func('str hi_get_memory_info()'),
  hi_get_disk_info:          lib.func('str hi_get_disk_info()'),
  hi_get_network_adapter_info: lib.func('str hi_get_network_adapter_info()'),
  hi_get_bluetooth_devices:  lib.func('str hi_get_bluetooth_devices()'),
  hi_get_motherboard_info:   lib.func('str hi_get_motherboard_info()'),
  hi_get_monitor_info:       lib.func('str hi_get_monitor_info()'),
};

function callJson(fnName) {
  const str = hi[fnName]();
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function getLastError() {
  return hi.hi_get_last_error() || '';
}

module.exports = { hi, callJson, getLastError, dllPath };
