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
 * @file wifi.monitor.smoke.ts
 * @description WiFi 监听器手动冒烟测试：node --experimental-strip-types test/wifi.monitor.smoke.ts
 * @description 监听 8 秒内的 WiFi 事件变化
 * @author 鸡哥
 */

const { WifiMonitor } = require('../');

const DURATION = 8000;

console.log('=== WiFi Monitor Smoke Test ===');
console.log(`Monitoring for ${DURATION / 1000}s... Try connecting/disconnecting WiFi.\n`);

const monitor = new WifiMonitor();

const initial = monitor.start();
console.log('Initial state:');
console.log(`  Connected: ${initial.isConnected} | SSID: ${initial.ssid ?? '(none)'} | Signal: ${initial.signalBars}/5 | WiFi: ${initial.isWifiAdapter}`);
console.log('');

monitor.on('wifi-changed', (info: any) => {
  console.log(`[wifi-changed] Connected: ${info.isConnected} | SSID: ${info.ssid ?? '(none)'} | Signal: ${info.signalBars}/5`);
});

monitor.on('wifi-connected', (info: any) => {
  console.log(`[wifi-connected] Connected to ${info.ssid} (${info.signalBars}/5 bars)`);
});

monitor.on('wifi-disconnected', (info: any) => {
  console.log(`[wifi-disconnected] Disconnected from WiFi`);
});

monitor.on('ssid-changed', (info: any) => {
  console.log(`[ssid-changed] Switched to ${info.ssid}`);
});

monitor.on('signal-changed', (info: any) => {
  console.log(`[signal-changed] Signal: ${info.signalBars}/5 bars`);
});

monitor.on('error', (err: Error) => {
  console.error('[error]', err);
});

setTimeout(() => {
  monitor.stop();
  console.log('\nMonitor smoke test completed.');
}, DURATION);
