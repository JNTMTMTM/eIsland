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
 * @file upload-release.mjs
 * @description 发布 Tauri 安装包与原生更新清单，成功后精确刷新 ESA 缓存。
 * @author 鸡哥
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { awsSession, loadEnvFile, required, resolveAws, uploadTargets } from './aws-upload.mjs';
import { nativeManifest, projectRoot, releaseArtifact, releaseOptions, writeManifest } from './release-artifacts.mjs';

/** 校验对象前缀。
 * @param value - 对象前缀。
 * @returns 不带首尾斜线的前缀。
 */
export function objectPrefix(value = 'tauri') {
  const prefix = value.replace(/^\/+|\/+$/g, '');
  if (!/^[a-zA-Z0-9_./-]+$/.test(prefix) || prefix.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Invalid native upload prefix');
  return prefix;
}

/** 从已有 ESA 配置定位此次发布需要刷新的原生对象。
 * @param env - 发布环境。
 * @param prefix - 对象前缀。
 * @param name - 安装包名。
 * @returns 精确刷新配置。
 */
export function purgePlan(env, prefix, name) {
  const accessKeyId = required(env, 'ESA_ACCESS_KEY_ID');
  const accessKeySecret = required(env, 'ESA_ACCESS_KEY_SECRET');
  const siteId = Number(required(env, 'ESA_ZONE_ID'));
  if (!Number.isSafeInteger(siteId) || siteId <= 0) throw new Error('ESA_ZONE_ID must be a positive integer');
  let manifest;
  if (env.EISLAND_TAURI_UPDATE_ESA_URL) manifest = new URL(env.EISLAND_TAURI_UPDATE_ESA_URL);
  else if (env.ESA_PURGE_URL) {
    const previous = new URL(env.ESA_PURGE_URL);
    previous.search = ''; previous.hash = '';
    if (previous.pathname.endsWith(`/${prefix}/latest.json`)) manifest = previous;
    else {
      if (!/\.(?:ya?ml|json)$/i.test(previous.pathname) && !previous.pathname.endsWith('/')) previous.pathname += '/';
      manifest = new URL(`${prefix}/latest.json`, previous);
    }
  } else manifest = new URL('https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json');
  if (manifest.protocol !== 'https:' || manifest.username || manifest.password || manifest.search || manifest.hash || !manifest.pathname.endsWith('/latest.json')) throw new Error('Native ESA manifest URL must be a plain HTTPS latest.json URL');
  return { accessKeyId, accessKeySecret, siteId, files: [manifest.toString(), new URL(name, manifest).toString()] };
}

/** 精确刷新清单和安装包。
 * @param plan - 刷新配置。
 */
async function purgeNativeCache(plan) {
  // eslint-disable-next-line import-x/extensions -- Node 24 直接加载现有 ESA TypeScript 工具。
  const [{ createEsaClient }, module, util] = await Promise.all([import('../esa/esa-env.ts'), import('@alicloud/esa20240910'), import('@alicloud/tea-util')]);
  const sdk = module.PurgeCachesRequest ? module : module.default;
  const helpers = util.RuntimeOptions ? util : util.default;
  const request = new sdk.PurgeCachesRequest({ content: new sdk.PurgeCachesRequestContent({ files: plan.files, purgeAll: false }), type: 'file', siteId: plan.siteId, force: true, edgeComputePurge: true });
  await createEsaClient(plan.accessKeyId, plan.accessKeySecret).purgeCachesWithOptions(request, new helpers.RuntimeOptions({}));
}

/** 发布原生文件；测试仅替换外部进程和 CDN 边界。
 * @param argv - 命令行参数。
 * @param dependencies - 根目录、环境和外部边界。
 * @returns 发布计划。
 */
export async function uploadRelease(argv = [], dependencies = {}) {
  const options = releaseOptions(argv);
  const log = dependencies.log || console.log;
  if (options.help) {
    log('Usage: npm run release:upload-only -- [--dry-run] [--minio-only] [--target-dir <Cargo target> | --dist <NSIS directory>]');
    return null;
  }
  const root = dependencies.root || projectRoot;
  const env = { ...(dependencies.env || process.env) };
  loadEnvFile(resolve(root, '.env'), env);
  const artifact = await releaseArtifact(root, options, env, dependencies.run);
  const prefix = objectPrefix(env.EISLAND_TAURI_UPLOAD_PREFIX || 'tauri');
  const targets = uploadTargets(env, options.minioOnly);
  const purge = options.minioOnly ? null : purgePlan(env, prefix, artifact.name);
  const manifest = nativeManifest(artifact, env.EISLAND_TAURI_RELEASE_BASE_URL);
  const plan = { manifest, installer: artifact.file, installerKey: `${prefix}/${artifact.name}`, manifestKey: `${prefix}/latest.json`, targets: targets.map(({ provider, bucket }) => ({ provider, bucket })), purgeUrls: purge?.files || [] };
  log(`Native release ${artifact.version}: ${artifact.size} bytes, SHA-512 ${artifact.sha512}`);
  log(JSON.stringify(plan, null, 2));
  if (options.dryRun) { log('DRY RUN: no AWS command, upload or CDN purge performed.'); return plan; }
  const binary = resolveAws(env, dependencies.run);
  const manifestFile = writeManifest(artifact, manifest);
  const sessions = [];
  try {
    targets.forEach((target) => sessions.push(awsSession(binary, target, env, dependencies.run)));
    // Every selected mirror receives the installer before any latest.json advertises it.
    sessions.forEach((session) => session.upload(artifact.file, plan.installerKey));
    sessions.forEach((session) => session.upload(manifestFile, plan.manifestKey, true));
    if (purge) await (dependencies.purge || purgeNativeCache)(purge);
  } finally { sessions.forEach((session) => session.close()); }
  log('Native release uploaded successfully.');
  return plan;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await uploadRelease(process.argv.slice(2)); }
  catch (error) { console.error(`Native release failed: ${error.message}`); process.exitCode = 1; }
}
