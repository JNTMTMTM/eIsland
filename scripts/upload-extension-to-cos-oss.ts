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
 * This program distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file upload-extension-to-cos-oss.ts
 * @description 单独上传扩展 zip 到腾讯 COS、阿里云 OSS 与自建 MinIO
 * @author 鸡哥
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as ESA20240910 from '@alicloud/esa20240910';
import * as OpenApi from '@alicloud/openapi-client';
import * as Util from '@alicloud/tea-util';

type Provider = 'cos' | 'oss' | 'minio';

interface UploadTarget {
  provider: Provider;
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const ANSI = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
};

function green(text: string): string {
  return `${ANSI.green}${text}${ANSI.reset}`;
}

function red(text: string): string {
  return `${ANSI.red}${text}${ANSI.reset}`;
}

function resolveAwsExecutable(): string {
  const candidates = process.platform === 'win32'
    ? ['aws.exe', 'aws.cmd', 'aws']
    : ['aws'];

  for (const cmd of candidates) {
    const result = spawnSync(cmd, ['--version'], { stdio: 'ignore', env: process.env });
    if (!result.error && (result.status === 0 || result.status === null)) {
      return cmd;
    }
  }

  throw new Error('AWS CLI not found in PATH. Please install AWS CLI v2 and ensure command `aws` is available.');
}

function stripWrappedQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(envFilePath = '.env'): void {
  const absolutePath = resolve(process.cwd(), envFilePath);
  if (!existsSync(absolutePath)) return;

  const content = readFileSync(absolutePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index <= 0) continue;

    const key = line.slice(0, index).trim();
    const rawValue = line.slice(index + 1).trim();
    if (!key) continue;

    if (process.env[key] !== undefined) continue;
    process.env[key] = stripWrappedQuotes(rawValue);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/** 解析 CLI 参数 */
function parseArgv(argv: string[]): {
  dir: string;
  files: string[];
  minioOnly: boolean;
} {
  let dir = 'dist/extensions';
  const files: string[] = [];
  let minioOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--dir' || arg === '-d') && argv[i + 1]) {
      dir = argv[++i];
    } else if ((arg === '--file' || arg === '-f') && argv[i + 1]) {
      files.push(argv[++i]);
    } else if (arg === '--minio-only') {
      minioOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    }
  }

  return { dir, files, minioOnly };
}

function printHelpAndExit(code: number): never {
  console.log(
    [
      'Usage: node --experimental-strip-types scripts/upload-extension-to-cos-oss.ts [options]',
      '',
      'Options:',
      '  -d, --dir <dir>       Extension zip directory (default: dist/extensions)',
      '  -f, --file <path>     Upload a specific zip file (can be repeated)',
      '  --minio_only           Only upload to MinIO, skip COS/OSS',
      '  -h, --help            Show this help',
      '',
      'Required env (COS):',
      '  COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET_NAME',
      '',
      'Required env (OSS):',
      '  OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_REGION, OSS_BUCKET_NAME',
      '',
      'Optional env (MinIO):',
      '  MINIO_ENDPOINT        MinIO server URL (e.g. http://your-server:9000)',
      '  MINIO_ACCESS_KEY      MinIO access key',
      '  MINIO_SECRET_KEY      MinIO secret key',
      '  MINIO_BUCKET          MinIO bucket name',
      '  MINIO_REGION          MinIO region (default: us-east-1)',
      '',
      'Requirements:',
      '  - AWS CLI must be installed and available in PATH.',
    ].join('\n'),
  );
  process.exit(code);
}

/** 收集待上传的扩展 zip 文件 */
function collectExtensionZips(dir: string, explicitFiles: string[]): string[] {
  const result: string[] = [];

  // 显式指定的文件
  for (const f of explicitFiles) {
    const abs = resolve(process.cwd(), f);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      throw new Error(`Extension file not found: ${f}`);
    }
    result.push(abs);
  }

  // 扫描目录
  const absDir = resolve(process.cwd(), dir);
  if (existsSync(absDir) && statSync(absDir).isDirectory()) {
    for (const name of readdirSync(absDir)) {
      if (!name.endsWith('.zip')) continue;
      const fullPath = absDir + '/' + name;
      if (statSync(fullPath).isFile()) {
        result.push(fullPath);
      }
    }
  }

  // 去重
  return [...new Set(result)];
}

