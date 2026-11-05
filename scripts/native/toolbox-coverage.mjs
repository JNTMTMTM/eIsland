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
 * @file toolbox-coverage.mjs
 * @description 执行完整工具箱 JS 覆盖率并审计生产文件分母，独立保存总体、逐文件和未覆盖位置。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';
import { toolboxSourceRoots } from '../../vitest.toolbox.config.mts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const metrics = ['lines', 'statements', 'functions', 'branches'];
const threshold = 99;

/** 将报告中的绝对路径或仓库相对路径转为统一的仓库路径。
 * @param path - 源文件路径。
 * @returns 使用正斜线的仓库路径。
 */
function repositoryPath(path) {
  return (isAbsolute(path) ? relative(root, path) : path).replaceAll('\\', '/');
}

/** 完整枚举生产模块；类型文件保留在范围清单中但不伪造可执行覆盖率。
 * @returns 带源码哈希和可执行性说明的文件清单。
 */
export function productionInventory() {
  return toolboxSourceRoots.flatMap((directory) => globSync(`${directory  }/**/*.{ts,tsx,js,jsx,mts,cts}`, { cwd: root }))
    .map(repositoryPath)
    .filter((path) => !path.includes('/test/') && !/\.(?:test|spec)\.[^.]+$/u.test(path) && !/\.d\.(?:ts|mts|cts)$/u.test(path))
    .sort()
    .map((path) => {
      const text = readFileSync(resolve(root, path), 'utf8');
      const emitted = transformSync(text, { loader: /\.(?:tsx|jsx)$/u.test(path) ? 'tsx' : 'ts', format: 'esm', target: 'es2022', legalComments: 'none', treeShaking: false }).code;
      return { path, sha256: createHash('sha256').update(text).digest('hex'), executable: emitted.replace(/export\s*\{\s*\};?/gu, '').trim().length > 0 };
    });
}

/** 使用真实计数判断门槛，不依赖四舍五入后的展示百分比。
 * @param value - Istanbul 指标。
 * @returns 是否达到工具箱总体门槛。
 */
export function reachesThreshold(value) {
  return value.total === 0 || value.covered * 100 >= value.total * threshold;
}

/** 从原始报告重算工具箱范围，并输出逐文件与未覆盖位置。
 * @param input - 原始 coverage-summary/final.json 目录。
 * @param output - 审计报告目录。
 * @param testExitCode - 本次测试退出码；只读取报告时为 null。
 * @returns 审计摘要。
 */
export function auditCoverage(input, output, testExitCode = null) {
  const summary = JSON.parse(readFileSync(resolve(input, 'coverage-summary.json'), 'utf8'));
  const coverage = JSON.parse(readFileSync(resolve(input, 'coverage-final.json'), 'utf8'));
  const summaries = new Map(Object.entries(summary).filter(([path]) => path !== 'total').map(([path, row]) => [repositoryPath(path), row]));
  const details = new Map(Object.entries(coverage).map(([path, row]) => [repositoryPath(path), row]));
  const inventory = productionInventory();
  const missing = [];
  const totals = Object.fromEntries(metrics.map((metric) => [metric, { total: 0, covered: 0, skipped: 0 }]));
  const perFile = inventory.map((file) => {
    const row = summaries.get(file.path);
    if (!row && file.executable) missing.push(file.path);
    if (row) {metrics.forEach((metric) => {
      ['total', 'covered', 'skipped'].forEach((key) => { totals[metric][key] += row[metric][key] || 0; });
    });}
    return { ...file, reported: Boolean(row), metrics: row || null, belowThreshold: row ? metrics.filter((metric) => !reachesThreshold(row[metric])) : [] };
  });
  metrics.forEach((metric) => { totals[metric].pct = totals[metric].total ? totals[metric].covered * 100 / totals[metric].total : null; });
  const belowThreshold = metrics.filter((metric) => totals[metric].total === 0 || !reachesThreshold(totals[metric]));
  const uncovered = inventory.flatMap(({ path }) => {
    const file = details.get(path);
    if (!file) return [];
    const statements = Object.entries(file.s).filter(([, count]) => count === 0).map(([id]) => file.statementMap[id]);
    const functions = Object.entries(file.f).filter(([, count]) => count === 0).map(([id]) => ({ name: file.fnMap[id].name, location: file.fnMap[id].loc }));
    const branches = Object.entries(file.b).flatMap(([id, counts]) => counts.flatMap((count, index) => count === 0 ? [{ line: file.branchMap[id].line, type: file.branchMap[id].type, location: file.branchMap[id].locations[index] }] : []));
    return statements.length || functions.length || branches.length ? [{ path, statements, functions, branches }] : [];
  });
  const audit = { input, testExitCode, threshold, belowThreshold, perFile, generatedAt: new Date().toISOString(), language: 'javascript', productionFileCount: inventory.length, runtimeFileCount: inventory.filter((file) => file.executable).length, missingRuntimeFiles: missing, global: totals, coveragePassed: missing.length === 0 && belowThreshold.length === 0 };
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'scope-audit.json'), `${JSON.stringify(audit, null, 2)  }\n`);
  writeFileSync(resolve(output, 'uncovered.json'), `${JSON.stringify(uncovered, null, 2)  }\n`);
  metrics.forEach((metric) => console.log(`Toolbox JS ${  metric  }: ${  totals[metric].covered  }/${  totals[metric].total  } = ${  totals[metric].pct?.toFixed(4) || 'no executable items'  }%`));
  if (missing.length) console.error('Missing executable modules in coverage report:', missing);
  if (belowThreshold.length) console.error('Toolbox JS below 99%:', belowThreshold.join(', '));
  return audit;
}

/** 运行独立 JS 覆盖率，或只审计既有报告而不重跑测试。
 * @param argv - --report-only <报告目录>、--output <输出目录> 或额外 Vitest 参数。
 * @returns 退出码。
 */
export function main(argv) {
  let input;
  let output = process.env.EISLAND_TOOLBOX_COVERAGE_DIR || 'coverage/toolbox/renderer';
  const additional = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--report-only' || argv[index] === '--output') {
      const option = argv[index]; const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${option  } requires a directory`);
      if (option === '--report-only') input = value;
      else output = value;
    } else additional.push(argv[index]);
  }
  output = resolve(root, output);
  const result = input ? null : spawnSync(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.toolbox.config.mts', '--coverage', ...additional], { cwd: root, stdio: 'inherit', windowsHide: true, env: { ...process.env, EISLAND_TOOLBOX_COVERAGE_DIR: output } });
  if (result?.error) throw result.error;
  const audit = auditCoverage(resolve(root, input || output), output, result?.status ?? null);
  return audit.coveragePassed && (!result || result.status === 0) ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error('Toolbox JS coverage failed:', error.message); process.exitCode = 1; }
}
