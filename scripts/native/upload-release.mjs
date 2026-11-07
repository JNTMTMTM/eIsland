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
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import withoutSigningSecrets from './environment.mjs';
import { awsSession, loadEnvFile, required, resolveAws, uploadTargets } from './aws-upload.mjs';
import { nativeManifest, projectRoot, releaseArtifact, releaseOptions, writeManifest } from './release-artifacts.mjs';

/** 校验对象前缀。
 * @param value - 对象前缀。
 * @returns 不带首尾斜线的前缀。
 */
export function objectPrefix(value = 'eisland-update/tauri') {
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
      const parent = new URL('.', previous);
      const directory = parent.pathname.replace(/^\/+|\/+$/g, '');
      manifest = new URL(`${directory && prefix.startsWith(`${directory}/`) ? '/' : ''}${prefix}/latest.json`, previous);
    }
  } else manifest = new URL('https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json');
  if (manifest.protocol !== 'https:' || manifest.username || manifest.password || manifest.search || manifest.hash || !manifest.pathname.endsWith('/latest.json')) throw new Error('Native ESA manifest URL must be a plain HTTPS latest.json URL');
  return { accessKeyId, accessKeySecret, siteId, files: [manifest.toString(), new URL(name, manifest).toString(), new URL(`${name}.sig`, manifest).toString()] };
}

/** 精确刷新清单和安装包。
 * @param plan - 刷新配置。
 */
export async function purgeNativeCache(plan) {
  // eslint-disable-next-line import-x/extensions -- Node 24 直接加载现有 ESA TypeScript 工具。
  const [{ createEsaClient }, module, util] = await Promise.all([import('../esa/esa-env.ts'), import('@alicloud/esa20240910'), import('@alicloud/tea-util')]);
  const sdk = module.PurgeCachesRequest ? module : module.default;
  const helpers = util.RuntimeOptions ? util : util.default;
  const request = new sdk.PurgeCachesRequest({ content: new sdk.PurgeCachesRequestContent({ files: plan.files, purgeAll: false }), type: 'file', siteId: plan.siteId, force: true, edgeComputePurge: true });
  await createEsaClient(plan.accessKeyId, plan.accessKeySecret).purgeCachesWithOptions(request, new helpers.RuntimeOptions({}));
}

/** Compute the public object directory for each mirror without sharing credentials.
 * @param target - Selected storage adapter.
 * @param env - Release configuration.
 * @param prefix - S3 object prefix.
 * @returns Absolute public HTTPS download directory.
 */
export function mirrorBase(target, env, prefix) {
  if (target.provider === 'cos') return env.COS_PUBLIC_BASE_URL || `https://${target.bucket}.cos.${target.region}.myqcloud.com/${prefix}`;
  if (target.provider === 'oss') return env.OSS_PUBLIC_BASE_URL || `https://${target.bucket}.oss-${target.region}.aliyuncs.com/${prefix}`;
  if (target.provider === 'r2') return `${target.publicBase.replace(/\/+$/, '')}/${prefix}`;
  return env.MINIO_PUBLIC_BASE_URL || `${target.endpoint.replace(/\/+$/, '')}/${target.bucket}/${prefix}`;
}

/** Use GitHub only after an explicit opt-in, and only for an existing public release.
 * @param env - Release environment.
 * @param version - Current package version.
 * @returns Optional existing-release adapter.
 */
