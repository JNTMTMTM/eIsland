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
 * @file deprecated-electron.mjs
 * @description 阻止已弃用的 Electron 调试、端到端测试与发布命令重新启用旧宿主。
 * @author 鸡哥
 */
import { readFileSync } from 'node:fs';

const requestedLocale = (process.env.LC_ALL || process.env.LANG || Intl.DateTimeFormat().resolvedOptions().locale).replace('_', '-');
const locale = [[/^zh-(?:TW|HK|Hant)/i, 'zh-TW'], [/^zh/i, 'zh-CN'], [/^ja/i, 'ja-JP']]
  .find(([pattern]) => pattern.test(requestedLocale))?.[1] || 'en-US';
const messages = JSON.parse(readFileSync(new URL(`../i18n/${locale}.json`, import.meta.url), 'utf8'));
console.error(messages.devCli.errors.electronDeprecated.replace('{{name}}', process.argv[2] || 'Electron'));
process.exitCode = 1;
