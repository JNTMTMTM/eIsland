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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { auditCoverage, productionInventory, reachesThreshold } from './toolbox-coverage.mjs';
import { aggregate } from './toolbox-rust-coverage.mjs';

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
