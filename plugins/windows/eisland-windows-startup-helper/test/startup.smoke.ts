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
 * @file startup.smoke.ts
 * @description 启动项、计划任务、服务查询与结果输出冒烟测试。
 * @author 鸡哥
 */

import * as startup from '../index.js';

if (process.platform !== 'win32') {
  console.log('Skipping: Windows-only plugin');
  process.exit(0);
}

console.log('=== Startup Helper Smoke Test ===\n');

// 计划任务与服务在任何 Windows 系统上都必然存在，空结果视为失败；启动项允许为空
const tests: Array<{ name: string; fn: () => Promise<{ items: unknown[]; errors: unknown[] }>; requireItems: boolean }> = [
  { name: 'Startup Items',   fn: startup.getStartupItems,   requireItems: false },
  { name: 'Scheduled Tasks', fn: startup.getScheduledTasks, requireItems: true },
  { name: 'Services',        fn: startup.getServices,       requireItems: true },
];

const outcomes = await tests.reduce<Promise<boolean[]>>(async (prev, t) => {
  const done = await prev;
  console.log(`--- ${t.name} ---`);
  let ok = false;
  try {
    const { items, errors } = await t.fn();
    console.log(`  Found ${items.length} item(s), ${errors.length} location error(s)`);
    if (items.length > 0) console.log(JSON.stringify(items[0], null, 2));
    if (errors.length > 0) console.log('  First error:', JSON.stringify(errors[0]));
    ok = items.length > 0 || !t.requireItems;
    if (!ok) console.error('  FAIL: expected at least one item');
  } catch (e) {
    console.error(`  FAIL: ${e}`);
  }
  console.log();
  return [...done, ok];
}, Promise.resolve([]));

const failed = outcomes.filter((ok) => !ok).length;
console.log(failed === 0 ? '=== Smoke Test Passed ===' : `=== Smoke Test Failed (${failed}) ===`);
process.exitCode = failed === 0 ? 0 : 1;
