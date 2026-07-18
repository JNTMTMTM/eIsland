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

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-hardware-info-helper only supports Windows.');
}

const { callJson, getLastError } = require('./ffi-loader');

/**
 * 获取 CPU 信息
 * @returns {Array<import('.').CpuInfo>}
 */
function getCpuInfo() {
  const result = callJson('hi_get_cpu_info');
  if (!result) throw new Error('Failed to get CPU info: ' + getLastError());
  return result;
}

/**
 * 获取 GPU 信息
 * @returns {Array<import('.').GpuInfo>}
 */
function getGpuInfo() {
  const result = callJson('hi_get_gpu_info');
  if (!result) throw new Error('Failed to get GPU info: ' + getLastError());
  return result;
}

/**
 * 获取内存信息
 * @returns {Array<import('.').MemorySlotInfo>}
 */
function getMemoryInfo() {
  const result = callJson('hi_get_memory_info');
  if (!result) throw new Error('Failed to get memory info: ' + getLastError());
  return result;
}

/**
 * 获取硬盘信息
 * @returns {Array<import('.').DiskInfo>}
 */
function getDiskInfo() {
  const result = callJson('hi_get_disk_info');
  if (!result) throw new Error('Failed to get disk info: ' + getLastError());
  return result;
}

/**
 * 获取网卡信息
 * @returns {Array<import('.').NetworkAdapterInfo>}
 */
function getNetworkAdapterInfo() {
  const result = callJson('hi_get_network_adapter_info');
  if (!result) throw new Error('Failed to get network adapter info: ' + getLastError());
  return result;
}

/**
 * 获取蓝牙设备信息（已配对）
 * @returns {Array<import('.').BluetoothDeviceInfo>}
 */
function getBluetoothDevices() {
  const result = callJson('hi_get_bluetooth_devices');
  if (!result) throw new Error('Failed to get Bluetooth devices: ' + getLastError());
  return result;
}

/**
 * 获取主板信息
 * @returns {Array<import('.').MotherboardInfo>}
 */
function getMotherboardInfo() {
  const result = callJson('hi_get_motherboard_info');
  if (!result) throw new Error('Failed to get motherboard info: ' + getLastError());
  return result;
}

/**
 * 获取显示器信息
 * @returns {Array<import('.').MonitorInfo>}
 */
function getMonitorInfo() {
  const result = callJson('hi_get_monitor_info');
  if (!result) throw new Error('Failed to get monitor info: ' + getLastError());
  return result;
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
