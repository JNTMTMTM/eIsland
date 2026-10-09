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
 * @file smoke.cjs
 * @description 打印真实亮度信息，按需验证设置恢复与监控事件。
 * @author 鸡哥
 */
const { setTimeout: wait } = require('node:timers/promises');
// eslint-disable-next-line import-x/extensions -- 按 package.json 加载 CommonJS 入口，避免解析同名类型文件。
const { getBrightness, setBrightness, BrightnessMonitor } = require('..');

/**
 * 恢复原百分比并确认实际读值。
 * @param original - 测试开始时的原生屏幕快照。
 * @returns 恢复失败时拒绝 Promise。
 */
async function restoreBrightness(original) {
  if (!setBrightness(original.currentBrightness)) throw new Error('Failed to restore original brightness.');
  await wait(1500);
  const restored = getBrightness();
  console.log('restore-result', JSON.stringify(restored));
  if (!restored || restored.instanceName !== original.instanceName || Math.abs(restored.currentBrightness - original.currentBrightness) > 1) {
    throw new Error('Restored brightness did not match the original percentage.');
  }
}

/**
 * 输出实际硬件读取结果；设置测试始终尝试恢复初始亮度。
 * @returns 测试失败时设置进程退出码。
 */
async function main() {
  const original = getBrightness();
  console.log(JSON.stringify({ platform: process.platform, arch: process.arch, napi: process.versions.napi, brightness: original }, null, 2));
  if (!original) throw new Error('No supported hardware brightness interface is available.');
  if (!process.argv.includes('--monitor') && !process.argv.includes('--verify-set')) return;
  if (process.argv.includes('--verify-set') && original.source === 'ddc-ci') {
    throw new Error('Automated restoration requires a system brightness target; DDC may control multiple displays.');
  }
  const monitor = new BrightnessMonitor();
  const events = [];
  let monitorError;
  monitor.on('brightness-changed', (level, timestamp) => {
    events.push({ level, timestamp });
    console.log('brightness-changed', JSON.stringify({ level, timestamp }));
  });
  monitor.on('error', (error) => { monitorError = error; });
  monitor.start();
  try {
    if (process.argv.includes('--verify-set')) {
      const requested = original.currentBrightness > 90 ? original.currentBrightness - 5 : original.currentBrightness + 5;
      let failure;
      try {
        if (!setBrightness(requested)) throw new Error('Native brightness write failed.');
        await wait(1500);
        const observed = getBrightness();
        console.log('set-result', JSON.stringify({ requested, observed }));
        if (!observed || observed.instanceName !== original.instanceName || Math.abs(observed.currentBrightness - requested) > 1) {
          throw new Error('Hardware brightness did not match the requested percentage.');
        }
        if (!events.some(({ level }) => Math.abs(level - requested) <= 1)) throw new Error('Monitor did not observe the hardware change.');
      } catch (error) {
        failure = error;
      } finally {
        try { await restoreBrightness(original); } catch (error) {
          failure = failure ? new AggregateError([failure, error], 'Brightness verification and restoration failed.') : error;
        }
      }
      if (failure) throw failure;
    } else {
      console.log('Monitoring for 8 seconds; change display brightness to observe events.');
      await wait(8000);
    }
    if (monitorError) throw monitorError;
  } finally {
    monitor.stop();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
