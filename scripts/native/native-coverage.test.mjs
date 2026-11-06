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
 * @file native-coverage.test.mjs
 * @description 正式解析手动覆盖率工作流，拒绝发布权限、签名泄漏和吞掉覆盖率失败。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { load } from 'js-yaml';
import { rustInventory } from './toolbox-rust-coverage.mjs';

const workflow = load(readFileSync(new URL('../../.github/workflows/native-coverage.yml', import.meta.url), 'utf8'));
const { native } = workflow.jobs;
/** 查找唯一包含指定命令的步骤。
 * @param steps - 已由 YAML 正式解析的步骤。
 * @param command - 要求存在的命令。
 * @returns 唯一步骤。
 */
function step(steps, command) {
  const matches = steps.filter((value) => value.run?.includes(command));
  assert.equal(matches.length, 1, `Expected one command boundary: ${command}`);
  return matches[0];
}

test('coverage workflow is manual only and cannot publish releases or feeds', () => {
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  Object.values(workflow.jobs).forEach((job) => {
    assert(!job.permissions || job.permissions.contents === 'read');
    job.steps.forEach((value) => {
      assert.notEqual(value['continue-on-error'], true);
      assert.doesNotMatch(value.run || '', /(?:npm run release|release:upload|aws\s+s3|gh\s+release|git\s+push|npm\s+publish)/u);
      assert.doesNotMatch(value.uses || '', /(?:action-gh-release|create-release|upload-release-asset)/u);
    });
  });
});

test('native preparation uses stable LLVM, current renderer and packaged native resources', () => {
  const toolchain = native.steps.find((value) => value.uses === 'dtolnay/rust-toolchain@stable');
  assert(toolchain.with.components.includes('llvm-tools-preview'));
  assert.match(step(native.steps, 'cargo install cargo-llvm-cov').run, /--locked.*--version 0\.9\.1/u);
  const renderer = step(native.steps, 'npm run build:web');
  const resources = step(native.steps, 'npm run plugins:build');
  const instrument = step(native.steps, '--scope refactor --prepare');
  assert(native.steps.indexOf(renderer) < native.steps.indexOf(instrument));
  assert(native.steps.indexOf(resources) < native.steps.indexOf(instrument));
  assert.equal(instrument.id, 'instrument');
});

test('desktop tests apply matching instrumentation in the same PowerShell session', () => {
  const desktop = step(native.steps, 'npm run test:e2e');
  assert.equal(desktop.shell, 'pwsh');
  assert.match(desktop.run, /--scope refactor --env-pwsh\s*\|\s*Out-String\s*\|\s*Invoke-Expression/u);
  assert(desktop.run.indexOf('--env-pwsh') < desktop.run.indexOf('npm run test:e2e'));
  assert.match(desktop.run, /if \(\$LASTEXITCODE -ne 0\) \{ exit \$LASTEXITCODE \}/u);
  assert.match(native.env.EISLAND_TEST_IDENTIFIER, /\.refactor-test$/u);
  assert(native.env.EISLAND_REFACTOR_RUST_TARGET_DIR.includes('runner.temp'));
});

test('both jobs preserve failing gates while always retaining diagnostic reports', () => {
  const report = step(native.steps, '--scope refactor --report');
  assert.equal(report.if, "always() && steps.instrument.outcome == 'success'");
  assert.equal(report['continue-on-error'], undefined);
  step(workflow.jobs.frontend.steps, 'toolbox-coverage.mjs --scope refactor');
  Object.values(workflow.jobs).forEach((job) => {
    const artifacts = job.steps.filter((value) => value.uses?.startsWith('actions/upload-artifact@'));
    assert(artifacts.length > 0);
    artifacts.forEach((value) => {
      assert.equal(value.if, 'always()');
      assert.doesNotMatch(value.with.path, /(?:RUNNER_TEMP|runner\.temp|test\.key|signing|\.env)/u);
    });
  });
});

test('temporary identity uses the shared signing helper and always cleans it up', () => {
  const prepare = step(native.steps, 'test-signing.mjs prepare');
  const cleanup = step(native.steps, 'test-signing.mjs cleanup');
  assert.equal(cleanup.if, 'always()');
  assert(native.steps.indexOf(prepare) < native.steps.indexOf(step(native.steps, '--scope refactor --prepare')));
  assert.doesNotMatch(JSON.stringify(workflow), /secrets\.|signer generate|TAURI_SIGNING_PRIVATE_KEY/u);
});

test('business inventory excludes separate pure tests while retaining all updater implementation', () => {
  const inventory = rustInventory('refactor');
  assert(!inventory.some((file) => file.path === 'src-tauri/src/features/updater/tests.rs'));
  ['mod.rs', 'sources.rs', 'verification.rs'].forEach((file) => assert(inventory.some((entry) => entry.path === `src-tauri/src/features/updater/${file}`)));
});
