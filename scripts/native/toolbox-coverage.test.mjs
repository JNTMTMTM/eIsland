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
 * @file toolbox-coverage.test.mjs
 * @description 验证覆盖率门槛不会被四舍五入、未加载模块或未支持的原生指标误判通过。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditCoverage, javascriptScopePatterns, main as javascriptMain, productionInventory, reachesThreshold } from './toolbox-coverage.mjs';
import { aggregate, main as rustMain, recordCoverageBinaries, rustInventory, rustScopePatterns, verifyCoverageBinaries } from './toolbox-rust-coverage.mjs';

test('99 percent gate uses counts rather than a rounded display percentage', () => {
  assert.equal(reachesThreshold({ total: 100000, covered: 98999 }), false);
  assert.equal(reachesThreshold({ total: 100000, covered: 99000 }), true);
});

test('an unreported executable module fails even when reported modules are all covered', (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const directory = mkdtempSync(join(tmpdir(), 'eisland-toolbox-gate-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const inventory = productionInventory();
  const missing = inventory.find((file) => file.executable);
  assert(missing);
  const row = Object.fromEntries(['lines', 'statements', 'functions', 'branches'].map((metric) => [metric, { total: 100, covered: 100, skipped: 0, pct: 100 }]));
  const summary = Object.fromEntries(inventory.filter((file) => file.path !== missing.path).map((file) => [file.path, row]));
  writeFileSync(join(directory, 'coverage-summary.json'), JSON.stringify(summary));
  writeFileSync(join(directory, 'coverage-final.json'), '{}');
  const result = auditCoverage(directory, directory, 0);
  assert.equal(result.coveragePassed, false);
  assert.deepEqual(result.missingRuntimeFiles, [missing.path]);
  assert.deepEqual(result.belowThreshold, []);
  assert.equal(JSON.parse(readFileSync(join(directory, 'scope-audit.json'), 'utf8')).productionFileCount, inventory.length);
});

test('an empty coverage report cannot satisfy a global threshold', (t) => {
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'error', () => {});
  const directory = mkdtempSync(join(tmpdir(), 'eisland-toolbox-empty-report-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  ['coverage-summary.json', 'coverage-final.json'].forEach((file) => writeFileSync(join(directory, file), '{}'));
  const result = auditCoverage(directory, directory, null);
  assert.equal(result.coveragePassed, false);
  assert.deepEqual(result.belowThreshold, ['lines', 'statements', 'functions', 'branches']);
  assert.equal(result.global.lines.pct, null);
});

test('Rust uses weighted native counts and preserves unsupported metrics as null', () => {
  const file = (count, covered) => ({ summary: Object.fromEntries(['lines', 'functions', 'regions'].map((metric) => [metric, { count, covered }])) });
  const result = aggregate([file(1, 0), file(99, 99)]);
  assert.equal(result.lines.pct, 99);
  assert.equal(result.functions.count, 100);
  assert.equal(result.branches.supported, false);
  assert.equal(result.branches.pct, null);
  assert.equal(result.statements.supported, false);
  assert.equal(aggregate([]).regions.pct, null);
});

test('refactor scope retains the toolbox plus whole updater, startup and settings sources', () => {
  const original = productionInventory(); const expanded = productionInventory('refactor');
  const names = new Set(expanded.map((file) => file.path));
  original.forEach(({ path }) => assert(names.has(path), `Toolbox production file dropped: ${path}`));
  [
    'src/renderer/components/config/dynamicIslandUpdateSource.ts',
    'src/renderer/components/hooks/useIslandStartupAnnouncements.ts',
    'src/renderer/components/components/DynamicIslandGuidePages/update/hooks/useUpdateSourceSelect.ts',
    'src/renderer/components/states/maxExpand/components/setting/hooks/useUpdateSettingsState.ts',
    'src/renderer/components/states/maxExpand/components/setting/hooks/useSettingsConfigurationEffects.ts',
    'src/renderer/components/states/maxExpand/components/setting/hooks/useSettingsSyncEffects.ts',
    'src/renderer/components/states/maxExpand/components/setting/config/settingsTabConfig.ts',
  ].forEach((path) => assert(names.has(path), `Changed business module missing: ${path}`));
  assert(expanded.length > original.length);
  assert(expanded.every((file) => /^[a-f0-9]{64}$/u.test(file.sha256)));
  assert.throws(() => javascriptScopePatterns('invalid'), /Unknown/);
});

test('native refactor scope includes business modules and shared dependencies rather than only helpers', () => {
  const inventory = rustInventory('refactor'); const names = new Set(inventory.map((file) => file.path));
  ['features/updater/mod.rs', 'features/updater/sources.rs', 'features/updater/verification.rs', 'features/agent/chat.rs', 'features/agent/status.rs', 'features/agent/tools.rs', 'features/agent/system_tools.rs', 'features/mail/mod.rs', 'features/extensions/mod.rs', 'features/downloads/mod.rs', 'features/files/mod.rs', 'features/images/mod.rs', 'features/wallpaper/video.rs', 'features/wallpaper/extraction.rs', 'features/runtime/mod.rs', 'features/music/audio.rs', 'infrastructure/http.rs', 'infrastructure/storage/store.rs', 'infrastructure/archive.rs', 'infrastructure/hashing.rs', 'infrastructure/child_process.rs'].forEach((file) => assert(names.has(`src-tauri/src/${file}`), `Native business file missing: ${file}`));
  assert(inventory.every((file) => /^[a-f0-9]{64}$/u.test(file.sha256)));
  assert(!names.has('src-tauri/src/features/updater/tests.rs'));
  assert.throws(() => rustScopePatterns('invalid'), /Unknown/);
});

test('an empty expanded-scope report still fails all gates and missing executable modules', (t) => {
  t.mock.method(console, 'log', () => {}); t.mock.method(console, 'error', () => {});
  const directory = mkdtempSync(join(tmpdir(), 'eisland-refactor-empty-report-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  ['coverage-summary.json', 'coverage-final.json'].forEach((file) => writeFileSync(join(directory, file), '{}'));
  const result = auditCoverage(directory, directory, null, 'refactor');
  assert.equal(result.coveragePassed, false); assert.equal(result.scope, 'refactor');
  assert.equal(result.productionFileCount, productionInventory('refactor').length);
  assert(result.missingRuntimeFiles.length > 0);
  assert.deepEqual(result.belowThreshold, ['lines', 'statements', 'functions', 'branches']);
});

test('scope CLI options reject missing or invalid values before invoking compilers', () => {
  assert.throws(() => javascriptMain(['--scope']), /requires/);
  assert.throws(() => javascriptMain(['--scope', 'invalid']), /Unknown/);
  assert.throws(() => rustMain(['--scope']), /requires/);
  assert.throws(() => rustMain(['--scope', 'invalid']), /Unknown/);
});

/** 创建不会执行的隔离 PE 占位文件，只验证驱动指纹行为。
 * @param t - 测试生命周期。
 * @returns 隔离构建和报告目录。
 */
function binaryFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-coverage-binaries-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const target = join(directory, 'target'); const output = join(directory, 'report');
  mkdirSync(join(target, 'debug', 'deps'), { recursive: true });
  ['debug/eisland.exe', 'debug/deps/eisland.exe'].forEach((path) => writeFileSync(join(target, path), Buffer.from('MZ isolated coverage mapping')));
  return { target, output };
}

test('native report accepts unchanged prepared PE fingerprints', (t) => {
  const { target, output } = binaryFixture(t);
  const manifest = recordCoverageBinaries(target, output);
  assert.deepEqual(verifyCoverageBinaries(target, output), manifest);
  assert.equal(manifest.binaries.length, 2);
  assert(manifest.binaries.every(({ size, sha256 }) => size > 0 && /^[a-f0-9]{64}$/u.test(sha256)));
});

test('native report rejects rebuilt PE mappings even when the new file has the same size', (t) => {
  const { target, output } = binaryFixture(t);
  recordCoverageBinaries(target, output);
  const binary = join(target, 'debug', 'deps', 'eisland.exe');
  const bytes = readFileSync(binary); bytes[bytes.length - 1] ^= 1; writeFileSync(binary, bytes);
  assert.throws(() => verifyCoverageBinaries(target, output), /PE coverage mapping changed.*Repeat --prepare → E2E → --report/u);
});

test('native report rejects a missing fingerprint or deleted prepared executable', (t) => {
  const { target, output } = binaryFixture(t);
  assert.throws(() => verifyCoverageBinaries(target, output), /fingerprint verification failed/u);
  recordCoverageBinaries(target, output);
  unlinkSync(join(target, 'debug', 'eisland.exe'));
  assert.throws(() => verifyCoverageBinaries(target, output), /fingerprint verification failed/u);
});
