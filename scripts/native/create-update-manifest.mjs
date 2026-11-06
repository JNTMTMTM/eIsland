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
 * @description 为当前 Cargo 目标目录的 NSIS 产物生成 GitHub 原生更新清单。
 * @author 鸡哥
 */
import { join } from 'node:path';
import { nativeManifest, projectRoot, releaseArtifact, releaseOptions, writeManifest } from './release-artifacts.mjs';
import { loadEnvFile } from './aws-upload.mjs';

loadEnvFile(join(projectRoot, '.env'));
const options = releaseOptions(process.argv.slice(2));
if (options.help) console.log('Usage: node scripts/native/create-update-manifest.mjs [--target-dir <Cargo target> | --dist <NSIS directory>]');
else {
  const artifact = await releaseArtifact(projectRoot, options, process.env);
  const base = process.env.EISLAND_TAURI_RELEASE_BASE_URL || 'https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri';
  console.log(`Created native update manifest: ${writeManifest(artifact, nativeManifest(artifact, base))}`);
}
