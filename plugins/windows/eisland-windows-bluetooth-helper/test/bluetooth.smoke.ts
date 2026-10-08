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
 * @file bluetooth.smoke.ts
 * @description 蓝牙设备查询手动冒烟测试
 * @author 鸡哥
 */

const bt = require('../');

console.log('=== Bluetooth Helper Smoke Test ===\n');

console.log('1. getPairedDevices():');
const paired = bt.getPairedDevices();
console.log(`   ${paired.length} device(s)`);
console.log(JSON.stringify(paired, null, 2));

console.log('\n2. getConnectedDevices():');
const connected = bt.getConnectedDevices();
console.log(`   ${connected.length} device(s)`);
console.log(JSON.stringify(connected, null, 2));

console.log('\n3. getAllDevices():');
const all = bt.getAllDevices();
console.log(`   ${all.length} device(s)`);
console.log(JSON.stringify(all, null, 2));

console.log('\n4. getDevice(deviceId):');
if (all.length > 0) {
  const firstId = all[0].deviceId;
  console.log(`   Querying deviceId: ${firstId}`);
  const device = bt.getDevice(firstId);
  console.log(JSON.stringify(device, null, 2));
} else {
  console.log('   Skipped — no devices found');
}

console.log('\n=== Smoke Test Complete ===');
