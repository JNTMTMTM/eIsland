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
 * @file smtc-helper.timestamp.smoke.ts
 * @description SMTC getTimestamp 轻量级时间戳接口手动冒烟测试
 * @author 鸡哥
 */

const smtc = require('../');

console.log('=== SMTC Timestamp Smoke Test ===\n');

console.log('1. getTimestamp():');
const ts = smtc.getTimestamp();
console.log(JSON.stringify(ts, null, 2));

if (ts.isAvailable && ts.timeline) {
  console.log(`\n   Position:  ${ts.timeline.position.toFixed(1)}s`);
  console.log(`   Duration:  ${(ts.timeline.endTime - ts.timeline.startTime).toFixed(1)}s`);
  console.log(`   Status:    ${ts.playbackStatus}`);
} else {
  console.log('\n   No active media session.');
}

console.log('\n2. Compare with getStatus().timeline:');
const full = smtc.getStatus();
if (full.isAvailable && full.timeline && ts.isAvailable && ts.timeline) {
  const posDiff = Math.abs(full.timeline.position - ts.timeline.position);
  console.log(`   getStatus().timeline.position:     ${full.timeline.position.toFixed(3)}s`);
  console.log(`   getTimestamp().timeline.position:  ${ts.timeline.position.toFixed(3)}s`);
  console.log(`   Difference: ${posDiff.toFixed(3)}s`);
} else {
  console.log('   Skipped — one or both returned no data');
}

console.log('\n=== Smoke Test Complete ===');
