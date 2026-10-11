/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file native-coverage.mjs
 * @description 单独构建带 LLVM 计数器的 Swift 库和 C 绑定，运行 Vitest 并生成原生覆盖率报告。
 * @author 鸡哥
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('Swift coverage requires macOS and Xcode Command Line Tools.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const output = join(root, 'build', 'native-coverage');
const reports = join(root, 'coverage', 'native');
// 仅清理本脚本的测试产物；生产 prebuilds 和 JS 报告始终独立。
rmSync(output, { recursive: true, force: true });
rmSync(reports, { recursive: true, force: true });
mkdirSync(join(output, 'profiles'), { recursive: true });
mkdirSync(reports, { recursive: true });
const sources = ['DDCProtocol.swift', 'NativeDisplays.swift', 'BrightnessCore.swift'].map((name) => join(root, 'src', name));
const library = join(output, 'libEislandBrightnessCore.dylib');
const target = `${process.arch === 'x64' ? 'x86_64' : process.arch}-apple-macosx13.0`;
const addon = join(output, 'brightness.node');
const productionAddon = join(root, 'prebuilds', `darwin-${process.arch}`, 'brightness.node');

const preload = join(output, 'load-instrumented.cjs');
// 将当前插件的 .node 重定向到测试副本，让 @loader_path 解析隔离的覆盖率库。
writeFileSync(preload, `const Module = require('node:module');
const load = Module._extensions['.node'];
Module._extensions['.node'] = (module, filename) => load(module, filename === ${JSON.stringify(productionAddon)} ? ${JSON.stringify(addon)} : filename);
`);
const env = {
  ...process.env,
  // Darwin 连续写入避免 Vitest 结束 Worker 时丢失进程内计数器。
  LLVM_PROFILE_FILE: join(output, 'profiles', '%m-%p-%c.profraw'),
  NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${JSON.stringify(preload)}`].filter(Boolean).join(' '),
};

/**
 * 调用工具并保留编译或测试错误。
 * @param command - 可执行程序。
 * @param args - 独立传递的参数，避免 shell 转义问题。
 * @returns 无返回值；失败时抛出子进程异常。
 */
function run(command, args) {
  execFileSync(command, args, { env, cwd: root, stdio: 'inherit' });
}

run('xcrun', ['swiftc', '-target', target, '-swift-version', '5', '-O', '-emit-library', '-module-name', 'EislandBrightnessCore',
  '-profile-generate', '-profile-coverage-mapping', ...sources,
  '-Xlinker', '-install_name', '-Xlinker', '@rpath/libEislandBrightnessCore.dylib', '-o', library]);
const headers = [
  process.env.NODE_INCLUDE_DIR,
  resolve(dirname(process.execPath), '..', 'include', 'node'),
  join(homedir(), 'Library', 'Caches', 'node-gyp', process.versions.node, 'include', 'node'),
].filter(Boolean).find((path) => existsSync(join(path, 'node_api.h')));
if (!headers) throw new Error('Node headers are missing; run npm run build before native coverage.');
const binding = join(root, 'src', 'addon.c');
run('xcrun', ['clang', '-target', target, '-bundle', '-undefined', 'dynamic_lookup', '-DNAPI_VERSION=8',
  '-Wall', '-Wextra', '-Werror', '-fprofile-instr-generate', '-fcoverage-mapping',
  '-I', headers, binding, '-L', output, '-lEislandBrightnessCore', '-Wl,-rpath,@loader_path', '-o', addon]);
[library, addon].forEach((binary) => run('codesign', ['--force', '--sign', '-', binary]));
const objects = [library, addon];
const testBinary = join(output, 'native-tests');
run('xcrun', ['swiftc', '-target', target, '-swift-version', '5', '-O', '-module-name', 'EislandBrightnessCore',
  '-profile-generate', '-profile-coverage-mapping', ...sources, join(root, 'test', 'NativeCoreTests.swift'), '-o', testBinary]);
const results = JSON.parse(execFileSync(testBinary, [], { env, cwd: root, encoding: 'utf8' }));
if (results.some((result) => !result.passed)) throw new Error('Compiled Swift logic tests failed.');
objects.push(testBinary);
// 只影响当前测试进程；副本仍是已构建的真实 Node-API 绑定。
run(process.execPath, [join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs'), 'run', '--config', 'vitest.config.mjs']);
const profiles = readdirSync(join(output, 'profiles')).filter((name) => name.endsWith('.profraw')).map((name) => join(output, 'profiles', name));
if (!profiles.length) throw new Error('No LLVM profiles were generated; the instrumented Swift library did not load.');
const profile = join(output, 'merged.profdata');
run('xcrun', ['llvm-profdata', 'merge', '-sparse', ...profiles, '-o', profile]);
const args = [objects[0], ...objects.slice(1).flatMap((object) => ['-object', object]), '-instr-profile', profile, ...sources, binding];
const summary = execFileSync('xcrun', ['llvm-cov', 'report', ...args], { cwd: root, encoding: 'utf8' });
console.log(summary);
writeFileSync(join(reports, 'summary.txt'), summary);
writeFileSync(join(reports, 'coverage.json'), execFileSync('xcrun', ['llvm-cov', 'export', ...args], { cwd: root }));
run('xcrun', ['llvm-cov', 'show', ...args, '-format=html', `-output-dir=${join(reports, 'html')}`]);
console.log(`Swift / C coverage report: ${join(reports, 'html', 'index.html')}`);
