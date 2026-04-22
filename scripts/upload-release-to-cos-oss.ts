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
 * @file upload-release-to-cos-oss.ts
 * @description 将 dist 发布产物上传到腾讯 COS 与阿里云 OSS
 * @author 鸡哥
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

type Provider = 'cos' | 'oss';

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
  green: '\x1b[32m'
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
    const result = spawnSync(cmd, ['--version'], {
      stdio: 'ignore',
      env: process.env
    });

    if (!result.error && (result.status === 0 || result.status === null)) {
      return cmd;
    }
  }

  throw new Error(
    'AWS CLI not found in PATH. Please install AWS CLI v2 and ensure command `aws` is available.'
  );
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
  if (!existsSync(absolutePath)) {
    return;
  }

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

    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = stripWrappedQuotes(rawValue);
  }
}

function parseDistDir(argv: string[]): string {
  const defaultDist = 'dist';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--dist' || arg === '-d') && argv[i + 1]) {
      return argv[i + 1];
    }
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    }
  }
  return defaultDist;
}

function printHelpAndExit(code: number): never {
  console.log([
    'Usage: node --experimental-strip-types scripts/upload-release-to-cos-oss.ts [options]',
    '',
    'Options:',
    '  -d, --dist <dir>      Dist directory path (default: dist)',
    '  -h, --help            Show this help',
    '',
    'Required env (COS):',
    '  COS_SECRET_ID, COS_SECRET_KEY, COS_REGION, COS_BUCKET_NAME',
    '',
    'Required env (OSS):',
    '  OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_REGION, OSS_BUCKET_NAME',
    '',
    'Requirement:',
    '  AWS CLI must be installed and available in PATH.'
  ].join('\n'));
  process.exit(code);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
      secretAccessKey: requireEnv('COS_SECRET_KEY')
    },
    {
      provider: 'oss',
      endpoint: `https://oss-${ossRegion}.aliyuncs.com`,
      region: ossRegion,
      bucket: requireEnv('OSS_BUCKET_NAME'),
      accessKeyId: requireEnv('OSS_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('OSS_ACCESS_KEY_SECRET')
    }
  ];
}

function readPackageVersion(): string {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const raw = readFileSync(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { version?: string };
  const version = parsed.version?.trim();
  if (!version) {
    throw new Error('Cannot read version from package.json');
  }
  return version;
}

function resolveInstallerForVersion(distDir: string, version: string): string {
  const absoluteDist = resolve(process.cwd(), distDir);
  const entries = readdirSync(absoluteDist);
  const expectedSuffix = `-${version}-Setup.exe`.toLowerCase();

  const matches = entries
    .map((name) => ({ name, path: join(absoluteDist, name) }))
    .filter((item) => {
      const isFile = statSync(item.path).isFile();
      if (!isFile) return false;
      return item.name.toLowerCase().endsWith(expectedSuffix);
    });

  if (matches.length === 0) {
    throw new Error(`No installer found for version ${version} in ${absoluteDist}. Expected suffix: ${expectedSuffix}`);
  }

  if (matches.length > 1) {
    throw new Error(`Multiple installers matched version ${version}: ${matches.map((m) => m.name).join(', ')}`);
  }

  return matches[0].path;
}

function resolveLatestYml(distDir: string): string {
  const latestYmlPath = resolve(process.cwd(), distDir, 'latest.yml');
  if (!existsSync(latestYmlPath) || !statSync(latestYmlPath).isFile()) {
    throw new Error(`latest.yml not found in ${resolve(process.cwd(), distDir)}`);
  }
  return latestYmlPath;
}

function resolveInstallerBlockmap(installerFile: string): string {
  const blockmapFile = `${installerFile}.blockmap`;
  if (!existsSync(blockmapFile) || !statSync(blockmapFile).isFile()) {
    throw new Error(`Blockmap file not found for installer: ${blockmapFile}`);
  }
  return blockmapFile;
}

function runAwsCommand(awsExecutable: string, args: string[], env: NodeJS.ProcessEnv): void {
  const result = spawnSync(awsExecutable, args, {
    stdio: 'inherit',
    env
  });

  if (result.error) {
    throw new Error(`Failed to execute aws command: ${result.error.message}`);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`aws command failed with exit code ${result.status}`);
  }
}

function uploadToTarget(awsExecutable: string, target: UploadTarget, files: string[]): void {
  const env = {
    ...process.env,
    AWS_REQUEST_CHECKSUM_CALCULATION: 'WHEN_REQUIRED',
    AWS_RESPONSE_CHECKSUM_VALIDATION: 'WHEN_REQUIRED',
    AWS_ACCESS_KEY_ID: target.accessKeyId,
    AWS_SECRET_ACCESS_KEY: target.secretAccessKey
  };

  runAwsCommand(awsExecutable, ['configure', 'set', 'default.s3.addressing_style', 'virtual'], env);
  runAwsCommand(awsExecutable, ['configure', 'set', 'default.s3.payload_signing_enabled', 'false'], env);
  runAwsCommand(awsExecutable, ['configure', 'set', 'default.s3.multipart_threshold', '5GB'], env);
  runAwsCommand(awsExecutable, ['configure', 'set', 'default.request_checksum_calculation', 'when_required'], env);
  runAwsCommand(awsExecutable, ['configure', 'set', 'default.response_checksum_validation', 'when_required'], env);

  console.log(`\n[${target.provider.toUpperCase()}] endpoint=${target.endpoint} bucket=${target.bucket}`);

  for (const file of files) {
    const fileName = file.split(/[\\/]/).pop() ?? file;

    console.log(`[${target.provider.toUpperCase()}] Uploading ${fileName}`);
    runAwsCommand(
      awsExecutable,
      [
        's3',
        'cp',
        file,
        `s3://${target.bucket}/${fileName}`,
        '--endpoint-url',
        target.endpoint,
        '--region',
        target.region
      ],
      env
    );

    console.log(green(`[${target.provider.toUpperCase()}] Upload completed: ${fileName}`));
  }
}

function main(): void {
  loadEnvFile('.env');
  const awsExecutable = resolveAwsExecutable();

  const distDir = parseDistDir(process.argv.slice(2));
  const version = readPackageVersion();
  const installerFile = resolveInstallerForVersion(distDir, version);
  const blockmapFile = resolveInstallerBlockmap(installerFile);
  const latestYmlFile = resolveLatestYml(distDir);
  const uploadFiles = [installerFile, blockmapFile, latestYmlFile];

  console.log(`Using version from package.json: ${version}`);
  console.log(`Installer: ${installerFile}`);
  console.log(`Blockmap: ${blockmapFile}`);
  console.log(`Metadata: ${latestYmlFile}`);

  const targets = getUploadTargets();

  for (const target of targets) {
    uploadToTarget(awsExecutable, target, uploadFiles);
  }

  console.log(`\n${green('Upload completed: COS + OSS (installer + blockmap + latest.yml)')}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(red(`Upload failed: ${message}`));
  process.exit(1);
}
