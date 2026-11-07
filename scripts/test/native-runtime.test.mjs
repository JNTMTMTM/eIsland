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
 * @description 确认主应用仅使用 Tauri，迁移适配器的 Electron 安装严格隔离。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { existsSync, globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { load } from 'js-yaml';

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
/** 检查工作流的旧运行时入口，仅允许适配器目录安装自身所需的 Electron。
 * @param name - 仓库相对工作流路径。
 * @param source - 工作流 YAML 内容。
 */
function assertWorkflowRuntime(name, source) {
  const workflow = load(source);
  Object.values(workflow.jobs).forEach((job) => {
    (job.steps || []).forEach((step) => {
      const command = step.run || '';
      const adapterInstall = ['.github/workflows/migration-adapter.yml', '.github/workflows/release-build-upload.yml'].includes(name.replaceAll('\\', '/'))
        && step['working-directory'] === 'temp/app'
        && command.trim() === 'node node_modules/electron/install.js';
      assert(!command.includes('node_modules/electron/install.js') || adapterInstall, name);
    });
  });
  assert(!/run:\s*(?:npx\s+)?electron(?:-vite|-builder)?\s/u.test(source), name);
  assert(!source.includes(':tauri'), name);
}

test('active workflows do not install or launch the retired application runtime', () => {
  globSync('.github/workflows/*.{yml,yaml}', { cwd: root }).forEach((name) => {
    assertWorkflowRuntime(name, readFileSync(new URL(`../../${name}`, import.meta.url), 'utf8'));
  });
});

test('adapter runtime installation is allowed only in its isolated workflow step', () => {
  const name = '.github/workflows/migration-adapter.yml';
  const source = 'jobs:\n  adapter:\n    steps:\n      - working-directory: temp/app\n        run: node node_modules/electron/install.js\n';
  assert.doesNotThrow(() => assertWorkflowRuntime(name, source));
  assert.doesNotThrow(() => assertWorkflowRuntime('.github/workflows/release-build-upload.yml', source));
  assert.doesNotThrow(() => assertWorkflowRuntime(name.replaceAll('/', '\\'), source));
  assert.throws(() => assertWorkflowRuntime('.github/workflows/build.yml', source), assert.AssertionError);
  assert.throws(() => assertWorkflowRuntime(name, source.replace('temp/app', '.')), assert.AssertionError);
  assert.throws(() => assertWorkflowRuntime(name, source.replace('node node_modules', 'node ../node_modules')), assert.AssertionError);
  assert.throws(() => assertWorkflowRuntime(name, source.replace('install.js', 'install.js && npx electron .')), assert.AssertionError);
  assert.throws(() => assertWorkflowRuntime(name, source.replace('node node_modules/electron/install.js', 'npx electron .')), assert.AssertionError);
});
