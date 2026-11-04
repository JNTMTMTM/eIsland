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
 * @file native-runtime.test.mjs
 * @description 确认桌面代码与命令仅使用原生 Tauri 入口。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('removed Electron hosts and configurations cannot remain active', () => {
  ['src/main/index.ts', 'src/preload/index.ts', 'electron.vite.config.ts', 'electron-builder.json', 'scripts/deprecated-electron.mjs', 'resources/qishui-auth-v6.js', 'resources/qishui-qr-login.js', 'sdk/src/host.ts'].forEach((name) => assert(!existsSync(new URL(`../../${name}`, import.meta.url)), name));
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.deprecatedElectron, undefined);
  Object.entries(pkg.scripts).forEach(([name, command]) => {
    assert(!name.includes(':tauri'), name);
    assert(!/(?:^|[;&|\s])(?:npx\s+)?electron(?:-vite|-builder)?(?:\s|$)/u.test(command), name);
    assert(!command.includes('deprecated-electron'), name);
  });
  assert.equal(pkg.scripts.dev, 'tauri dev');
});
test('active workflows do not install or launch the retired runtime', () => {
  globSync('.github/workflows/*.{yml,yaml}', { cwd: root }).forEach((name) => {
    const source = readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8');
    assert(!source.includes('node_modules/electron/install.js'), name);
    assert(!/run:\s*(?:npx\s+)?electron(?:-vite|-builder)?\s/u.test(source), name);
    assert(!source.includes(':tauri'), name);
  });
});
