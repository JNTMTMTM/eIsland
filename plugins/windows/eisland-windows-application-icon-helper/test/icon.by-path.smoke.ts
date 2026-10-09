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
 * @file icon.by-path.smoke.ts
 * @description 手动冒烟测试：根据可执行文件路径获取图标
 * @author 鸡哥
 */

const { getIconByPath } = require('../');
const path = require('path');

console.log('=== getIconByPath Smoke Test ===\n');

// 测试 1: Node.js 可执行文件
const nodePath = process.execPath;
console.log(`1. getIconByPath("${nodePath}")`);
const icon1 = getIconByPath(nodePath);
console.log(icon1 ? `   OK: ${icon1.size} bytes (${icon1.format})` : '   FAIL: 未找到图标');

// 测试 2: Windows 系统程序
const notepadPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'notepad.exe');
console.log(`\n2. getIconByPath("${notepadPath}")`);
const icon2 = getIconByPath(notepadPath);
console.log(icon2 ? `   OK: ${icon2.size} bytes (${icon2.format})` : '   FAIL: 未找到图标');

// 测试 3: explorer.exe
const explorerPath = path.join(process.env.SYSTEMROOT || 'C:\\Windows', 'explorer.exe');
console.log(`\n3. getIconByPath("${explorerPath}")`);
const icon3 = getIconByPath(explorerPath);
console.log(icon3 ? `   OK: ${icon3.size} bytes (${icon3.format})` : '   FAIL: 未找到图标');

// 测试 4: 不存在的路径
console.log('\n4. getIconByPath("C:\\nonexistent\\file.exe")');
const icon4 = getIconByPath('C:\\nonexistent\\file.exe');
console.log(icon4 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon4.size} bytes`);

// 测试 5: 非 exe 文件（返回文件类型关联图标）
console.log('\n5. getIconByPath("C:\\Windows\\System32\\drivers\\etc\\hosts")');
const icon5 = getIconByPath('C:\\Windows\\System32\\drivers\\etc\\hosts');
console.log(icon5 ? `   OK: ${icon5.size} bytes (${icon5.format})` : '   FAIL: 未找到图标');

// 测试 6: 空字符串
console.log('\n6. getIconByPath("")');
const icon6 = getIconByPath('');
console.log(icon6 === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${icon6.size} bytes`);

console.log('\n=== Done ===');
