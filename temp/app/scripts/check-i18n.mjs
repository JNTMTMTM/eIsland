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
 * @file check-i18n.mjs
 * @description 比较根 i18n 中 migrationAdapter 命名空间的四语言叶子键及插值参数，并检查界面固定翻译键。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 展平词典以检查动态阶段、来源和错误的完整性。
 * @param value - 词典节点。
 * @param prefix - 当前路径。
 * @returns 叶子词条。
 */
function flatten(value, prefix = '') {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => typeof item === 'string' ? [[prefix + key, item]] : Object.entries(flatten(item, `${prefix}${key}.`))));
}
const locales = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP'].map((name) => flatten(JSON.parse(readFileSync(`../../i18n/${name}.json`, 'utf8')).migrationAdapter));
const keys = Object.keys(locales[0]).sort();
locales.forEach((locale) => {
  assert.deepEqual(Object.keys(locale).sort(), keys);
  keys.forEach((key) => {
    assert.ok(locale[key].trim(), key);
    assert.deepEqual(locale[key].match(/\{\{\w+\}\}/g)?.sort(), locales[0][key].match(/\{\{\w+\}\}/g)?.sort(), key);
  });
});
/** 递归核对静态 t() 调用。
 * @param directory - 源码目录。
 * @returns 无返回值，缺失词条时断言失败。
 */
function scan(directory) {
  readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (/\.tsx?$/.test(entry.name)) {
      const source = readFileSync(path, 'utf8');
      Array.from(source.matchAll(/\bt\('([^']+)'/g)).forEach((match) => assert.ok(keys.includes(match[1]), `${path}: ${match[1]}`));
    }
  });
}
scan('renderer/modules');
console.log(`PASS: ${keys.length} translation keys and interpolation parameters in all four languages`);
