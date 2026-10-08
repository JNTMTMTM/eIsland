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
 * @file smtc-helper.next.smoke.ts
 * @description SMTC next 命令手动冒烟测试
 * @author 鸡哥
 */

const smtc = require('../');

console.log('=== SMTC Next Smoke Test ===\n');

console.log('1. getStatus() before next:');
const before = smtc.getStatus();
console.log(`   Status: ${before.playbackStatus}`);
console.log(`   Track: ${before.title ?? 'N/A'} - ${before.artist ?? 'N/A'}`);
if (before.timeline) console.log(`   Position: ${before.timeline.position.toFixed(1)}s`);

console.log('\n2. next():');
console.log(JSON.stringify(smtc.next(), null, 2));

console.log('\n3. getStatus() after next:');
const after = smtc.getStatus();
console.log(`   Status: ${after.playbackStatus}`);
console.log(`   Track: ${after.title ?? 'N/A'} - ${after.artist ?? 'N/A'}`);
if (after.timeline) console.log(`   Position: ${after.timeline.position.toFixed(1)}s`);

console.log('\n=== Done ===');
