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
 * @file create-update-manifest.mjs
 * @description 为 Tauri NSIS 产物生成独立更新清单，仅写入本地构建目录，不执行发布。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const expectedName = `eIsland_${pkg.version}_x64-setup.exe`;
const candidates = globSync(`src-tauri/target/release/bundle/nsis/${expectedName}`, { cwd: root });
if (candidates.length !== 1) throw new Error(`Expected one native NSIS installer named ${expectedName}`);
const installer = resolve(root, candidates[0]);
const bytes = readFileSync(installer);
if (bytes.length < 2 || bytes.subarray(0, 2).toString('ascii') !== 'MZ') throw new Error('Native installer is not a Windows executable');
const repository = process.env.GITHUB_REPOSITORY || 'JNTMTMTM/eIsland';
const reference = process.env.GITHUB_REF_NAME || `v${pkg.version}`;
const base = process.env.EISLAND_TAURI_RELEASE_BASE_URL || `https://github.com/${repository}/releases/download/${reference}`;
const url = new URL(`${base.replace(/\/+$/, '')}/${encodeURIComponent(basename(installer))}`);
if (url.protocol !== 'https:') throw new Error('Native release URL must use HTTPS');
const notesPath = resolve(root, 'RELEASE_NOTES.md');
let notes = '';
try { notes = readFileSync(notesPath, 'utf8'); } catch { /* 本地构建允许没有发布说明。 */ }
const manifest = {
  notes, runtime: 'tauri', version: pkg.version,
  platforms: {
    'windows-x86_64': { format: 'nsis', url: url.toString(), size: bytes.length, sha512: createHash('sha512').update(bytes).digest('base64') },
  },
};
const destination = resolve(root, 'src-tauri/target/release/bundle/tauri-latest.json');
writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Created native update manifest: ${destination}`);
