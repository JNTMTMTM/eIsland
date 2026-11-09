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
 * @file package-release.mjs
 * @description 构建原生插件、NSIS 与官方更新签名，并验证当前安装包和签名身份。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile, required } from './aws-upload.mjs';
import { nativeManifest, projectRoot, releaseArtifact, writeManifest } from './release-artifacts.mjs';

/** Package locally using the official Tauri signer; no upload or deployment boundary exists.
 * @param dependencies - Injectable local build boundaries.
 * @returns Verified installer, signature and manifest paths.
 */
export default async function packageRelease(dependencies = {}) {
  const root = dependencies.root || projectRoot;
  const env = { ...(dependencies.env || process.env) }; loadEnvFile(join(root, '.env'), env);
  required(env, 'TAURI_SIGNING_PRIVATE_KEY');
  const pubkey = required(env, 'TAURI_UPDATER_PUBLIC_KEY');
  const run = dependencies.run || spawnSync;
  const config = JSON.parse(env.TAURI_CONFIG || '{}');
  const updater = { ...config.plugins?.updater }; delete updater.pubkey;
  config.plugins = { ...config.plugins, updater: { pubkey, ...updater, requireSignedVersion: true } };
  config.bundle = { ...config.bundle, createUpdaterArtifacts: true };
  env.TAURI_CONFIG = JSON.stringify(config);
  const execute = (args) => {
    const result = run(process.execPath, args, { env, cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error('Local native packaging failed; no upload was attempted');
  };
  const cli = JSON.parse(readFileSync(join(root, 'node_modules/@tauri-apps/cli/package.json'), 'utf8'));
  const version = cli.version.split('.').map(Number);
  if (!Number.isInteger(version[0]) || version[0] < 2 || (version[0] === 2 && (version[1] < 12 || (version[1] === 12 && version[2] < 4)))) throw new Error('Tauri CLI 2.12.4 or newer is required for signed-version binding');
  // Same native resource implementation as npm run plugins:build, exactly once.
  execute([join(root, 'scripts/native/build-native.mjs')]);
  const bin = typeof cli.bin === 'string' ? cli.bin : cli.bin.tauri;
  // The CLI bundler reads --config itself; TAURI_CONFIG alone only reaches Cargo.
  execute([join(root, 'node_modules/@tauri-apps/cli', bin), 'build', '--bundles', 'nsis', '--config', JSON.stringify(config)]);
  const artifact = await releaseArtifact(root, {}, env, run);
  const manifest = writeManifest(artifact, nativeManifest(artifact, env.EISLAND_TAURI_RELEASE_BASE_URL || 'https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri'));
  return { manifest, installer: artifact.file, signature: artifact.signatureFile };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  // 先完成当前模块加载，避免 paired-release 回引此模块时等待顶层 await。
  (async () => {
    try {
      const { packagePaired } = await import('./paired-release.mjs');
      const result = await packagePaired();
      console.log(`Paired signed packages ready: ${result.installer}`);
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  })();
}
