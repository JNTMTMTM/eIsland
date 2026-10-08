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
 * @file power.monitor.smoke.ts
 * @description 电源监听器手动冒烟测试：node --experimental-strip-types test/power.monitor.smoke.ts
 * @description 监听 8 秒内的电源事件变化
 * @author 鸡哥
 */

const { PowerMonitor } = require('../');

const DURATION = 8000;

console.log('=== Power Monitor Smoke Test ===');
console.log(`Monitoring for ${DURATION / 1000}s... Try plugging/unplugging AC power.\n`);

const monitor = new PowerMonitor();

const initial = monitor.start();
console.log('Initial state:');
console.log(`  Battery: ${initial.remainingChargePercent}% | Charging: ${initial.isCharging} | AC: ${initial.isOnAcPower} | HasBattery: ${initial.hasBattery}`);
console.log('');

monitor.on('power-changed', (info: any) => {
  console.log(`[power-changed] Battery: ${info.remainingChargePercent}% | Charging: ${info.isCharging} | AC: ${info.isOnAcPower}`);
});

monitor.on('ac-connected', (info: any) => {
  console.log(`[ac-connected] AC power connected! Battery: ${info.remainingChargePercent}%`);
});

monitor.on('ac-disconnected', (info: any) => {
  console.log(`[ac-disconnected] Running on battery. Battery: ${info.remainingChargePercent}%`);
});

monitor.on('charging', (info: any) => {
  console.log(`[charging] Started charging. Battery: ${info.remainingChargePercent}%`);
});

monitor.on('discharging', (info: any) => {
  console.log(`[discharging] Stopped charging. Battery: ${info.remainingChargePercent}%`);
});

monitor.on('battery-low', (info: any) => {
  console.log(`[battery-low] Battery low! ${info.remainingChargePercent}%`);
});

monitor.on('error', (err: Error) => {
  console.error('[error]', err);
});

setTimeout(() => {
  monitor.stop();
  console.log('\n✅ Monitor smoke test completed.');
}, DURATION);
