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
 * @file icon.by-pid.smoke.ts
 * @description 手动冒烟测试：根据 PID 获取图标
 * @author 鸡哥
 */

const { getIconByPid } = require('../');
const { execSync } = require('child_process');

console.log('=== getIconByPid Smoke Test ===\n');

// 获取 explorer.exe 的 PID
let explorerPid = 0;
try {
  const result = execSync('tasklist /FI "IMAGENAME eq explorer.exe" /FO CSV /NH', { encoding: 'utf8' });
  const match = result.match(/"(\d+)"/);
  if (match) explorerPid = parseInt(match[1]);
} catch { /* ignore */ }

// 测试 1: 有效 PID
if (explorerPid > 0) {
  console.log(`1. getIconByPid(${explorerPid}) — explorer.exe`);
  const icon1 = getIconByPid(explorerPid);
  console.log(icon1 ? `   OK: ${icon1.size} bytes (${icon1.format})` : '   FAIL: 未找到图标');
} else {
  console.log('1. SKIP: explorer.exe not found');
}

// 测试 2: Node.js 进程自身
console.log(`\n2. getIconByPid(${process.pid}) — current process`);
const icon2 = getIconByPid(process.pid);
console.log(icon2 ? `   OK: ${icon2.size} bytes (${icon2.format})` : '   FAIL: 未找到图标');

// 测试 3: 无效 PID (0)
console.log('\n3. getIconByPid(0)');
const icon3 = getIconByPid(0);
console.log(icon3 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon3.size} bytes`);

// 测试 4: 不存在的 PID
console.log('\n4. getIconByPid(99999999)');
const icon4 = getIconByPid(99999999);
console.log(icon4 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon4.size} bytes`);

console.log('\n=== Done ===');
