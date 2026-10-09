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
 * @file smtc-helper.status.smoke.ts
 * @description SMTC getStatus 手动冒烟测试
 * @author 鸡哥
 */

const smtc = require('../');

console.log('=== SMTC Status Smoke Test ===\n');

const status = smtc.getStatus();

if (!status.isAvailable) {
  console.log('No active media session.');
} else {
  console.log(`Title:      ${status.title ?? 'N/A'}`);
  console.log(`Artist:     ${status.artist ?? 'N/A'}`);
  console.log(`Album:      ${status.albumTitle ?? 'N/A'}`);
  console.log(`Album Art:  ${status.albumArtist ?? 'N/A'}`);
  console.log(`Track #:    ${status.trackNumber ?? 'N/A'}`);
  console.log(`Genres:     ${status.genres?.join(', ') ?? 'N/A'}`);
  console.log(`Status:     ${status.playbackStatus}`);
  console.log(`Rate:       ${status.playbackRate ?? 'N/A'}`);
  console.log(`Shuffle:    ${status.isShuffleActive ?? 'N/A'}`);
  console.log(`Repeat:     ${status.repeatMode ?? 'N/A'}`);
  console.log(`Source:     ${status.sourceAppUserModelId ?? 'N/A'}`);

  if (status.timeline) {
    const t = status.timeline;
    console.log(`\nTimeline:`);
    console.log(`  Position:  ${t.position.toFixed(1)}s / ${t.endTime.toFixed(1)}s`);
    console.log(`  Start:     ${t.startTime.toFixed(1)}s`);
    console.log(`  Seek:      [${t.minSeekTime.toFixed(1)}s, ${t.maxSeekTime.toFixed(1)}s]`);
  }

  if (status.controls) {
    const c = status.controls;
    console.log(`\nControls:`);
    console.log(`  Play:       ${c.isPlayEnabled}`);
    console.log(`  Pause:      ${c.isPauseEnabled}`);
    console.log(`  Next:       ${c.isNextEnabled}`);
    console.log(`  Previous:   ${c.isPreviousEnabled}`);
    console.log(`  Stop:       ${c.isStopEnabled}`);
    console.log(`  FastFwd:    ${c.isFastForwardEnabled}`);
    console.log(`  Rewind:     ${c.isRewindEnabled}`);
  }

  console.log(`\nThumbnail:  ${status.thumbnail ? `(${status.thumbnail.length} chars)` : 'N/A'}`);

  console.log('\n\n--- Full JSON ---\n');
  console.log(JSON.stringify(status, null, 2));
}

console.log('\n=== Done ===');
