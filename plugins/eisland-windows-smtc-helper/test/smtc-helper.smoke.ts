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
 * @file smtc-helper.smoke.ts
 * @description SMTC Helper 综合手动冒烟测试
 * @author 鸡哥
 */

const smtc = require('../');

console.log('=== SMTC Helper Smoke Test ===\n');

console.log('1. getStatus():');
const status = smtc.getStatus();
console.log(JSON.stringify(status, null, 2));

if (status.isAvailable) {
  console.log('\n   Timeline:');
  if (status.timeline) {
    console.log(`     Position: ${status.timeline.position.toFixed(1)}s / ${status.timeline.endTime.toFixed(1)}s`);
    console.log(`     Seek range: [${status.timeline.minSeekTime.toFixed(1)}s, ${status.timeline.maxSeekTime.toFixed(1)}s]`);
  }

  console.log('\n   Controls:');
  if (status.controls) {
    const enabled = Object.entries(status.controls)
      .filter(([, v]) => v)
      .map(([k]) => k);
    console.log(`     Enabled: ${enabled.join(', ') || 'none'}`);
  }

  console.log(`\n   Source: ${status.sourceAppUserModelId ?? 'N/A'}`);
  console.log(`   Thumbnail: ${status.thumbnail ? `(${status.thumbnail.length} chars data URI)` : 'N/A'}`);
}

console.log('\n2. play():');
console.log(JSON.stringify(smtc.play(), null, 2));

console.log('\n3. pause():');
console.log(JSON.stringify(smtc.pause(), null, 2));

console.log('\n4. next():');
console.log(JSON.stringify(smtc.next(), null, 2));

console.log('\n5. previous():');
console.log(JSON.stringify(smtc.previous(), null, 2));

console.log('\n=== Smoke Test Complete ===');
