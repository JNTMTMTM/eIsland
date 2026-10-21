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
 */

/**
 * @file vitest-discovery.test.mjs
 * @description 对照源码测试文件与 Vitest 实际收集结果，防止根配置漏收或重复执行。
 * @author 鸡哥
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('Windows root Vitest projects discover every source and plugin test exactly once', {
  skip: process.platform !== 'win32',
}, () => {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'list', '--filesOnly', '--json'], {
    cwd: root, encoding: 'utf8', windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const entries = JSON.parse(result.stdout);
  const discovered = entries.map(({ file }) => resolve(file));
  assert.equal(new Set(discovered).size, discovered.length, 'A test belongs to more than one project');
  const expected = globSync([
    'src/**/*.{test,spec}.{ts,tsx,js,mjs,cjs,mts,cts}',
    'plugins/**/*.{test,spec}.{ts,tsx,js,mjs,cjs,mts,cts}',
  ], { cwd: root, exclude: ['**/node_modules/**', '**/build/**', '**/bin/**', '**/obj/**'] }).map((file) => resolve(root, file));
  const included = new Set(discovered);
  const missing = expected.filter((file) => !included.has(file));
  assert.deepEqual(missing, [], `Uncollected Vitest tests:\n${missing.join('\n')}`);
  assert.ok(expected.length > 0, 'No test files were scanned');
  const workflow = readFileSync(resolve(root, '.github/workflows/test.yml'), 'utf8');
  const matrix = workflow.match(/project:.*\|\| '(\[[^'\r\n]*\])'/u);
  assert.ok(matrix, 'No default CI project matrix found');
  const ciProjects = new Set([
    ...JSON.parse(matrix[1]),
    ...Array.from(workflow.matchAll(/PROJECT_ARGS\+=\(--project ([\w-]+)\)/gu), (match) => match[1]),
  ]);
  const untestedProjects = Array.from(new Set(entries.map(({ projectName }) => projectName)))
    .filter((name) => !ciProjects.has(name));
  assert.deepEqual(untestedProjects, [], 'Collected projects are missing from CI execution');
  console.log(`All ${expected.length} source and plugin test files are collected exactly once.`);
});
