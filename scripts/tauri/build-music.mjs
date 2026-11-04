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
 * @file build-music.mjs
 * @description 为 Tauri 打包既有音乐服务和独立 Node 运行时，不携带 Electron。
 * @author 鸡哥
 */
import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const architecture = { x86_64: 'x64', aarch64: 'arm64', x86: 'ia32' }[process.env.TAURI_ENV_ARCH] ?? process.env.TAURI_ENV_ARCH ?? process.arch;
if (architecture !== process.arch) throw new Error('Build the music runtime with Node matching the Tauri target architecture');
const output = resolve(root, 'src-tauri/resources/music');
mkdirSync(output, { recursive: true });
const options = {
  absWorkingDir: root, bundle: true, platform: 'node', target: 'node24', format: 'cjs',
  alias: { electron: resolve(root, 'src/tauri/music/electron-host.cjs') },
};
buildSync({ ...options, entryPoints: ['src/tauri/music/entry.cjs'], outfile: resolve(output, 'entry.cjs') });
buildSync({ ...options, entryPoints: ['resources/qishui-qr-login.js'], outfile: resolve(output, 'qishui-qr-login.js') });
cpSync(resolve(root, 'resources/qishui-auth-v6'), resolve(output, 'qishui-auth-v6'), { recursive: true });
copyFileSync(process.execPath, resolve(output, process.platform === 'win32' ? 'node.exe' : 'node'));
copyFileSync(resolve(dirname(process.execPath), 'LICENSE'), resolve(output, 'NODE-LICENSE'));
