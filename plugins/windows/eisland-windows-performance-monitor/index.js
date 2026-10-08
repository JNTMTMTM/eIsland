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
 * @description Windows 性能采集插件入口
 * @description 加载原生绑定模块并导出 CPU、内存与温度采集 API
 * @author 鸡哥
 */

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-performance-monitor only supports Windows.');
}

const candidates = [
  path.join(__dirname, 'build', 'Release', 'windows_performance_monitor.node'),
  path.join(__dirname, 'build', 'Debug', 'windows_performance_monitor.node'),
];

const temperatureReaderCandidates = [
  path.join(__dirname, 'temperature-helper', 'bin', 'Release', 'net10.0', 'eIslandTemperatureReader.exe'),
  path.join(__dirname, 'temperature-helper', 'bin', 'Debug', 'net10.0', 'eIslandTemperatureReader.exe'),
];

const emptyTemperatureSnapshot = Object.freeze({
  isAvailable: false,
  readings: [],
  maxTemperatureCelsius: null,
});

const emptyHardwareListSnapshot = Object.freeze({
  isAvailable: false,
  cpus: [],
  gpus: [],
});

let nativeBinding;
let lastError;

for (const candidate of candidates) {
  try {
    nativeBinding = require(candidate);
    break;
  } catch (error) {
    lastError = error;
  }
}

if (!nativeBinding) {
  throw lastError ?? new Error('Unable to load windows_performance_monitor native binding.');
}

function findTemperatureReader() {
  return temperatureReaderCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function readHelperSnapshot(args, fallback) {
  const readerPath = findTemperatureReader();

  if (!readerPath) {
    return fallback;
  }

  const result = spawnSync(readerPath, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
  });

  if (result.status !== 0 || result.error || !result.stdout) {
    return fallback;
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return fallback;
  }
}

function getTemperature() {
  const snapshot = readHelperSnapshot([], emptyTemperatureSnapshot);
  const readings = Array.isArray(snapshot.readings) ? snapshot.readings : [];

  return {
    isAvailable: snapshot.isAvailable === true && readings.length > 0,
    readings,
    maxTemperatureCelsius: typeof snapshot.maxTemperatureCelsius === 'number' ? snapshot.maxTemperatureCelsius : null,
  };
}

function getHardwareList() {
  const snapshot = readHelperSnapshot(['hardware-list'], emptyHardwareListSnapshot);
  const cpus = Array.isArray(snapshot.cpus) ? snapshot.cpus : [];
  const gpus = Array.isArray(snapshot.gpus) ? snapshot.gpus : [];

  return {
    isAvailable: snapshot.isAvailable === true && (cpus.length > 0 || gpus.length > 0),
    cpus,
    gpus,
  };
}

nativeBinding.getTemperature = getTemperature;
nativeBinding.getHardwareList = getHardwareList;

module.exports = nativeBinding;