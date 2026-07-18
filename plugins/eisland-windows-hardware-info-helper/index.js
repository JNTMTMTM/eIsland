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

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const helperCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', 'eIslandHardwareInfoReader.exe'),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', 'eIslandHardwareInfoReader.exe'),
];

/**
 * Find helper EXE path
 * @returns {string | null}
 */
function findHelper() {
  return helperCandidates.find((c) => fs.existsSync(c)) ?? null;
}

/**
 * Synchronously call helper EXE
 * @param {string[]} args
 * @param {number} timeout
 * @returns {any | null}
 */
function callHelper(args, timeout = 10000) {
  const helperPath = findHelper();
  if (!helperPath) return null;

  const result = spawnSync(helperPath, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
  });

  if (result.status !== 0 || result.error || !result.stdout) return null;

  try {
    const parsed = JSON.parse(result.stdout.trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Get CPU information
 * @returns {Array<import('.').CpuInfo>}
 */
function getCpuInfo() {
  return callHelper(['cpu']) ?? [];
}

/**
 * Get GPU information
 * @returns {Array<import('.').GpuInfo>}
 */
function getGpuInfo() {
  return callHelper(['gpu']) ?? [];
}

/**
 * Get memory slot information
 * @returns {Array<import('.').MemorySlotInfo>}
 */
function getMemoryInfo() {
  return callHelper(['memory']) ?? [];
}

/**
 * Get disk information
 * @returns {Array<import('.').DiskInfo>}
 */
function getDiskInfo() {
  return callHelper(['disk']) ?? [];
}

/**
 * Get network adapter information
 * @returns {Array<import('.').NetworkAdapterInfo>}
 */
function getNetworkAdapterInfo() {
  return callHelper(['network']) ?? [];
}

/**
 * Get Bluetooth device information (paired devices via WMI)
 * @returns {Array<import('.').BluetoothDeviceInfo>}
 */
function getBluetoothDevices() {
  return callHelper(['bluetooth']) ?? [];
}

/**
 * Get motherboard information
 * @returns {Array<import('.').MotherboardInfo>}
 */
function getMotherboardInfo() {
  return callHelper(['motherboard']) ?? [];
}

/**
 * Get monitor information
 * @returns {Array<import('.').MonitorInfo>}
 */
function getMonitorInfo() {
  return callHelper(['monitor']) ?? [];
}

module.exports = {
  getCpuInfo,
  getGpuInfo,
  getMemoryInfo,
  getDiskInfo,
  getNetworkAdapterInfo,
  getBluetoothDevices,
  getMotherboardInfo,
  getMonitorInfo,
};
