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
 * @file icon.by-process-name.smoke.ts
 * @description 手动冒烟测试：根据进程名获取图标
 * @author 鸡哥
 */

const { getIconByProcessName } = require('../');

console.log('=== getIconByProcessName Smoke Test ===\n');

// 测试 1: 有效进程名（explorer 始终运行）
console.log('1. getIconByProcessName("explorer")');
const icon1 = getIconByProcessName('explorer');
console.log(icon1 ? `   OK: ${icon1.size} bytes (${icon1.format})` : '   FAIL: 未找到图标');

// 测试 2: 不带 .exe 后缀
console.log('\n2. getIconByProcessName("svchost")');
const icon2 = getIconByProcessName('svchost');
console.log(icon2 ? `   OK: ${icon2.size} bytes (${icon2.format})` : '   FAIL: 未找到图标');

// 测试 3: 带 .exe 后缀
console.log('\n3. getIconByProcessName("explorer.exe")');
const icon3 = getIconByProcessName('explorer.exe');
console.log(icon3 ? `   OK: ${icon3.size} bytes (${icon3.format})` : '   FAIL: 未找到图标');

// 测试 4: 不存在的进程
console.log('\n4. getIconByProcessName("nonexistent_process_12345")');
const icon4 = getIconByProcessName('nonexistent_process_12345');
console.log(icon4 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon4.size} bytes`);

// 测试 5: 空字符串
console.log('\n5. getIconByProcessName("")');
const icon5 = getIconByProcessName('');
console.log(icon5 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon5.size} bytes`);

console.log('\n=== Done ===');
