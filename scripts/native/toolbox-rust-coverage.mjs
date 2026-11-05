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
 * @file toolbox-rust-coverage.mjs
 * @description 隔离原生插桩构建和 CDP profile，分别报告全库与工具箱完整文件的真实 LLVM 覆盖率。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cwd = join(root, 'src-tauri');
const metricNames = ['lines', 'functions', 'regions'];
const scopePatterns = [
  'src-tauri/src/features/downloads/**/*.rs',
  'src-tauri/src/features/images/**/*.rs',
  'src-tauri/src/features/files/**/*.rs',
  'src-tauri/src/features/wallpaper/video.rs',
  'src-tauri/src/features/wallpaper/extraction.rs',
  'src-tauri/src/features/music/network.rs',
  'src-tauri/src/infrastructure/http.rs',
  'src-tauri/src/commands/desktop.rs',
  'src-tauri/src/commands/services.rs',
  'src-tauri/src/infrastructure/assets.rs',
  'src-tauri/src/infrastructure/resources.rs',
  'src-tauri/src/infrastructure/child_process.rs',
  'src-tauri/src/infrastructure/storage/**/*.rs',
  'src-tauri/src/shared/**/*.rs',
  'src-tauri/src/state/**/*.rs',
  'src-tauri/src/lib.rs',
  'src-tauri/src/main.rs',
];

/** 统一 LLVM 的绝对源码路径。
 * @param path - 源文件路径。
 * @returns 仓库相对路径。
 */
function repositoryPath(path) {
  return (isAbsolute(path) ? relative(root, path) : path).replaceAll('\\', '/');
}

/** 明确列出全部 scope 文件，不按测试是否执行选择模块。
 * @returns 带哈希的 whole-file 清单。
 */
export function rustInventory() {
  return Array.from(new Set(scopePatterns.flatMap((pattern) => globSync(pattern, { cwd: root })).map(repositoryPath))).sort().map((path) => {
    const text = readFileSync(resolve(root, path), 'utf8');
    const code = text.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\r\n]*/gu, '');
    return { path, sha256: createHash('sha256').update(text).digest('hex'), hasFunctions: /\bfn\s+\w+/u.test(code) };
  });
}

/** 运行 Cargo/LLVM 边界，错误直接终止，不生成成功报告。
 * @param args - Cargo 参数。
 * @param env - 隔离后的环境。
 * @param capture - 是否返回标准输出。
 * @returns 标准输出。
 */
