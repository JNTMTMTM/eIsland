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
 * @file release-artifacts.mjs
 * @description 从当前 Cargo 目标目录定位正式 NSIS 产物，流式生成原生更新清单。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, closeSync, existsSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import withoutSigningSecrets from './environment.mjs';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

/** 解析发布参数，拒绝拼写错误，避免上传错误目录。
 * @param argv - 命令行参数。
 * @returns 已解析的选项。
 */
export function releaseOptions(argv) {
  const options = { dryRun: false, minioOnly: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--minio-only') options.minioOnly = true;
    else if (arg === '--skip-legacy-bridge') options.skipLegacyBridge = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (['--target-dir', '--dist', '-d'].includes(arg)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a directory`);
      options[arg === '--target-dir' ? 'targetDir' : 'dist'] = value;
    } else throw new Error(`Unknown release option: ${arg}`);
  }
  if (options.targetDir && options.dist) throw new Error('Use either --target-dir or --dist');
  return options;
}

/** 使用 Cargo 自己的元数据解析配置目录；显式覆盖不需要调用 Cargo。
 * @param root - 仓库根目录。
 * @param options - 发布选项。
 * @param env - 本次环境。
 * @param run - Cargo 进程边界。
 * @returns Cargo 目标目录。
 */
export function cargoTargetDirectory(root, options = {}, env = process.env, run = spawnSync) {
  let target = options.targetDir || env.CARGO_TARGET_DIR;
  if (target) target = isAbsolute(target) ? target : resolve(root, 'src-tauri', target);
  else {
    const result = run('cargo', ['metadata', '--no-deps', '--format-version', '1', '--offline', '--manifest-path', join(root, 'src-tauri/Cargo.toml')], { env, cwd: join(root, 'src-tauri'), encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error('Cannot resolve Cargo target directory; set CARGO_TARGET_DIR or --dist explicitly');
    target = JSON.parse(result.stdout).target_directory;
    if (!target || !isAbsolute(target)) throw new Error('Cargo returned an invalid target directory');
  }
  return target;
}

/** 定位正式安装包目录，兼容旧上传命令的 --dist 参数。
 * @param root - 仓库根目录。
 * @param options - 发布选项。
 * @param env - 本次环境。
 * @param run - Cargo 进程边界。
 * @returns NSIS 目录。
 */
export function installerDirectory(root, options, env, run = spawnSync) {
  return options.dist ? resolve(root, options.dist) : join(cargoTargetDirectory(root, options, env, run), 'release/bundle/nsis');
}

/** 检查版本和产物，并计算真实文件的 SHA-512，不读取整份安装包到内存。
 * @param root - 仓库根目录。
 * @param options - 发布选项。
 * @param env - 发布环境。
 * @param run - Cargo 进程边界。
 * @returns 原生产物信息。
 */
export async function releaseArtifact(root, options, env, run = spawnSync) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const config = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || config.version !== pkg.version) throw new Error('package.json and Tauri versions must match and use a stable x.y.z version');
  const name = `eIsland_${pkg.version}_x64-setup.exe`;
  const file = join(installerDirectory(root, options, env, run), name);
  const info = statSync(file);
  if (!info.isFile() || info.size < 2 || info.size > 2 * 1024 ** 3) throw new Error('Invalid native installer size');
  const fd = openSync(file, 'r'); const magic = Buffer.alloc(2);
  try { readSync(fd, magic, 0, 2, 0); } finally { closeSync(fd); }
  if (magic.toString('ascii') !== 'MZ') throw new Error('Native installer is not a Windows executable');
  const hash = createHash('sha512');
  // eslint-disable-next-line no-restricted-syntax -- 安装包按流计算哈希，避免整文件进入内存。
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const after = statSync(file);
  if (after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw new Error('Installer changed while hashing; finish packaging before uploading');
  const signatureFile = `${file}.sig`;
  if (!existsSync(signatureFile)) throw new Error('Missing Tauri updater signature; run npm run package with the signing identity configured');
  const signatureInfo = statSync(signatureFile);
  if (!signatureInfo.isFile() || signatureInfo.size > 16384) throw new Error('Invalid updater signature file');
  const signature = readFileSync(signatureFile, 'utf8').trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(signature)) throw new Error('Invalid Tauri updater signature encoding');
  const verifier = env.EISLAND_RELEASE_VERIFY_BINARY || join(dirname(dirname(dirname(file))), 'eisland.exe');
  if (!existsSync(verifier)) throw new Error('Matching release verifier is missing; set EISLAND_RELEASE_VERIFY_BINARY to the packaged eisland.exe');
  const verifyEnv = withoutSigningSecrets(env);
  const verified = run(verifier, ['--verify-update-artifact', file, signatureFile], { env: verifyEnv, cwd: root, stdio: 'pipe', windowsHide: true, timeout: 120000 });
  if (verified.error || verified.status !== 0) throw new Error('Updater signature rejected by the packaged application; check the signing identity and matching build');
  const verifiedInfo = statSync(file);
  if (verifiedInfo.size !== info.size || verifiedInfo.mtimeMs !== info.mtimeMs) throw new Error('Installer changed during signature verification');
  const signatureAfter = statSync(signatureFile);
  if (signatureAfter.size !== signatureInfo.size || signatureAfter.mtimeMs !== signatureInfo.mtimeMs || readFileSync(signatureFile, 'utf8').trim() !== signature) throw new Error('Signature changed during verification');
  const notesFile = ['RELEASE_NOTES.md', 'RELEASE_NOTES_SINCE_LAST_TAG.md'].map((name) => join(root, name)).find(existsSync);
  const notes = notesFile ? readFileSync(notesFile, 'utf8') : '';
  return { file, name, notes, signature, signatureFile, verifier, version: pkg.version, size: info.size, sha512: hash.digest('base64'), directory: dirname(dirname(file)) };
}

/** 生成官方格式与旧 Tauri 元数据兼容的绝对 HTTPS 更新清单。
 * @param artifact - 已校验的产物。
 * @param base - 必需的 HTTPS 下载目录。
 * @returns 原生更新清单。
 */
export function nativeManifest(artifact, base) {
  let url;
  if (!artifact.signature) throw new Error('Official updater manifest requires a verified signature');
  if (base) {
    const origin = new URL(`${base.replace(/\/+$/, '')}/`);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) throw new Error('Native release base URL must be a plain HTTPS directory URL');
    url = new URL(encodeURIComponent(artifact.name), origin).toString();
  }
  if (!url) throw new Error('Official updater manifest requires an absolute HTTPS download base');
  return { runtime: 'tauri', version: artifact.version, notes: artifact.notes, pub_date: new Date().toISOString(), platforms: { 'windows-x86_64': { url, signature: artifact.signature, format: 'nsis', size: artifact.size, sha512: artifact.sha512 } } };
}

/** 写入构建目录的发布清单。
 * @param artifact - 原生产物。
 * @param manifest - 更新清单。
 * @returns 写入的清单路径。
 */
export function writeManifest(artifact, manifest) {
  const path = join(artifact.directory, 'tauri-latest.yml');
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  return path;
}
