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
 * @file package.mjs
 * @description 单独构建迁移助手；正式打包缺少生产公钥时直接失败，不产生可误发的清单。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import withoutSigningSecrets from '../../../scripts/native/environment.mjs';
import { publicKey, requirePublicKey } from './config.mjs';
import { adapterArtifacts } from './upload.mjs';

const preview = process.argv.includes('--preview');
if (process.argv.slice(2).some((arg) => arg !== '--preview')) throw new Error('Unknown package option');
const key = publicKey();
if (!preview) requirePublicKey(key);
const env = withoutSigningSecrets(process.env);
env.EISLAND_ADAPTER_PREVIEW = preview ? '1' : '0';
const require = createRequire(import.meta.url);
[[process.env.npm_execpath, 'run', 'build'], [require.resolve('electron-builder/cli.js'), '--config', preview ? 'electron-builder.preview.config.mjs' : 'electron-builder.config.mjs', '--win', 'nsis', 'portable', '--publish', 'never']].forEach((args) => {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Adapter package failed');
});
if (!preview) {
  const artifacts = await adapterArtifacts('dist');
  await writeFile('dist/adapter-build.json', JSON.stringify({ version: '27.0.2', appId: 'com.eisland.app', publicKey: key, sha512: artifacts.sha512 }, null, 2), { mode: 0o600 });
}
