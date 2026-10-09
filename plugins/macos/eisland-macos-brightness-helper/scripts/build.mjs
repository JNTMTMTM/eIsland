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
 * @file build.mjs
 * @description 使用 Xcode 工具链构建 Swift 和 Node-API 亮度插件及独立原生逻辑测试。
 * @author 鸡哥
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('Build requires macOS and Xcode Command Line Tools.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const minimumMacOS = '13.0';

/**
 * 调用本机构建工具。
 * @param command - 可执行程序；参数通过数组传递以保留空格路径。
 * @param args - 传给构建工具的参数数组。
 */
function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: 'inherit' });
}

/**
 * 查找或下载 Node-API 头文件。
 * @returns 与当前 Node 版本匹配的头文件目录。
 */
function nodeHeaders() {
  const candidates = [
    process.env.NODE_INCLUDE_DIR,
    resolve(dirname(process.execPath), '..', 'include', 'node'),
    join(homedir(), 'Library', 'Caches', 'node-gyp', process.versions.node, 'include', 'node'),
  ].filter(Boolean);
  let found = candidates.find((path) => existsSync(join(path, 'node_api.h')));
  if (!found) {
    run(process.execPath, [require.resolve('node-gyp/bin/node-gyp.js'), 'install', '--ensure']);
    found = candidates.find((path) => existsSync(join(path, 'node_api.h')));
  }
  if (!found) throw new Error('Node headers not found. Set NODE_INCLUDE_DIR to the directory containing node_api.h.');
  return found;
}

const sources = ['DDCProtocol.swift', 'NativeDisplays.swift', 'BrightnessCore.swift'].map((name) => join(root, 'src', name));
if (!process.argv.includes('--tests')) {
  const headers = nodeHeaders();
  const architectures = process.argv.includes('--all') ? ['arm64', 'x64'] : [process.arch];
  architectures.forEach((arch) => {
    if (!['arm64', 'x64'].includes(arch)) throw new Error(`Unsupported architecture: ${arch}`);
    const target = `${arch === 'x64' ? 'x86_64' : 'arm64'}-apple-macosx${minimumMacOS}`;
    const output = join(root, 'prebuilds', `darwin-${arch}`);
    mkdirSync(output, { recursive: true });
    const library = join(output, 'libEislandBrightnessCore.dylib');
    run('xcrun', ['swiftc', '-swift-version', '5', '-O', '-emit-library', '-module-name', 'EislandBrightnessCore',
      '-target', target, ...sources, '-Xlinker', '-install_name', '-Xlinker', '@rpath/libEislandBrightnessCore.dylib', '-o', library]);
    const symbols = execFileSync('nm', ['-gU', library], { encoding: 'utf8' });
    ['get', 'set', 'free'].forEach((name) => {
      if (!symbols.includes(` _brightness_${name}\n`)) throw new Error(`Missing Swift C ABI symbol: brightness_${name}`);
    });
    const addon = join(output, 'brightness.node');
    run('xcrun', ['clang', '-target', target, '-bundle', '-undefined', 'dynamic_lookup', '-DNAPI_VERSION=8',
      '-Wall', '-Wextra', '-Werror', '-I', headers, join(root, 'src', 'addon.c'),
      '-L', output, '-lEislandBrightnessCore', '-Wl,-rpath,@loader_path', '-o', addon]);
    [library, addon].forEach((path) => run('codesign', ['--force', '--sign', '-', path]));
    console.log(`Built darwin-${arch} (macOS ${minimumMacOS}+, Node-API 8).`);
  });
}
const tests = join(root, 'test', 'NativeCoreTests.swift');
if (existsSync(tests)) {
  mkdirSync(join(root, 'build'), { recursive: true });
  run('xcrun', ['swiftc', '-swift-version', '5', '-O', ...sources, tests, '-o', join(root, 'build', 'native-tests')]);
}
