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
 * @file brightness.monitor.smoke.ts
 * @description 屏幕亮度监控器手动冒烟测试
 * @author 鸡哥
 */

import type * as brightTypes from '../';

const bright = require('../') as typeof brightTypes;
const { BrightnessMonitor } = bright;

const DURATION_MS = 15000;

console.log('=== Brightness Monitor Smoke Test ===');
console.log(`Monitoring for ${DURATION_MS / 1000}s...`);
console.log('Try adjusting screen brightness during the test...\n');

const monitor = new BrightnessMonitor();

let changeCount = 0;
let lastBrightness = -1;

monitor.on('brightness-changed', (brightness: number, timestamp: number) => {
  changeCount++;
  const prev = lastBrightness;
  lastBrightness = brightness;
  const ts = new Date(timestamp).toLocaleTimeString();
  if (prev >= 0) {
    console.log(`[${ts}] ${prev}% → ${brightness}% (total: ${changeCount})`);
  } else {
    console.log(`[${ts}] ${brightness}% (first event, total: ${changeCount})`);
  }
});

monitor.on('error', (err: Error) => {
  console.error('[error]', err);
});

monitor.start();
console.log(`Monitor running: ${monitor.isRunning()}`);

setTimeout(() => {
  console.log(`\n--- Final State ---`);
  console.log(`  isRunning:       ${monitor.isRunning()}`);
  console.log(`  lastBrightness:  ${lastBrightness >= 0 ? lastBrightness + '%' : 'N/A'}`);
  console.log(`  changeCount:     ${changeCount}`);

  monitor.stop();
  console.log(`\nMonitor stopped: ${!monitor.isRunning()}`);
  console.log('\n=== Smoke Test Complete ===');
}, DURATION_MS);