export function githubTarget(env, version) {
  if (env.EISLAND_GITHUB_RELEASE_UPLOAD !== '1') return null;
  const repository = required(env, 'GITHUB_REPOSITORY');
  const tag = required(env, 'EISLAND_GITHUB_RELEASE_TAG');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || tag !== `v${version}`) throw new Error('GitHub repository or release tag does not match the package version');
  const execute = (run, processEnv, args) => {
    const childEnv = withoutSigningSecrets(processEnv);
    const result = run('gh', args, { env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, timeout: 1800000 });
    if (result.error || result.status !== 0) throw new Error('GitHub existing Release operation failed');
    return result.stdout;
  };
  return {
    repository, tag, base: `https://github.com/${repository}/releases/download/${tag}`,
    preflight(run, processEnv) {
      const visibility = JSON.parse(execute(run, processEnv, ['repo', 'view', repository, '--json', 'isPrivate']));
      if (visibility.isPrivate !== false) throw new Error('GitHub updater assets require a public repository');
      const release = JSON.parse(execute(run, processEnv, ['release', 'view', tag, '--repo', repository, '--json', 'isDraft,isPrerelease,tagName']));
      if (release.isDraft !== false || release.isPrerelease !== false || release.tagName !== tag) throw new Error('GitHub release must already be published with the exact stable version tag');
    },
    upload(run, processEnv, files) { execute(run, processEnv, ['release', 'upload', tag, ...files, '--repo', repository, '--clobber']); },
  };
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
    log('Usage: npm run release:upload-only -- [--dry-run] [--minio-only] [--skip-legacy-bridge] [--target-dir <Cargo target> | --dist <NSIS directory>]');
    return null;
  }
  const root = dependencies.root || projectRoot;
  const env = { ...(dependencies.env || process.env) };
  loadEnvFile(resolve(root, '.env'), env);
  const artifact = await releaseArtifact(root, options, env, dependencies.run);
  const {companion} = dependencies;
  if (companion && companion.version !== artifact.version) throw new Error('Adapter and Tauri versions must match');
  const prefix = objectPrefix(env.EISLAND_TAURI_UPLOAD_PREFIX || 'eisland-update/tauri');
  const legacyManifestKeys = (env.EISLAND_TAURI_LEGACY_UPLOAD_PREFIXES ?? 'tauri').split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(objectPrefix)
    .filter((value) => value !== prefix)
    .map((value) => `${value}/latest.json`);
  const targets = uploadTargets(env, options.minioOnly);
  if (companion && !options.minioOnly && !targets.some((target) => target.provider === 'r2' && target.publicBase?.replace(/\/$/, '') === 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev')) throw new Error('Paired release requires the original Electron R2 update target');
  if (artifact.version === '27.0.2' && !options.minioOnly && !options.skipLegacyBridge && (!targets.some((target) => target.provider === 'r2') || (prefix !== 'tauri' && !legacyManifestKeys.includes('tauri/latest.json')))) throw new Error('Bridge release 27.0.2 requires the existing R2 bucket and tauri/latest.json alias; use --skip-legacy-bridge only after confirming no legacy clients need this feed');
  targets.forEach((target) => nativeManifest(artifact, mirrorBase(target, env, prefix)));
  const purge = options.minioOnly ? null : purgePlan(env, prefix, artifact.name);
  if (companion && purge) {
    const legacy = env.EISLAND_ADAPTER_ESA_MANIFEST_URL || 'https://eisland-server-download-cdn.pyisland.com/eisland-update/latest.yml';
    const url = new URL(legacy);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/latest.yml')) throw new Error('Invalid legacy ESA manifest URL');
    purge.files.push(new URL('tauri-latest.yml', purge.files[0]).href, url.href, ...companion.keys.map((key) => new URL(key, url).href));
  }
  const manifest = nativeManifest(artifact, env.EISLAND_TAURI_RELEASE_BASE_URL || new URL('.', purge?.files[0] || 'https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json').toString());
  const github = githubTarget(env, artifact.version);
  const plan = { manifest, legacyManifestKeys, installer: artifact.file, signature: artifact.signatureFile, github: github ? { repository: github.repository, tag: github.tag } : null, installerKey: `${prefix}/${artifact.name}`, signatureKey: `${prefix}/${artifact.name}.sig`, manifestKey: `${prefix}/latest.json`, targets: targets.map(({ provider, bucket }) => ({ provider, bucket })), purgeUrls: purge?.files || [] };
  if (companion) Object.assign(plan, { adapterVersion: companion.version, adapterInstallers: companion.keys, tauriManifestKey: `${prefix}/tauri-latest.yml`, electronManifestKey: 'latest.yml' });
  log(`Native release ${artifact.version}: ${artifact.size} bytes, SHA-512 ${artifact.sha512}`);
  log(JSON.stringify(plan, null, 2));
  if (options.dryRun) { log('DRY RUN: no AWS command, upload or CDN purge performed.'); return plan; }
  const binary = resolveAws(env, dependencies.run);
  writeManifest(artifact, manifest);
  const stage = mkdtempSync(join(tmpdir(), 'eisland-release-manifests-'));
  const run = dependencies.run || spawnSync;
  const sessions = [];
  try {
    targets.forEach((target) => sessions.push(awsSession(binary, target, env, dependencies.run)));
    if (github) github.preflight(run, env);
    // All selected mirrors and the explicitly selected existing GitHub Release
    // receive both immutable artifacts before any update manifest advertises them.
    sessions.forEach((session) => { session.upload(artifact.file, plan.installerKey); session.upload(artifact.signatureFile, plan.signatureKey); });
    if (companion) {
      sessions.forEach((session) => companion.immutable.forEach((file, index) => {
        session.upload(file, companion.keys[index]);
        session.upload(file, `eisland-update/${companion.keys[index]}`);
      }));
    }
    if (github) github.upload(run, env, [artifact.file, artifact.signatureFile, ...(companion?.immutable || [])]);
    sessions.forEach((session, index) => {
      const target = targets[index];
      const base = mirrorBase(target, env, prefix);
      const file = join(stage, `${target.provider}-latest.json`);
      writeFileSync(file, `${JSON.stringify(nativeManifest(artifact, base), null, 2)}\n`);
      session.upload(file, plan.manifestKey, true);
      if (companion) session.upload(file, plan.tauriManifestKey, true);
      // Previous Tauri defaults fetched /tauri/latest.json; the hybrid alias
      // advertises the same already-uploaded canonical installer and signature.
      legacyManifestKeys.forEach((key) => session.upload(file, key, true));
    });
    if (github) {
      const file = join(stage, 'tauri-latest.json');
      writeFileSync(file, `${JSON.stringify(nativeManifest(artifact, github.base), null, 2)}\n`);
      const nativeFiles = [file];
      if (companion) {
        const named = join(stage, 'tauri-latest.yml');
        writeFileSync(named, `${JSON.stringify(nativeManifest(artifact, github.base), null, 2)}\n`);
        nativeFiles.push(named);
      }
      github.upload(run, env, nativeFiles);
    }
    // 最后更新 Electron 入口，避免旧客户端先收到尚未准备好的迁移目标。
    if (companion) {
      sessions.forEach((session) => {
        session.upload(companion.manifest, 'latest.yml', true);
        session.upload(companion.manifest, 'eisland-update/latest.yml', true);
      });
      if (github) github.upload(run, env, [companion.manifest]);
    }
    if (purge) await (dependencies.purge || purgeNativeCache)(purge);
  } finally { sessions.forEach((session) => session.close()); rmSync(stage, { recursive: true, force: true }); }
  log('Native release uploaded successfully.');
  return plan;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { const { uploadPaired } = await import('./paired-release.mjs'); await uploadPaired(process.argv.slice(2)); }
  catch (error) { console.error(`Native release failed: ${error.message}`); process.exitCode = 1; }
}
