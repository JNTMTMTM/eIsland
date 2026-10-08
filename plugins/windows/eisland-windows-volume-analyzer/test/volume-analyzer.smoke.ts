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
 * @file volume-analyzer.smoke.ts
 * @description Volume Analyzer 综合手动冒烟测试
 * @usage node --experimental-strip-types test/volume-analyzer.smoke.ts [pid]
 * @author 鸡哥
 */

const analyzer = require('../');

console.log('=== Volume Analyzer Smoke Test ===\n');

// ── 0. 获取正在播放音频的进程 ─────────────────────────────────
console.log('0. getPlayingProcesses():');
const playing = analyzer.getPlayingProcesses();
console.log(JSON.stringify(playing, null, 2));
if (playing.length > 0) {
  console.log(`   Found ${playing.length} audio process(es):`);
  for (const p of playing) {
    console.log(`     [${p.processId}] ${p.processName ?? 'unknown'} (${p.state})`);
  }
} else {
  console.log('   No active audio processes found.');
}

// ── 1. 初始状态 ──────────────────────────────────────────────
console.log('\n1. getStatus():');
const status0 = analyzer.getStatus();
console.log(JSON.stringify(status0, null, 2));
console.assert(!status0.isRunning, 'Should not be running initially');

// ── 2. 获取初始结果（未启动时应返回空结果） ──────────────────
console.log('\n2. getResult() [before start]:');
const result0 = analyzer.getResult();
console.log(JSON.stringify(result0, null, 2));
console.assert(Array.isArray(result0.frequency.spectrum), 'spectrum should be array');
console.assert(typeof result0.amplitude.rms === 'number', 'rms should be number');
console.assert(typeof result0.beat.isBeat === 'boolean', 'isBeat should be boolean');

// ── 3. 启动分析 ─────────────────────────────────────────────
const pid = process.argv[2] ? parseInt(process.argv[2], 10) : process.pid;
console.log(`\n3. start(${pid}):`);
const startResult = analyzer.start(pid);
console.log(JSON.stringify(startResult, null, 2));

if (!startResult.success) {
  console.log('\n[SKIP] Start failed — this may be expected if the target process has no audio.');
  console.log('       Try running with a PID of an audio-playing process:');
  console.log('       node --experimental-strip-types test/volume-analyzer.smoke.ts <pid>');
  console.log('\n=== Done ===');
  process.exit(0);
}

// ── 4. 等待一小段时间让捕获启动 ─────────────────────────────
console.log('\n4. Waiting 500ms for capture to initialize...');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);

// ── 5. 检查状态 ─────────────────────────────────────────────
console.log('\n5. getStatus() [after start]:');
const status1 = analyzer.getStatus();
console.log(JSON.stringify(status1, null, 2));
console.assert(status1.isRunning, 'Should be running after start');

// ── 6. 获取分析结果 ─────────────────────────────────────────
console.log('\n6. getResult() [after start]:');
const result1 = analyzer.getResult();
console.log(JSON.stringify(result1, null, 2));

console.log(`   Spectrum bins:  ${result1.frequency.spectrum.length}`);
console.log(`   Dominant Hz:    ${result1.frequency.dominantHz.toFixed(1)}`);
console.log(`   Top frequencies:`);
for (const f of result1.frequency.topFrequencies.slice(0, 5)) {
  console.log(`     ${f.hz.toFixed(1)} Hz (magnitude: ${f.magnitude.toFixed(6)})`);
}
console.log(`   RMS:            ${result1.amplitude.rms.toFixed(6)}`);
console.log(`   Peak:           ${result1.amplitude.peak.toFixed(6)}`);
console.log(`   Beat:           ${result1.beat.isBeat}`);
console.log(`   BPM:            ${result1.beat.bpm.toFixed(1)}`);
console.log(`   Beat Intensity: ${result1.beat.intensity.toFixed(3)}`);

// ── 7. 轮询模式测试 ─────────────────────────────────────────
console.log('\n7. startPolling(100) — polling 5 frames:');
let pollCount = 0;
analyzer.startPolling(100, (result: any) => {
  pollCount++;
  const rms = result.amplitude.rms.toFixed(4);
  const dom = result.frequency.dominantHz.toFixed(0);
  const beat = result.beat.isBeat ? ' ** BEAT **' : '';
  console.log(`   [${pollCount}] RMS=${rms}  DomHz=${dom}  BPM=${result.beat.bpm.toFixed(0)}${beat}`);

  if (pollCount >= 5) {
    analyzer.stopPolling();
    console.log('   Polling stopped.');

    // ── 8. 停止分析 ───────────────────────────────────────
    console.log('\n8. stop():');
    const stopResult = analyzer.stop();
    console.log(JSON.stringify(stopResult, null, 2));

    // ── 9. 最终状态 ───────────────────────────────────────
    console.log('\n9. getStatus() [after stop]:');
    const status2 = analyzer.getStatus();
    console.log(JSON.stringify(status2, null, 2));
    console.assert(!status2.isRunning, 'Should not be running after stop');

    console.log('\n=== Smoke Test Complete ===');
  }
});
