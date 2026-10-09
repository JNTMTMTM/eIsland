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
 * @file power.smoke.ts
 * @description 电源信息手动冒烟测试：node --experimental-strip-types test/power.smoke.ts
 * @author 鸡哥
 */

const { getPowerInfo } = require('../');

console.log('=== Power Info Smoke Test ===\n');

const info = getPowerInfo();
if (!info) {
  console.error('getPowerInfo returned null');
  process.exit(1);
}

console.log('Power Info:');
console.log(`  Remaining Charge: ${info.remainingChargePercent}%`);
console.log(`  Battery Status:   ${info.batteryStatus} (${['NotPresent', 'Discharging', 'Idle', 'Charging'][info.batteryStatus]})`);
console.log(`  Power Supply:     ${info.powerSupplyStatus} (${['NotPresent', 'Adequate', 'Inadequate', 'Unknown'][info.powerSupplyStatus]})`);
console.log(`  Energy Saver:     ${info.energySaverStatus} (${['Disabled', 'Off', 'On'][info.energySaverStatus]})`);
console.log(`  Has Battery:      ${info.hasBattery}`);
console.log(`  Is Charging:      ${info.isCharging}`);
console.log(`  Is On AC Power:   ${info.isOnAcPower}`);

if (!info.hasBattery) {
  console.log('\nThis appears to be a desktop (no battery detected).');
} else {
  console.log(`\nBattery: ${info.remainingChargePercent}% ${info.isCharging ? 'Charging' : 'On Battery'}`);
}

console.log('\n✅ Smoke test passed.');
