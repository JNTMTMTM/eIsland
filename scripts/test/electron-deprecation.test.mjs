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
 * @file electron-deprecation.test.mjs
 * @description 验证弃用命令无法重新启动 Electron、执行旧发布任务或安装旧运行时。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('every package script avoids retired Electron runtime executables', () => {
  const manifests = globSync('**/package.json', {
    cwd: root,
    exclude: ['**/node_modules/**', '**/out/**', '**/dist/**', '**/target/**', '**/resources/music/**'],
  });
  assert(manifests.length > 1);
  manifests.forEach((file) => {
    const manifest = JSON.parse(readFileSync(new URL(`../../${file.replaceAll('\\', '/')}`, import.meta.url), 'utf8'));
    Object.entries(manifest.scripts ?? {}).forEach(([name, command]) => {
      if (command.startsWith('node scripts/deprecated-electron.mjs ')) return;
      assert(!/(?:^|[;&|\s])(?:npx\s+)?electron(?:-vite|-builder)?(?:\s|$)/u.test(command), `${file}: ${name}`);
      assert(!command.includes('node_modules/electron/install.js'), `${file}: ${name}`);
    });
  });
});

test('retired commands fail with a localized migration instruction', () => {
  ['en-US', 'zh-CN', 'zh-TW', 'ja-JP'].forEach((locale) => {
    const result = spawnSync(process.execPath, ['scripts/deprecated-electron.mjs', 'preview'], {
      cwd: root, encoding: 'utf8', windowsHide: true, env: { ...process.env, LC_ALL: locale },
    });
    assert.equal(result.status, 1);
    assert(result.stderr.includes('preview'));
    assert(result.stderr.includes('dev:tauri'));
    assert(!/TypeError|ReferenceError/u.test(result.stderr));
  });
  ['preview', 'test:e2e', 'release:upload', 'music:build:tauri'].forEach((name) => {
    assert(pkg.scripts[name].startsWith('node scripts/deprecated-electron.mjs '), name);
    assert.equal(typeof pkg.deprecatedElectron.scripts[name], 'string');
  });
});

test('active GitHub workflows do not install or launch Electron', () => {
  globSync('.github/workflows/*.{yml,yaml}', { cwd: root }).forEach((file) => {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8');
    assert(!source.includes('node_modules/electron/install.js'), file);
    assert(!/run:\s*(?:npx\s+)?electron(?:-vite|-builder)?\s/u.test(source), file);
  });
});
