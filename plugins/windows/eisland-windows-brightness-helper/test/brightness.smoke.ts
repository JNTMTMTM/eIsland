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
 * @file brightness.smoke.ts
 * @description 屏幕亮度查询/设置手动冒烟测试
 * @author 鸡哥
 */

const bright = require('../');

console.log('=== Brightness Helper Smoke Test ===\n');

console.log('1. getBrightness():');
const info = bright.getBrightness();
if (info) {
  console.log(`   currentBrightness: ${info.currentBrightness}%`);
  console.log(`   levels: ${info.levels ? `[${info.levels.join(', ')}]` : 'N/A'}`);
  console.log(`   instanceName: ${info.instanceName ?? 'N/A'}`);
  console.log(JSON.stringify(info, null, 2));
} else {
  console.log('   No brightness data returned (WMI not available?)');
}

console.log('\n2. setBrightness(75):');
const setResult = bright.setBrightness(75);
console.log(`   result: ${setResult}`);

console.log('\n3. getBrightness() after set:');
const infoAfter = bright.getBrightness();
if (infoAfter) {
  console.log(`   currentBrightness: ${infoAfter.currentBrightness}%`);
}

console.log('\n=== Smoke Test Complete ===');
