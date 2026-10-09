/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file build.mjs
 * @description 使用 Xcode 工具链构建 Swift、Node-API 与媒体桥接预编译资源。
 * @author 鸡哥
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'darwin') throw new Error('Build requires macOS and Xcode Command Line Tools.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const minimumMacOS = '13.0';
const upstream = join(root, 'vendor', 'mediaremote-adapter');

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

/**
 * 收集媒体桥接的 Objective-C 源码。
 * @param path - 上游源码目录。
 * @returns 需编译的 Objective-C 文件。
 */
function objectiveCSources(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const target = join(path, entry.name);
    if (entry.isDirectory()) return objectiveCSources(target);
    return entry.name.endsWith('.m') && !target.includes(`${join('src', 'test')}/`) ? [target] : [];
  });
}

const headers = nodeHeaders();
const architectures = process.argv.includes('--all') ? ['arm64', 'x64'] : [process.arch];
architectures.forEach((arch) => {
  if (!['arm64', 'x64'].includes(arch)) throw new Error(`Unsupported architecture: ${arch}`);
  const appleArch = arch === 'x64' ? 'x86_64' : 'arm64';
  const target = `${appleArch}-apple-macosx${minimumMacOS}`;
  const output = join(root, 'prebuilds', `darwin-${arch}`);
  const framework = join(output, 'MediaRemoteAdapter.framework');
  mkdirSync(framework, { recursive: true });

  run('xcrun', ['clang', '-dynamiclib', '-target', target, '-fobjc-arc', '-fvisibility=default',
    '-I', join(upstream, 'include'), '-I', join(upstream, 'src'),
    ...objectiveCSources(join(upstream, 'src')), '-framework', 'Foundation', '-framework', 'AppKit',
    '-framework', 'UniformTypeIdentifiers', '-Wl,-install_name,@rpath/MediaRemoteAdapter.framework/MediaRemoteAdapter',
    '-o', join(framework, 'MediaRemoteAdapter')]);
  writeFileSync(join(framework, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.eisland.MediaRemoteAdapter</string>
<key>CFBundleExecutable</key><string>MediaRemoteAdapter</string>
<key>CFBundlePackageType</key><string>FMWK</string>
<key>CFBundleVersion</key><string>0.1.0</string>
</dict></plist>
`);
  copyFileSync(join(upstream, 'bin', 'mediaremote-adapter.pl'), join(output, 'mediaremote-adapter.pl'));
  copyFileSync(join(upstream, 'LICENSE'), join(output, 'MediaRemoteAdapter-LICENSE'));
  run('xcrun', ['swiftc', '-swift-version', '5', '-O', '-emit-library', '-module-name', 'EislandMediaCore',
    '-target', target, join(root, 'src', 'ProcessRunner.swift'), join(root, 'src', 'MediaCore.swift'),
    '-Xlinker', '-install_name', '-Xlinker', '@rpath/libEislandMediaCore.dylib',
    '-o', join(output, 'libEislandMediaCore.dylib')]);
  // Node 符号需要 dynamic_lookup；先检查 Swift C ABI，避免其缺失被链接器掩盖。
  const symbols = execFileSync('nm', ['-gU', join(output, 'libEislandMediaCore.dylib')], { encoding: 'utf8' });
  ['create', 'retain', 'release', 'close', 'start', 'stop', 'snapshot', 'request', 'free'].forEach((name) => {
    if (!symbols.includes(` _media_${name}\n`)) throw new Error(`Missing Swift C ABI symbol: media_${name}`);
  });
  run('xcrun', ['clang', '-target', target, '-bundle', '-undefined', 'dynamic_lookup', '-DNAPI_VERSION=8',
    '-Wall', '-Wextra', '-Werror', '-I', headers, join(root, 'src', 'addon.c'),
    '-L', output, '-lEislandMediaCore', '-Wl,-rpath,@loader_path', '-o', join(output, 'media.node')]);
  [framework, join(output, 'libEislandMediaCore.dylib'), join(output, 'media.node')].forEach((path) => {
    run('codesign', ['--force', '--sign', '-', path]);
  });
  console.log(`Built darwin-${arch} (macOS ${minimumMacOS}+, Node-API 8).`);
});
