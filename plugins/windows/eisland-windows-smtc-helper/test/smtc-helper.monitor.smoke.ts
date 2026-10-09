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
 * @file smtc-helper.monitor.smoke.ts
 * @description SMTC 会话监听器手动冒烟测试
 * @author 鸡哥
 */

import type * as smtcTypes from '../';

const smtc = require('../') as typeof smtcTypes;
const { SmtcMonitor } = smtc;

const DURATION_MS = 8000;

console.log('=== SMTC Monitor Smoke Test ===');
console.log(`Monitoring for ${DURATION_MS / 1000}s...\n`);

const monitor = new SmtcMonitor();

const counts = {
  added: 0,
  removed: 0,
  mediaChanged: 0,
  playbackChanged: 0,
  timelineChanged: 0,
};

monitor.on('session-added', (sourceAppId: string, media: smtcTypes.MediaProps) => {
  counts.added++;
  console.log(`[added] ${sourceAppId} — ${media?.title ?? '(no title)'}`);
});

monitor.on('session-removed', (sourceAppId: string) => {
  counts.removed++;
  console.log(`[removed] ${sourceAppId}`);
});

monitor.on('session-media-changed', (sourceAppId: string, media: smtcTypes.MediaProps) => {
  counts.mediaChanged++;
  console.log(`[media-changed] ${sourceAppId} — ${media?.title ?? '(no title)'}`);
});

monitor.on('session-playback-changed', (sourceAppId: string, playback: smtcTypes.PlaybackInfo) => {
  counts.playbackChanged++;
  const statusMap: Record<number, string> = {
    0: 'closed', 1: 'opened', 2: 'changing', 3: 'stopped', 4: 'playing', 5: 'paused',
  };
  console.log(`[playback-changed] ${sourceAppId} — ${statusMap[playback?.playbackStatus] ?? playback?.playbackStatus}`);
});

monitor.on('session-timeline-changed', (sourceAppId: string, timeline: smtcTypes.TimelineProps) => {
  counts.timelineChanged++;
  if (counts.timelineChanged <= 3 || counts.timelineChanged % 5 === 0) {
    console.log(`[timeline-changed] ${sourceAppId} — ${timeline?.position?.toFixed(1)}s (total: ${counts.timelineChanged})`);
  }
});

monitor.on('error', (err: Error) => {
  console.error('[error]', err);
});

monitor.start();

setTimeout(() => {
  const sessions = monitor.getMediaSessions();
  console.log(`\n--- Final Snapshot (${sessions.length} session${sessions.length !== 1 ? 's' : ''}) ---`);
  for (const s of sessions) {
    console.log(`  ${s.sourceAppId}:`);
    console.log(`    title:    ${s.media?.title ?? '(none)'}`);
    console.log(`    artist:   ${s.media?.artist ?? '(none)'}`);
    console.log(`    status:   ${s.playback?.playbackStatus}`);
    console.log(`    position: ${s.timeline?.position?.toFixed(1)}s`);
  }

  console.log(`\n--- Event Counts ---`);
  console.log(`  session-added:           ${counts.added}`);
  console.log(`  session-removed:         ${counts.removed}`);
  console.log(`  session-media-changed:   ${counts.mediaChanged}`);
  console.log(`  session-playback-changed: ${counts.playbackChanged}`);
  console.log(`  session-timeline-changed: ${counts.timelineChanged}`);

  monitor.stop();
  console.log('\n=== Smoke Test Complete ===');
}, DURATION_MS);
