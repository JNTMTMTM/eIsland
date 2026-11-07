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
 * @file paired-release.mjs
 * @description 同版本构建并校验 Tauri 与 Electron 迁移助手，交给同一发布流程。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adapterArtifacts } from '../../temp/app/scripts/upload.mjs';
import { requirePublicKey } from '../../temp/app/scripts/config.mjs';
import { loadEnvFile, required } from './aws-upload.mjs';
import withoutSigningSecrets from './environment.mjs';
import packageRelease from './package-release.mjs';
import { projectRoot, releaseOptions } from './release-artifacts.mjs';
import { uploadRelease } from './upload-release.mjs';

/** 校验助手身份和签名信任配置，产物不完整时不能开始上传。
 * @param root - 仓库根目录。
 * @param env - 本次公开配置。
 * @returns 已校验的助手发布文件。
 */
export async function pairedAdapter(root, env) {
  const {version} = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const key = required(env, 'TAURI_UPDATER_PUBLIC_KEY');
  requirePublicKey(key);
  const directory = join(root, 'temp/app/dist');
  const artifacts = await adapterArtifacts(directory);
  const built = JSON.parse(readFileSync(join(directory, 'adapter-build.json'), 'utf8'));
  if (artifacts.version !== version || built.version !== version || built.appId !== 'com.eisland.app' || built.publicKey !== key || built.sha512 !== artifacts.sha512) throw new Error('Adapter build identity, version or public key does not match Tauri; run npm run package');
  return artifacts;
}

/** 一次构建两套软件；私钥仅传给 Tauri 签名构建，助手只取得公钥。
 * @param dependencies - 可注入的本地构建边界。
 * @returns 两套经过校验的构建产物。
 */
export async function packagePaired(dependencies = {}) {
  const root = dependencies.root || projectRoot;
  const env = { ...(dependencies.env || process.env) };
  loadEnvFile(join(root, '.env'), env);
  const result = await (dependencies.packageNative || packageRelease)({ root, env, run: dependencies.run });
  const run = dependencies.run || spawnSync;
  const npm = env.npm_execpath;
  if (!npm) throw new Error('Run packaging through npm run package');
  const built = run(process.execPath, [npm, 'run', 'package'], { cwd: join(root, 'temp/app'), env: withoutSigningSecrets(env), stdio: 'inherit', windowsHide: true });
  if (built.error || built.status !== 0) throw new Error('Adapter packaging failed; no upload was attempted');
  const companion = await pairedAdapter(root, env);
  return { companion, ...result };
}

/** 两套产物先校验、再上传文件，最后发布各自清单；dry-run 不接触远端。
 * @param argv - 原有发布参数。
 * @param dependencies - 离线测试边界。
 * @returns 同一版本的联合发布计划。
 */
export async function uploadPaired(argv = [], dependencies = {}) {
  if (releaseOptions(argv).help) return uploadRelease(argv, dependencies);
  const root = dependencies.root || projectRoot;
  const env = { ...(dependencies.env || process.env) };
  loadEnvFile(join(root, '.env'), env);
  const companion = await pairedAdapter(root, env);
  return uploadRelease(argv, { root, env, companion, run: dependencies.run, purge: dependencies.purge, log: dependencies.log });
}
