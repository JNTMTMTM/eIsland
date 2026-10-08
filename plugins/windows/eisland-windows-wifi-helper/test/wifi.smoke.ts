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
 * @file wifi.smoke.ts
 * @description WiFi 信息手动冒烟测试：node --experimental-strip-types test/wifi.smoke.ts
 * @author 鸡哥
 */

const { getWifiInfo } = require('../');

console.log('=== WiFi Info Smoke Test ===\n');

const info = getWifiInfo();
if (!info) {
  console.error('getWifiInfo returned null');
  process.exit(1);
}

console.log('WiFi Info:');
console.log(`  Is Connected:    ${info.isConnected}`);
console.log(`  SSID:            ${info.ssid ?? '(none)'}`);
console.log(`  Signal Bars:     ${info.signalBars >= 0 ? info.signalBars + '/5' : 'N/A'}`);
console.log(`  Connectivity:    ${['None', 'LocalAccess', 'ConstrainedInternet', 'InternetAccess'][info.connectivityLevel]}`);
console.log(`  Adapter Name:    ${info.adapterName ?? '(none)'}`);
console.log(`  Is WiFi Adapter: ${info.isWifiAdapter}`);

if (!info.isConnected) {
  console.log('\nNot connected to any network.');
} else if (!info.isWifiAdapter) {
  console.log('\nConnected via non-WiFi adapter (e.g., Ethernet).');
} else {
  console.log(`\nConnected to WiFi: ${info.ssid} (${info.signalBars}/5 bars)`);
}

console.log('\nSmoke test passed.');
