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

if (process.platform !== 'win32') {
  console.log('Skipping: Windows-only plugin');
  process.exit(0);
}

const startup = require('../');

console.log('=== Startup Helper Smoke Test ===\n');

const tests: Array<{ name: string; fn: () => unknown[] }> = [
  { name: 'Startup Items',   fn: startup.getStartupItems },
  { name: 'Scheduled Tasks', fn: startup.getScheduledTasks },
  { name: 'Services',        fn: startup.getServices },
];

for (const t of tests) {
  console.log(`--- ${t.name} ---`);
  try {
    const result = t.fn();
    if (Array.isArray(result) && result.length > 0) {
      console.log(`  Found ${result.length} item(s)`);
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('  No data returned');
    }
  } catch (e) {
    console.error(`  Error: ${e}`);
  }
  console.log();
}

console.log('=== Smoke Test Complete ===');
