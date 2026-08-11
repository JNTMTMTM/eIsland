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
 * @file build-extension-zip.ts
 * @description 构建可选扩展 zip 包（self-contained .NET 部署）
 * @author 鸡哥
 */

import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

/** 扩展构建配置 */
interface ExtensionBuildConfig {
  /** 扩展 ID（目录名） */
  id: string;
  /** 插件源码目录（相对于项目根目录） */
  pluginDir: string;
  /** .NET 项目文件名 */
  csproj: string;
  /** 输出的 exe 名称 */
  exeName: string;
  /** dotnet publish RID */
  rid: string;
}

/** 所有可构建的扩展 */
const EXTENSIONS: ExtensionBuildConfig[] = [
  {
    id: 'volume-analyzer',
    pluginDir: 'plugins/eisland-windows-volume-analyzer',
    csproj: 'src/eIslandVolumeAnalyzer.csproj',
    exeName: 'eIslandVolumeAnalyzer.exe',
    rid: 'win-x64',
  },
  {
    id: 'volume-helper',
    pluginDir: 'plugins/eisland-windows-volume-helper',
    csproj: 'src/eIslandVolumeHelper.csproj',
    exeName: 'eIslandVolumeHelper.exe',
    rid: 'win-x64',
  },
  {
    id: 'brightness-helper',
    pluginDir: 'plugins/eisland-windows-brightness-helper',
    csproj: 'src/eIslandBrightnessReader.csproj',
    exeName: 'eIslandBrightnessReader.exe',
    rid: 'win-x64',
  },
];

const ROOT = resolve(import.meta.dirname, '..');
const DIST_EXT_DIR = join(ROOT, 'dist', 'extensions');

function buildExtension(config: ExtensionBuildConfig): void {
  const { id, pluginDir, csproj, exeName, rid } = config;
  const pluginPath = join(ROOT, pluginDir);
  const csprojPath = join(pluginPath, csproj);
  const publishDir = join(pluginPath, 'src', 'bin', 'Release', 'publish', rid);

  console.log(`\n[extension:build] Building ${id} ...`);
  console.log(`  csproj: ${csprojPath}`);
  console.log(`  RID: ${rid}`);

  if (!existsSync(csprojPath)) {
    console.error(`[extension:build] ERROR: csproj not found: ${csprojPath}`);
    process.exit(1);
  }

  // dotnet publish self-contained
  const result = spawnSync('dotnet', [
    'publish', csprojPath,
    '-c', 'Release',
    '-r', rid,
    '--self-contained',
    '-p:PublishSingleFile=true',
    '-p:EnableCompressionInSingleFile=true',
  ], {
    cwd: pluginPath,
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`[extension:build] ERROR: dotnet publish failed for ${id}`);
    process.exit(1);
  }

  // 收集产物到临时目录
  const stagingDir = join(DIST_EXT_DIR, `_staging_${id}`);
  if (existsSync(stagingDir)) {
    rmSync(stagingDir, { recursive: true, force: true });
  }
  mkdirSync(stagingDir, { recursive: true });

  // 复制编译产物
  const exePath = join(publishDir, exeName);
  if (!existsSync(exePath)) {
    // 回退到非 publish 的 Release 目录
    const fallbackDir = join(pluginPath, 'src', 'bin', 'Release', 'net10.0', rid);
    const fallbackExe = join(fallbackDir, exeName);
    if (existsSync(fallbackExe)) {
      cpSync(fallbackDir, stagingDir, { recursive: true });
    } else {
      console.error(`[extension:build] ERROR: exe not found at ${exePath} or ${fallbackExe}`);
      process.exit(1);
    }
  } else {
    cpSync(publishDir, stagingDir, { recursive: true });
  }

  // 复制 JS 入口文件
  const jsFiles = ['index.js', 'ffi-loader.js', 'package.json'];
  for (const file of jsFiles) {
    const src = join(pluginPath, file);
    if (existsSync(src)) {
      cpSync(src, join(stagingDir, file));
    }
  }

  // 读取版本号
  const pkgPath = join(pluginPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version || '0.0.0';

  // 写入版本标记
  writeFileSync(join(stagingDir, '.version'), version, 'utf-8');

  // 打 zip
  const zipName = `${id}-v${version}.zip`;
  const zipPath = join(DIST_EXT_DIR, zipName);
  mkdirSync(DIST_EXT_DIR, { recursive: true });

  console.log(`[extension:build] Packaging ${zipName} ...`);

  const zipResult = spawnSync('powershell', [
    '-Command',
    `Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force`,
  ], { stdio: 'inherit' });

  if (zipResult.status !== 0) {
    console.error(`[extension:build] ERROR: zip failed for ${id}`);
    process.exit(1);
  }

  // 清理临时目录
  rmSync(stagingDir, { recursive: true, force: true });

  console.log(`[extension:build] ✓ ${zipName} (${(existsSync(zipPath) ? statSync(zipPath).size / 1024 / 1024 : 0).toFixed(1)} MB)`);
}

/** 构建元数据（用于生成 latest_ext.yml） */
interface ExtensionBuildResult {
  id: string;
  version: string;
  zipName: string;
  size: number;
}

// ===== Main =====

const targetId = process.argv[2]; // 可选：只构建指定扩展

console.log('[extension:build] Building extension packages...');

const buildResults: ExtensionBuildResult[] = [];

for (const ext of EXTENSIONS) {
  if (targetId && ext.id !== targetId) continue;
  buildExtension(ext);

  // 收集构建结果用于生成 latest_ext.yml
  const pluginPath = join(ROOT, ext.pluginDir);
  const pkgPath = join(pluginPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version || '0.0.0';
  const zipName = `${ext.id}-v${version}.zip`;
  const zipPath = join(DIST_EXT_DIR, zipName);
  const size = existsSync(zipPath) ? statSync(zipPath).size : 0;

  buildResults.push({ id: ext.id, version, zipName, size });
}

// 生成 latest_ext.yml
if (buildResults.length > 0) {
  const lines: string[] = [];
  for (const r of buildResults) {
    lines.push(`- id: ${r.id}`);
    lines.push(`  version: ${r.version}`);
    lines.push(`  url: ${r.zipName}`);
    lines.push(`  size: ${r.size}`);
  }
  const ymlContent = lines.join('\n') + '\n';
  const ymlPath = join(DIST_EXT_DIR, 'latest_ext.yml');
  writeFileSync(ymlPath, ymlContent, 'utf-8');
  console.log(`\n[extension:build] Generated latest_ext.yml with ${buildResults.length} extension(s)`);
}

console.log('\n[extension:build] Done.');
