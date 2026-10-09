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
 * @file bluetooth.monitor.smoke.ts
 * @description 蓝牙设备监听器手动冒烟测试
 * @author 鸡哥
 */

import type * as btTypes from '../';

const bt = require('../') as typeof btTypes;
const { BluetoothMonitor } = bt;

const DURATION_MS = 8000;

console.log('=== Bluetooth Monitor Smoke Test ===');
console.log(`Monitoring for ${DURATION_MS / 1000}s...\n`);

const monitor = new BluetoothMonitor();

const counts = {
  added: 0,
  removed: 0,
  connected: 0,
  disconnected: 0,
  updated: 0,
};

monitor.on('device-added', (device: btTypes.BluetoothDeviceInfo) => {
  counts.added++;
  console.log(`[added] ${device.name ?? device.deviceId} (${device.bluetoothAddress ?? 'no addr'})`);
});

monitor.on('device-removed', (deviceId: string) => {
  counts.removed++;
  console.log(`[removed] ${deviceId}`);
});

monitor.on('device-connected', (device: btTypes.BluetoothDeviceInfo) => {
  counts.connected++;
  console.log(`[connected] ${device.name ?? device.deviceId}`);
});

monitor.on('device-disconnected', (deviceId: string) => {
  counts.disconnected++;
  console.log(`[disconnected] ${deviceId}`);
});

monitor.on('device-updated', (device: btTypes.BluetoothDeviceInfo) => {
  counts.updated++;
  if (counts.updated <= 3 || counts.updated % 5 === 0) {
    console.log(`[updated] ${device.name ?? device.deviceId} — RSSI: ${device.signalStrength ?? 'N/A'} (total: ${counts.updated})`);
  }
});

monitor.on('error', (err: Error) => {
  console.error('[error]', err);
});

monitor.start();

setTimeout(() => {
  const devices = monitor.getDevices();
  console.log(`\n--- Final Snapshot (${devices.length} device${devices.length !== 1 ? 's' : ''}) ---`);
  for (const d of devices) {
    console.log(`  ${d.name ?? '(unnamed)'}:`);
    console.log(`    id:        ${d.deviceId}`);
    console.log(`    address:   ${d.bluetoothAddress ?? 'N/A'}`);
    console.log(`    connected: ${d.isConnected}`);
    console.log(`    paired:    ${d.isPaired}`);
    console.log(`    rssi:      ${d.signalStrength ?? 'N/A'} dBm`);
    console.log(`    type:      ${d.deviceType ?? 'N/A'}`);
    console.log(`    battery:   ${d.batteryLevel !== null ? d.batteryLevel + '%' : 'N/A'}`);
    console.log(`    services:  ${d.serviceUuids.length > 0 ? d.serviceUuids.join(', ') : 'none'}`);
  }

  console.log(`\n--- Event Counts ---`);
  console.log(`  device-added:        ${counts.added}`);
  console.log(`  device-removed:      ${counts.removed}`);
  console.log(`  device-connected:    ${counts.connected}`);
  console.log(`  device-disconnected: ${counts.disconnected}`);
  console.log(`  device-updated:      ${counts.updated}`);

  monitor.stop();
  console.log('\n=== Smoke Test Complete ===');
}, DURATION_MS);
