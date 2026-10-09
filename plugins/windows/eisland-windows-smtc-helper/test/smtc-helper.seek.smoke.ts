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
 * @file smtc-helper.seek.smoke.ts
 * @description SMTC seek 及其他控制命令手动冒烟测试
 * @author 鸡哥
 */

import type { play, pause, next, previous, seek, stop, setShuffle, setRepeatMode, setPlaybackRate, getStatus } from '../';

const smtc = require('../') as {
  play: typeof play;
  pause: typeof pause;
  next: typeof next;
  previous: typeof previous;
  seek: typeof seek;
  stop: typeof stop;
  setShuffle: typeof setShuffle;
  setRepeatMode: typeof setRepeatMode;
  setPlaybackRate: typeof setPlaybackRate;
  getStatus: typeof getStatus;
};

console.log('=== SMTC Seek Smoke Test ===\n');

console.log('1. getStatus():');
const status = smtc.getStatus();
if (!status.isAvailable) {
  console.log('   No media session available. Skipping seek test.');
  process.exit(0);
}
console.log(`   Title: ${status.title}`);
console.log(`   Position: ${status.timeline?.position?.toFixed(1)}s / ${status.timeline?.endTime?.toFixed(1)}s`);

console.log('\n2. seek(10):');
console.log(JSON.stringify(smtc.seek(10), null, 2));

console.log('\n3. seek(30.5):');
console.log(JSON.stringify(smtc.seek(30.5), null, 2));

console.log('\n4. seek(0):');
console.log(JSON.stringify(smtc.seek(0), null, 2));

console.log('\n5. stop():');
console.log(JSON.stringify(smtc.stop(), null, 2));

console.log('\n6. setShuffle(true):');
console.log(JSON.stringify(smtc.setShuffle(true), null, 2));

console.log('\n7. setRepeatMode(1):');
console.log(JSON.stringify(smtc.setRepeatMode(1), null, 2));

console.log('\n8. setPlaybackRate(1.5):');
console.log(JSON.stringify(smtc.setPlaybackRate(1.5), null, 2));

console.log('\n9. setPlaybackRate(1.0):');
console.log(JSON.stringify(smtc.setPlaybackRate(1.0), null, 2));

console.log('\n10. setRepeatMode(0):');
console.log(JSON.stringify(smtc.setRepeatMode(0), null, 2));

console.log('\n11. setShuffle(false):');
console.log(JSON.stringify(smtc.setShuffle(false), null, 2));

console.log('\n=== Smoke Test Complete ===');