function cargo(args, env, capture = false) {
  const result = spawnSync('cargo', args, { cwd, env, encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw result.error || new Error(`cargo ${args.join(' ')} failed (${result.status})`);
  return result.stdout || '';
}

/** 使用工具自己输出的环境，确保 unit、native binary 与 CDP 子进程写到同一 profile 集合。
 * @param target - 专用插桩构建目录。
 * @returns 子进程环境与测试 binary 路径。
 */
export function instrumentation(target) {
  const testConfig = { ...JSON.parse(process.env.TAURI_CONFIG || '{}'), identifier: 'com.pyisland.eisland.toolbox-test' };
  const base = { ...process.env, TAURI_CONFIG: JSON.stringify(testConfig), CARGO_TARGET_DIR: target, CARGO_LLVM_COV_TARGET_DIR: target };
  delete base.CARGO_LLVM_COV_SHOW_ENV;
  const assignments = cargo(['llvm-cov', 'show-env', '--cmd'], base, true);
  const overrides = { CARGO_TARGET_DIR: target, EISLAND_SMOKE_BINARY: join(target, 'debug', 'eisland.exe') };
  assignments.split(/\r?\n/u).filter(Boolean).forEach((line) => {
    const match = line.match(/^set ([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) throw new Error('Unexpected cargo llvm-cov show-env output');
    const [, key, value] = match;
    overrides[key] = value;
  });
  if (!overrides.LLVM_PROFILE_FILE || !overrides.RUSTC_WRAPPER) throw new Error('Incomplete coverage instrumentation environment');
  return { base, overrides, env: { ...base, ...overrides } };
}

/** 汇总 LLVM 的计数；stable Rust 未采集的 branch 必须保留 unsupported。
 * @param files - LLVM 文件记录。
 * @returns 独立的原生指标。
 */
export function aggregate(files) {
  const totals = Object.fromEntries(metricNames.map((metric) => [metric, { count: 0, covered: 0 }]));
  files.forEach((file) => metricNames.forEach((metric) => {
    const value = file.summary[metric];
    totals[metric].count += value.count;
    totals[metric].covered += value.covered;
  }));
  metricNames.forEach((metric) => { totals[metric].pct = totals[metric].count ? totals[metric].covered * 100 / totals[metric].count : null; });
  return { ...totals, branches: { supported: false, pct: null, reason: 'Stable Rust source-based branch coverage is not enabled; no nightly or experimental branch instrumentation was used.' }, statements: { supported: false, pct: null, reason: 'LLVM regions are reported separately and are not JavaScript statements.' } };
}

/** 生成全库与 whole-file 工具箱 JSON、HTML、LCOV，scope 不排除低覆盖函数。
 * @param output - 报告目录。
 * @param environment - instrumentation 返回值。
 * @returns 工具箱门槛是否通过。
 */
export function report(output, environment) {
  const globalDir = join(output, 'global'); const toolboxDir = join(output, 'toolbox');
  [globalDir, toolboxDir].forEach((directory) => mkdirSync(directory, { recursive: true }));
  const globalJson = join(globalDir, 'coverage.json'); const globalLcov = join(globalDir, 'lcov.info');
  cargo(['llvm-cov', 'report', '--json', '--output-path', globalJson], environment.base);
  cargo(['llvm-cov', 'report', '--lcov', '--output-path', globalLcov], environment.base);
  cargo(['llvm-cov', 'report', '--html', '--output-dir', globalDir], environment.base);
  const raw = JSON.parse(readFileSync(globalJson, 'utf8'));
  const inventory = rustInventory(); const names = new Set(inventory.map((file) => file.path));
  const allFiles = raw.data.flatMap((data) => data.files).filter((file) => repositoryPath(file.filename).startsWith('src-tauri/src/'));
  const scoped = allFiles.filter((file) => names.has(repositoryPath(file.filename)));
  const reported = new Set(scoped.map((file) => repositoryPath(file.filename)));
  const missing = inventory.filter((file) => file.hasFunctions && !reported.has(file.path)).map((file) => file.path);
  const byPath = new Map(scoped.map((file) => [repositoryPath(file.filename), file]));
  const perFile = inventory.map(({ path }) => {
    const file = byPath.get(path);
    return { path, reported: Boolean(file), metrics: file ? aggregate([file]) : null, belowThreshold: file ? metricNames.filter((metric) => file.summary[metric].count > 0 && file.summary[metric].covered * 100 < file.summary[metric].count * 99) : [] };
  });
  const global = aggregate(allFiles); const toolbox = aggregate(scoped);
  const belowThreshold = metricNames.filter((metric) => toolbox[metric].count === 0 || toolbox[metric].covered * 100 < toolbox[metric].count * 99);
  const audit = { inventory, perFile, belowThreshold, scopePatterns, global, toolbox, generatedAt: new Date().toISOString(), language: 'rust', targetDirectory: environment.overrides.CARGO_TARGET_DIR, profilePattern: environment.overrides.LLVM_PROFILE_FILE, threshold: 99, globalSourceFileCount: globSync('src-tauri/src/**/*.rs', { cwd: root }).length, globalReportedFileCount: allFiles.length, missingInstrumentedFiles: missing, coveragePassed: missing.length === 0 && belowThreshold.length === 0, limitations: ['Metrics describe compiled Windows code and instantiated functions.', 'Whole-file LLVM summaries may include inline cfg(test) code in those production files.', 'No JavaScript percentage is combined with the native metrics.'] };
  writeFileSync(join(output, 'scope-audit.json'), `${JSON.stringify(audit, null, 2)  }\n`);
  writeFileSync(join(toolboxDir, 'coverage.json'), `${JSON.stringify({ language: 'rust', scope: 'toolbox-whole-files', summary: toolbox, files: scoped, functions: raw.data.flatMap((data) => data.functions).filter((fn) => fn.filenames.some((path) => names.has(repositoryPath(path)))) }, null, 2)  }\n`);
  const records = readFileSync(globalLcov, 'utf8').split('end_of_record');
  writeFileSync(join(toolboxDir, 'lcov.info'), records.filter((record) => {
    const path = record.match(/^SF:(.+)$/mu)?.[1];
    return path && names.has(repositoryPath(path.trim()));
  }).map((record) => `${record  }end_of_record\n`).join(''));
  const excluded = raw.data.flatMap((data) => data.files).filter((file) => !names.has(repositoryPath(file.filename))).map((file) => file.filename.split(/[\\/]/u).map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('[/\\\\]'));
  const htmlArgs = ['llvm-cov', 'report', '--html', '--output-dir', toolboxDir];
  if (excluded.length) htmlArgs.push('--ignore-filename-regex', `^(${  excluded.join('|')  })$`);
  cargo(htmlArgs, environment.base);
  const uncovered = raw.data.flatMap((data) => data.functions).filter((fn) => fn.filenames.some((path) => names.has(repositoryPath(path)))).flatMap((fn) => {
    const regions = fn.regions.filter((region) => region[4] === 0);
    return regions.length ? [{ regions, name: fn.name, filenames: fn.filenames.map(repositoryPath) }] : [];
  });
  writeFileSync(join(toolboxDir, 'uncovered.json'), `${JSON.stringify(uncovered, null, 2)  }\n`);
  console.log(JSON.stringify({ belowThreshold, rustGlobal: global, rustToolbox: toolbox, missingInstrumentedFiles: missing }, null, 2));
  return audit.coveragePassed;
}

/** 准备插桩构建、输出 CDP 环境或合并已收集的真实 profile。
 * @param argv - --prepare、--env、--env-pwsh、--report、--target-dir 与 --output。
 * @returns 退出码。
 */
export function main(argv) {
  let mode = '--report'; let target = process.env.EISLAND_TOOLBOX_RUST_TARGET_DIR || join(tmpdir(), 'eisland-toolbox-coverage-target'); let output = 'coverage/toolbox/rust';
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (['--prepare', '--env', '--env-pwsh', '--report'].includes(arg)) mode = arg;
    else if (arg === '--target-dir' || arg === '--output') {
      const value = argv[++index]; if (!value || value.startsWith('--')) throw new Error(`${arg  } requires a directory`);
      if (arg === '--target-dir') target = value; else output = value;
    } else throw new Error(`Unknown native coverage option: ${  arg}`);
  }
  target = resolve(root, target); output = resolve(root, output);
  const environment = instrumentation(target);
  if (mode === '--env') console.log(JSON.stringify(environment.overrides, null, 2));
  else if (mode === '--env-pwsh') Object.entries(environment.overrides).forEach(([key, value]) => console.log(`$env:${  key  } = '${  value.replaceAll("'", "''")  }'`));
  else if (mode === '--prepare') {
    cargo(['llvm-cov', 'test', '--no-report', '--locked', '--lib'], environment.base);
    cargo(['build', '--locked', '--features', 'custom-protocol'], environment.env);
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, 'instrumentation-environment.json'), `${JSON.stringify(environment.overrides, null, 2)  }\n`);
    writeFileSync(join(output, 'scope-manifest.json'), `${JSON.stringify(rustInventory(), null, 2)  }\n`);
    console.log('Instrumented binary ready. Run CDP tests with --env-pwsh environment and normal app:quit before --report.');
  } else return report(output, environment) ? 0 : 1;
  return 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error('Native toolbox coverage failed:', error.message); process.exitCode = 1; }
}
