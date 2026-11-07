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
 * @file upload.mjs
 * @description 旧 Electron 两跳发布：预检真实 Tauri 目标，先上传不可变文件，最后发布旧版 latest.yml。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from 'js-yaml';
import { awsSession, loadEnvFile, resolveAws, uploadTargets } from '../../../scripts/native/aws-upload.mjs';
import { purgeNativeCache } from '../../../scripts/native/upload-release.mjs';
import withoutSigningSecrets from '../../../scripts/native/environment.mjs';
import { publicKey, requirePublicKey } from './config.mjs';

/** 从已构建 NSIS 元数据生成发布计划，不能把 portable 当作更新器目标。
 * @param directory - 适配器产物目录。
 * @returns 上传顺序与已核对元数据。
 */
export async function adapterArtifacts(directory) {
  const manifest = join(directory, 'latest.yml');
  const metadata = load(readFileSync(manifest, 'utf8'));
  const name = 'eIsland-27.0.2-Setup.exe';
  if (metadata?.version !== '27.0.2' || metadata.path !== name || metadata.files?.length !== 1 || metadata.files[0].url !== name) throw new Error('Expected legacy Electron 27.0.2 NSIS manifest');
  const file = join(directory, name);
  const hash = createHash('sha512'); let size = 0;
  await new Promise((resolveRead, reject) => {
    const input = createReadStream(file);
    input.on('data', (chunk) => { size += chunk.length; hash.update(chunk); });
    input.once('error', reject);
    input.once('end', resolveRead);
  });
  const digest = hash.digest('base64');
  if (!size || metadata.sha512 !== digest || metadata.files[0].sha512 !== digest || metadata.files[0].size !== size) throw new Error('Adapter artifact hash or size mismatch');
  const blockmap = `${file}.blockmap`;
  // 读取一次确认所有必需产物在触碰任何远端前均已就绪。
  readFileSync(blockmap);
  return { manifest, sha512: digest, immutable: [file, blockmap], keys: [name, `${name}.blockmap`] };
}

/** 上传前用适配器内置的实际信任配置完整下载并验证目标，避免把用户困在适配器版本。
 * @param address - 已公开的 Tauri 官方清单。
 * @param key - 构建时公开密钥。
 * @returns 已验证的公开 Tauri 版本。
 */
export async function verifyPublishedTarget(address, key) {
  // eslint-disable-next-line import-x/extensions -- Node 需要指向已构建的 CommonJS 文件。
  const { ReleaseService, verifyInstaller, BUILT_PUBLIC_KEY } = await import('../out/main/publisher.js');
  if (BUILT_PUBLIC_KEY !== key) throw new Error('Rebuild adapter with the selected production public key');
  const directory = await mkdtemp(join(tmpdir(), 'eisland-adapter-preflight-'));
  try {
    const signal = AbortSignal.timeout(30 * 60 * 1000);
    const client = new ReleaseService();
    const release = await client.manifest(address, signal);
    const file = join(directory, 'setup.exe');
    await client.download(release, file, signal, () => {});
    await verifyInstaller(resolve('native/verifier/target/release/eisland-update-verifier.exe'), key, release, file, signal);
    return release.version;
  } finally { await rm(directory, { recursive: true, force: true }); }
}

/** 复用原有 AWS CLI 会话和 ESA 精确清缓存，不调用 GitHub 发布 API。
 * @param argv - 仅接受 --dry-run。
 * @param dependencies - 离线测试边界。
 * @returns 不含凭据的上传计划。
 */
export async function uploadAdapter(argv = [], dependencies = {}) {
  if (argv.some((arg) => arg !== '--dry-run')) throw new Error('Only --dry-run is supported');
  const env = { ...(dependencies.env || process.env) };
  if (!dependencies.env) loadEnvFile(resolve('../../.env'), env);
  const key = publicKey(env); requirePublicKey(key);
  const artifacts = await adapterArtifacts(dependencies.directory || resolve('dist'));
  const built = JSON.parse(readFileSync(join(dependencies.directory || resolve('dist'), 'adapter-build.json'), 'utf8'));
  if (built.version !== '27.0.2' || built.appId !== 'com.eisland.app' || built.publicKey !== key || built.sha512 !== artifacts.sha512) throw new Error('Adapter build identity, public key or installer does not match; run package again');
  const targets = (dependencies.targets || uploadTargets(env)).filter((target) => target.provider !== 'minio');
  if (!targets.some((target) => target.provider === 'r2' && target.publicBase?.replace(/\/$/, '') === 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev')) throw new Error('The original Electron R2 update target is required');
  const plan = { version: '27.0.2', mirrors: targets.map((target) => target.provider), installers: artifacts.keys, manifest: 'latest.yml' };
  const purge = { accessKeyId: env.ESA_ACCESS_KEY_ID, accessKeySecret: env.ESA_ACCESS_KEY_SECRET, siteId: Number(env.ESA_ZONE_ID), files: ['https://eisland-server-download-cdn.pyisland.com/eisland-update/latest.yml', ...artifacts.keys.map((name) => `https://eisland-server-download-cdn.pyisland.com/eisland-update/${name}`)] };
  // 旧客户端缓存入口可能不同，必须明确配置，不复用指向 Tauri JSON 的 URL。
  if (env.EISLAND_ADAPTER_ESA_MANIFEST_URL) {
    const url = new URL(env.EISLAND_ADAPTER_ESA_MANIFEST_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/latest.yml')) throw new Error('Invalid legacy ESA manifest URL');
    purge.files = [url.href, ...artifacts.keys.map((name) => new URL(name, url).href)];
  }
  if (!purge.accessKeyId || !purge.accessKeySecret || !Number.isSafeInteger(purge.siteId) || purge.siteId <= 0) throw new Error('Configure ESA_ACCESS_KEY_ID, ESA_ACCESS_KEY_SECRET and ESA_ZONE_ID for legacy cache purge');
  if (argv.includes('--dry-run')) { console.log(JSON.stringify(plan)); console.log('DRY RUN: no upload, CDN purge or online target verification performed'); return plan; }
  // 全量验证先于任何上传；主程序内置 ESA、R2 两个源均必须已经能提供正式目标。
  await (dependencies.preflight || verifyPublishedTarget)('https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json', key);
  await (dependencies.preflight || verifyPublishedTarget)('https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev/eisland-update/tauri/latest.json', key);
  const binary = (dependencies.resolveAws || resolveAws)(withoutSigningSecrets(env));
  const sessions = [];
  try {
    targets.forEach((target) => sessions.push((dependencies.session || awsSession)(binary, target, env)));
    sessions.forEach((session) => artifacts.immutable.forEach((file, index) => session.upload(file, artifacts.keys[index])));
    sessions.forEach((session) => session.upload(artifacts.manifest, 'latest.yml', true));
    await (dependencies.purge || purgeNativeCache)(purge);
  } finally { sessions.forEach((session) => session.close()); }
  console.log('Adapter 27.0.2 uploaded; legacy manifests published after all installer uploads');
  return plan;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await uploadAdapter(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
