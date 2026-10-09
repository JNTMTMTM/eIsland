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
  throw new Error('@eisland/windows-bluetooth-helper only supports Windows.');
}

const { callJson } = require('./ffi-loader');
const { BluetoothMonitor } = require('./bluetooth-monitor');

/**
 * 获取所有已配对的蓝牙设备
 * @returns {Array<import('.').BluetoothDeviceInfo>}
 */
function getPairedDevices() {
  const devices = callJson('bt_get_paired_devices');
  return Array.isArray(devices) ? devices : [];
}

/**
 * 获取所有已连接的蓝牙设备
 * @returns {Array<import('.').BluetoothDeviceInfo>}
 */
function getConnectedDevices() {
  const devices = callJson('bt_get_connected_devices');
  return Array.isArray(devices) ? devices : [];
}

/**
 * 获取所有可见蓝牙设备（已配对 + 附近 BLE 广播）
 * @returns {Array<import('.').BluetoothDeviceInfo>}
 */
function getAllDevices() {
  const devices = callJson('bt_get_all_devices');
  return Array.isArray(devices) ? devices : [];
}

/**
 * 获取单个设备快照
 * @param {string} deviceId - Windows DeviceInformation ID
 * @returns {import('.').BluetoothDeviceInfo | null}
 */
function getDevice(deviceId) {
  return callJson('bt_get_device', deviceId);
}

module.exports = {
  getPairedDevices,
  getConnectedDevices,
  getAllDevices,
  getDevice,
  BluetoothMonitor,
};
