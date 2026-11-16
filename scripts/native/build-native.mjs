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

/** @file build-native.mjs
 * @description 准备打包所需的视频工具并清理已退役的本地构建产物。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, realpathSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareFfprobe } from './prepare-ffprobe.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (process.platform === 'win32') {
  const architecture = process.env.TAURI_ENV_ARCH ?? process.arch;
  const rid = { x86_64: 'win-x64', x64: 'win-x64', aarch64: 'win-arm64', arm64: 'win-arm64', x86: 'win-x86', ia32: 'win-x86' }[architecture];
  if (!rid) throw new Error(`Unsupported native architecture: ${architecture}`);
  const nativeResources = resolve(root, 'src-tauri/resources/native');
  // Tauri bundles the resource tree recursively, including files from older local builds.
  ['win-x64', 'win-arm64', 'win-x86'].forEach((legacyRid) => {
    ['volume', 'brightness', 'temperature', 'screenshot', 'smtc'].forEach((component) => {
      const legacy = resolve(nativeResources, legacyRid, component);
      if (!existsSync(legacy)) return;
      const expected = resolve(realpathSync(root), 'src-tauri/resources/native', legacyRid, component);
      if (realpathSync(legacy).toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`Refusing to remove redirected native resource: ${legacy}`);
      }
      rmSync(legacy, { recursive: true });
    });
  });
  const ffmpeg = resolve(root, 'src-tauri/resources/native/ffmpeg');
  mkdirSync(ffmpeg, { recursive: true });
  const ffmpegBinary = createRequire(import.meta.url)('ffmpeg-static');
  if (!ffmpegBinary) throw new Error('FFmpeg is unavailable for this platform');
  if (!existsSync(ffmpegBinary)) {
    const installed = spawnSync(process.execPath, [resolve(root, 'node_modules/ffmpeg-static/install.js')], { cwd: root, stdio: 'inherit', windowsHide: true });
    if (installed.error || installed.status !== 0 || !existsSync(ffmpegBinary)) throw new Error('Native FFmpeg preparation failed');
  }
  if (resolve(ffmpegBinary).toLowerCase() !== resolve(ffmpeg, 'ffmpeg.exe').toLowerCase()) copyFileSync(ffmpegBinary, resolve(ffmpeg, 'ffmpeg.exe'));
  ['LICENSE', 'README'].forEach((suffix) => {
    if (existsSync(`${ffmpegBinary}.${suffix}`)) copyFileSync(`${ffmpegBinary}.${suffix}`, resolve(ffmpeg, `ffmpeg.${suffix}`));
  });
  await prepareFfprobe({ root, architecture, ffmpeg: ffmpegBinary });
  console.log(`Tauri native resources prepared: ${rid}`);
}
