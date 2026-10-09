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
 * @file icon.smoke.ts
 * @description 手动冒烟测试：验证三个图标获取函数
 * @author 鸡哥
 */

const { getIconByProcessName, getIconByPid, getIconByPath } = require('../');

console.log('=== Application Icon Helper Smoke Test ===\n');

// 测试 1: 根据进程名获取图标
console.log('1. getIconByProcessName("explorer")');
const icon1 = getIconByProcessName('explorer');
console.log(icon1 ? `   OK: ${icon1.size} bytes (${icon1.format})` : '   FAIL: 未找到图标');

// 测试 2: 根据 PID 获取图标
console.log(`\n2. getIconByPid(${process.pid}) — current process`);
const icon2 = getIconByPid(process.pid);
console.log(icon2 ? `   OK: ${icon2.size} bytes (${icon2.format})` : '   FAIL: 未找到图标');

// 测试 3: 根据路径获取图标
const exePath = process.execPath;
console.log(`\n3. getIconByPath("${exePath}")`);
const icon3 = getIconByPath(exePath);
console.log(icon3 ? `   OK: ${icon3.size} bytes (${icon3.format})` : '   FAIL: 未找到图标');

// 测试 4: 无效进程名
console.log('\n4. getIconByProcessName("nonexistent_process_12345")');
const icon4 = getIconByProcessName('nonexistent_process_12345');
console.log(icon4 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon4.size} bytes`);

// 测试 5: 无效路径
console.log('\n5. getIconByPath("C:\\nonexistent\\file.exe")');
const icon5 = getIconByPath('C:\\nonexistent\\file.exe');
console.log(icon5 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon5.size} bytes`);

console.log('\n=== Done ===');
