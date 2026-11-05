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
 * @file aws-upload.mjs
 * @description 复用 AWS CLI 的 COS、OSS、MinIO 上传参数，隔离本次发布的 AWS 配置。
 * @author 鸡哥
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import withoutSigningSecrets from './environment.mjs';

/** 读取原有 .env，已有环境变量保持优先。
 * @param file - 环境文件路径。
 * @param env - 当前发布进程的环境。
 */
export function loadEnvFile(file, env = process.env) {
  if (!existsSync(file)) return;
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((raw) => {
    const line = raw.trim(); const split = line.indexOf('=');
    if (!line || line.startsWith('#') || split <= 0) return;
    const key = line.slice(0, split).trim(); let value = line.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (env[key] === undefined) Object.assign(env, { [key]: value });
  });
}

/** 校验并返回环境变量，不输出凭据内容。
 * @param env - 发布环境。
 * @param name - 变量名称。
 * @returns 非空变量值。
 */
export function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

/** 沿用原有 COS/OSS 必选、MinIO 可选的目标配置。
 * @param env - 发布环境。
 * @param minioOnly - 仅使用 MinIO。
 * @returns 已校验的上传目标。
 */
export function uploadTargets(env, minioOnly = false) {
  const targets = minioOnly ? [] : [
    { provider: 'cos', endpoint: `https://cos.${required(env, 'COS_REGION')}.myqcloud.com`, region: required(env, 'COS_REGION'), bucket: required(env, 'COS_BUCKET_NAME'), accessKeyId: required(env, 'COS_SECRET_ID'), secretAccessKey: required(env, 'COS_SECRET_KEY') },
    { provider: 'oss', endpoint: `https://oss-${required(env, 'OSS_REGION')}.aliyuncs.com`, region: required(env, 'OSS_REGION'), bucket: required(env, 'OSS_BUCKET_NAME'), accessKeyId: required(env, 'OSS_ACCESS_KEY_ID'), secretAccessKey: required(env, 'OSS_ACCESS_KEY_SECRET') },
  ];
  const r2Keys = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_BASE_URL'];
  if (!minioOnly && r2Keys.some((key) => env[key]?.trim())) {
    r2Keys.forEach((key) => required(env, key));
    targets.push({ provider: 'r2', endpoint: env.R2_ENDPOINT.trim(), region: 'auto', bucket: env.R2_BUCKET_NAME.trim(), accessKeyId: env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim(), publicBase: env.R2_PUBLIC_BASE_URL.trim() });
  }
  const minioKeys = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET'];
  if (minioOnly || minioKeys.some((key) => env[key]?.trim())) {
    minioKeys.forEach((key) => required(env, key));
    targets.push({ provider: 'minio', endpoint: env.MINIO_ENDPOINT.trim(), region: env.MINIO_REGION?.trim() || 'us-east-1', bucket: env.MINIO_BUCKET.trim(), accessKeyId: env.MINIO_ACCESS_KEY.trim(), secretAccessKey: env.MINIO_SECRET_KEY.trim() });
  }
  targets.forEach((target) => {
    const url = new URL(target.endpoint);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid S3 endpoint');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(target.bucket)) throw new Error('Invalid S3 bucket name');
  });
  return targets;
}

/** 查找 AWS CLI，失败时不尝试任何上传。
 * @param env - 发布环境。
 * @param run - 进程边界，可在离线测试中替换。
 * @returns AWS 可执行文件。
 */
export function resolveAws(env, run = spawnSync) {
  const defaults = process.platform === 'win32' ? ['aws.exe', 'aws'] : ['aws'];
  const candidates = env.AWS_CLI_PATH ? [resolve(env.AWS_CLI_PATH)] : defaults;
  const binary = candidates.find((candidate) => {
    const result = run(candidate, ['--version'], { env, stdio: 'ignore', windowsHide: true, timeout: 10000 });
    return !result.error && result.status === 0;
  });
  if (!binary) throw new Error('AWS CLI v2 not found in PATH; install aws or set AWS_CLI_PATH');
  return binary;
}

/** 创建隔离的 AWS 会话，复用原有 addressing/checksum/multipart 参数。
 * @param binary - AWS CLI 路径。
 * @param target - 存储目标。
 * @param sourceEnv - 发布进程环境。
 * @param run - 可替换的进程边界。
 * @returns 上传对象与释放本次临时配置的方法。
 */
export function awsSession(binary, target, sourceEnv, run = spawnSync) {
  const directory = mkdtempSync(join(tmpdir(), 'eisland-aws-release-'));
  const env = { ...withoutSigningSecrets(sourceEnv), AWS_CONFIG_FILE: join(directory, 'config'), AWS_SHARED_CREDENTIALS_FILE: join(directory, 'credentials'), AWS_ACCESS_KEY_ID: target.accessKeyId, AWS_SECRET_ACCESS_KEY: target.secretAccessKey, AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED', AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED', AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off', AWS_EC2_METADATA_DISABLED: 'true' };
  delete env.AWS_PROFILE; delete env.AWS_DEFAULT_PROFILE; delete env.AWS_SESSION_TOKEN; delete env.AWS_SECURITY_TOKEN;
  writeFileSync(env.AWS_CONFIG_FILE, '', { mode: 0o600 }); writeFileSync(env.AWS_SHARED_CREDENTIALS_FILE, '', { mode: 0o600 });
  const close = () => rmSync(directory, { recursive: true, force: true });
  const execute = (args) => {
    const result = run(binary, args, { env, stdio: 'inherit', windowsHide: true, timeout: 1800000 });
    if (result.error || result.status !== 0) throw new Error(`AWS ${target.provider} command failed${result.status === null ? ' (terminated)' : ` (exit ${result.status})`}`);
  };
  try {
    const config = { 's3.addressing_style': ['minio', 'r2'].includes(target.provider) ? 'path' : 'virtual', 's3.payload_signing_enabled': 'false', 's3.multipart_threshold': target.provider === 'minio' ? '8MB' : '5GB', 's3.multipart_chunksize': '8MB', request_checksum_calculation: 'when_required', response_checksum_validation: 'when_required' };
    Object.entries(config).forEach(([name, value]) => execute(['configure', 'set', `default.${name}`, value]));
  } catch (error) { close(); throw error; }
  return {
    close,
    upload(file, key, metadata = false) {
      let contentType = file.endsWith('.sig') ? 'text/plain; charset=utf-8' : 'application/vnd.microsoft.portable-executable';
      if (metadata) contentType = 'application/json';
      execute(['s3', 'cp', file, `s3://${target.bucket}/${key}`, '--endpoint-url', target.endpoint, '--region', target.region, '--content-type', contentType, '--cache-control', metadata ? 'no-cache, no-store, must-revalidate' : 'public, max-age=86400']);
    },
  };
}
