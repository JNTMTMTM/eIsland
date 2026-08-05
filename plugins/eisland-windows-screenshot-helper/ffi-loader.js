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

const sc = {
  sc_free_string: lib.func('void sc_free_string(void*)'),
  sc_get_last_error: lib.func('str sc_get_last_error()'),
  sc_capture_primary_display_png: lib.func('str sc_capture_primary_display_png()'),
  sc_capture_all_displays_png: lib.func('str sc_capture_all_displays_png()'),
  sc_get_visible_windows: lib.func('str sc_get_visible_windows()'),
};

function getLastError() {
  return sc.sc_get_last_error() || '';
}

function callPng(fnName) {
  const b64 = sc[fnName]();
  if (!b64) return null;
  const data = Buffer.from(b64, 'base64');
  return { data, size: data.length, format: 'png' };
}

function callJson(fnName) {
  const raw = sc[fnName]();
  if (!raw) return null;
  return JSON.parse(raw);
}

module.exports = { sc, callPng, callJson, getLastError, dllPath, TFM };