/** 解析 latest_ext.yml 文件路径 */
function resolveLatestExtYml(dir: string): string | null {
  const absDir = resolve(process.cwd(), dir);
  const ymlPath = absDir + '/latest_ext.yml';
  if (existsSync(ymlPath) && statSync(ymlPath).isFile()) {
    return ymlPath;
  }
  return null;
}

function getUploadTargets(): UploadTarget[] {
  const cosRegion = requireEnv('COS_REGION');
  const ossRegion = requireEnv('OSS_REGION');

  return [
    {
      provider: 'cos',
      endpoint: `https://cos.${cosRegion}.myqcloud.com`,
      region: cosRegion,
      bucket: requireEnv('COS_BUCKET_NAME'),
      accessKeyId: requireEnv('COS_SECRET_ID'),
      secretAccessKey: requireEnv('COS_SECRET_KEY'),
    },
    {
      provider: 'oss',
      endpoint: `https://oss-${ossRegion}.aliyuncs.com`,
      region: ossRegion,
      bucket: requireEnv('OSS_BUCKET_NAME'),
      accessKeyId: requireEnv('OSS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('OSS_ACCESS_KEY_SECRET'),
    },
  ];
}

function getMinioTarget(): UploadTarget | null {
  const endpoint = process.env.MINIO_ENDPOINT?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();
  const bucket = process.env.MINIO_BUCKET?.trim();

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    return null;
  }

  return {
    provider: 'minio',
    endpoint,
    region: optionalEnv('MINIO_REGION', 'us-east-1'),
    bucket,
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  };
}

function runAwsCommand(awsExecutable: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(awsExecutable, args, { stdio: 'inherit', env });
  if (result.error) {
    throw new Error(`Failed to execute aws command: ${result.error.message}`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`aws command failed with exit code ${result.status}`);
  }
}

/** 上传扩展 zip 和元数据到指定 provider */
function uploadExtensions(awsExecutable: string, target: UploadTarget, zips: string[], latestExtYml: string | null): void {
  const isMinio = target.provider === 'minio';
  const addressingStyle = isMinio ? 'path' : 'virtual';

  const env = {
    ...process.env,
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED',
    AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_ACCESS_KEY_ID: target.accessKeyId,
    AWS_SECRET_ACCESS_KEY: target.secretAccessKey,
  };

  runAwsCommand(awsExecutable, ['configure', 'set', 'default.s3.addressing_style', addressingStyle], env);
  runAwsCommand(awsExecutable, ['configure', 'set', 'default.s3.payload_signing_enabled', 'false'], env);

  console.log(`\n[${target.provider.toUpperCase()}] endpoint=${target.endpoint} bucket=${target.bucket}`);

  for (const zip of zips) {
    const fileName = zip.split(/[\\/]/).pop() ?? zip;
    const remoteKey = `extensions/${fileName}`;

    console.log(`[${target.provider.toUpperCase()}] Uploading ${remoteKey}`);
    runAwsCommand(
      awsExecutable,
      ['s3', 'cp', zip, `s3://${target.bucket}/${remoteKey}`, '--endpoint-url', target.endpoint, '--region', target.region],
      env,
    );
    console.log(green(`[${target.provider.toUpperCase()}] Upload completed: ${remoteKey}`));
  }

  // 上传 latest_ext.yml
  if (latestExtYml) {
    const remoteKey = 'extensions/latest_ext.yml';
    console.log(`[${target.provider.toUpperCase()}] Uploading ${remoteKey}`);
    runAwsCommand(
      awsExecutable,
      ['s3', 'cp', latestExtYml, `s3://${target.bucket}/${remoteKey}`, '--endpoint-url', target.endpoint, '--region', target.region],
      env,
    );
    console.log(green(`[${target.provider.toUpperCase()}] Upload completed: ${remoteKey}`));
  }
}

