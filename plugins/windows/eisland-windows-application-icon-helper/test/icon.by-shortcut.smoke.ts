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
 * @file icon.by-shortcut.smoke.ts
 * @description 手动冒烟测试：根据快捷方式路径获取图标
 * @author 鸡哥
 */

const { getIconByShortcutPath } = require('../');
const path = require('path');
const fs = require('fs');

console.log('=== getIconByShortcutPath Smoke Test ===\n');

// 查找桌面上的快捷方式
const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
let lnkFiles: string[] = [];

try {
  lnkFiles = fs.readdirSync(desktopPath)
    .filter((f: string) => f.endsWith('.lnk'))
    .map((f: string) => path.join(desktopPath, f));
} catch { /* ignore */ }

// 测试 1: 桌面上的快捷方式
if (lnkFiles.length > 0) {
  const lnkPath = lnkFiles[0];
  console.log(`1. getIconByShortcutPath("${lnkPath}")`);
  const icon1 = getIconByShortcutPath(lnkPath);
  console.log(icon1 ? `   OK: ${icon1.size} bytes (${icon1.format})` : '   FAIL: 未找到图标');

  // 测试更多快捷方式
  for (let i = 1; i < Math.min(lnkFiles.length, 3); i++) {
    console.log(`\n${i + 1}. getIconByShortcutPath("${lnkFiles[i]}")`);
    const icon = getIconByShortcutPath(lnkFiles[i]);
    console.log(icon ? `   OK: ${icon.size} bytes (${icon.format})` : '   FAIL: 未找到图标');
  }
} else {
  console.log('1. SKIP: 桌面无快捷方式文件');
}

// 测试开始菜单快捷方式
const startMenuPath = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
let startMenuLnks: string[] = [];

try {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry: { name: string; isDirectory: () => boolean }) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return entry.name.endsWith('.lnk') ? [fullPath] : [];
    });
  startMenuLnks = walk(startMenuPath);
} catch { /* ignore */ }

if (startMenuLnks.length > 0) {
  const idx = lnkFiles.length > 0 ? 4 : 1;
  console.log(`\n${idx}. getIconByShortcutPath("${startMenuLnks[0]}") — Start Menu`);
  const icon = getIconByShortcutPath(startMenuLnks[0]);
  console.log(icon ? `   OK: ${icon.size} bytes (${icon.format})` : '   FAIL: 未找到图标');
}

// 测试无效路径
const idx = lnkFiles.length > 0 ? 5 : 2;
console.log(`\n${idx}. getIconByShortcutPath("C:\\nonexistent\\file.lnk")`);
const iconNull = getIconByShortcutPath('C:\\nonexistent\\file.lnk');
console.log(iconNull === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${iconNull.size} bytes`);

console.log(`\n${idx + 1}. getIconByShortcutPath("C:\\Windows\\notepad.exe") — 非 .lnk 文件`);
const iconNotLnk = getIconByShortcutPath('C:\\Windows\\notepad.exe');
console.log(iconNotLnk === null ? '   OK: 正确返回 null' : `   FAIL: 期望 null，实际: ${iconNotLnk.size} bytes`);

console.log('\n=== Done ===');