async function main(): Promise<void> {
  loadEnvFile('.env');

  const { dir, files, minioOnly } = parseArgv(process.argv.slice(2));
  const zips = collectExtensionZips(dir, files);

  if (zips.length === 0) {
    console.log('[EXTENSION] No extension zip files found. Nothing to upload.');
    return;
  }

  console.log(`[EXTENSION] ${zips.length} file(s) to upload:`);
  for (const z of zips) {
    const name = z.split(/[\\/]/).pop() ?? z;
    const sizeMb = (statSync(z).size / 1024 / 1024).toFixed(1);
    console.log(`  - ${name} (${sizeMb} MB)`);
  }

  const awsExecutable = resolveAwsExecutable();
  const latestExtYml = resolveLatestExtYml(dir);

  if (latestExtYml) {
    console.log(`[EXTENSION] Found latest_ext.yml: ${latestExtYml}`);
  }

  if (!minioOnly) {
    const targets = getUploadTargets();
    for (const target of targets) {
      uploadExtensions(awsExecutable, target, zips, latestExtYml);
    }
  }

  const minioTarget = getMinioTarget();
  if (minioTarget) {
    uploadExtensions(awsExecutable, minioTarget, zips, latestExtYml);
  } else if (minioOnly) {
    throw new Error('[MINIO] MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET must all be set');
  }

  const parts = minioOnly ? [] : ['COS', 'OSS'];
  if (minioTarget) parts.push('MinIO');
  console.log(`\n${green(`Extension upload completed: ${parts.join(' + ')} (${zips.length} file(s))`)}`);
  if (!minioOnly && !minioTarget) {
    console.log('[MINIO] Skipped — MINIO_ENDPOINT or credentials not set');
  }

  // 清除 ESA CDN 缓存
  await purgeEsaCache();
}

/** 清除 ESA CDN 缓存 */
async function purgeEsaCache(): Promise<void> {
  const accessKeyId = process.env.ESA_ACCESS_KEY_ID?.trim();
  const accessKeySecret = process.env.ESA_ACCESS_KEY_SECRET?.trim();
  const siteIdRaw = process.env.ESA_ZONE_ID?.trim();
  const baseUrl = process.env.ESA_PURGE_URL?.trim();

  if (!accessKeyId || !accessKeySecret || !siteIdRaw || !baseUrl) {
    console.log('[ESA] Skipped — ESA env vars not set');
    return;
  }

  const siteId = Number(siteIdRaw);
  if (!Number.isFinite(siteId)) {
    console.error(`[ESA] ESA_ZONE_ID must be a number, got: ${siteIdRaw}`);
    return;
  }

  const config = new OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    endpoint: 'esa.cn-hangzhou.aliyuncs.com',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = new ((ESA20240910.default as any).default)(config);

  // 提取基础 URL（去掉最后的文件名部分）
  const baseUrlClean = baseUrl.replace(/\/[^/]*$/, '').replace(/\/$/, '');
  const filesToPurge = [
    `${baseUrlClean}/extensions/latest_ext.yml`,
  ];

  for (const fileUrl of filesToPurge) {
    try {
      const content = new ESA20240910.PurgeCachesRequestContent({
        files: [fileUrl],
        purgeAll: false,
      });
      const request = new ESA20240910.PurgeCachesRequest({
        content,
        type: 'file',
        siteId,
        force: true,
        edgeComputePurge: true,
      });
      const runtime = new Util.RuntimeOptions({});
      await client.purgeCachesWithOptions(request, runtime);
      console.log(`[ESA] Cache purged: ${fileUrl}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ESA] Purge failed for ${fileUrl}: ${message}`);
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(red(`Extension upload failed: ${message}`));
  process.exit(1);
});
