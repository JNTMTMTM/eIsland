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
 * @file extensionManager.ts
 * @description 可选扩展管理器 — 下载、解压、加载、卸载
 * @author 鸡哥
 */

import { app, net } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { getExtensionRegistry, type ExtensionMeta } from './extensionRegistry';
import type { ExtensionStatus, ExtensionProgressData } from '../ipc/app/types/ExtensionStatus';
import type { UpdateSourceKey } from '../ipc/app/types/UpdateSourceKey';
import { R2_UPDATE_URL, ESA_CDN_URL, GITHUB_OWNER, GITHUB_REPO } from '../ipc/app/config/updater';

/** 扩展安装根目录 */
function getExtensionsDir(): string {
  return join(app.getPath('userData'), 'extensions');
}

/**
 * 获取扩展的安装路径
 * @param extId - 扩展 ID
 * @returns 安装目录绝对路径，未安装返回 null
 */
export function getExtensionPath(extId: string): string | null {
  const dir = join(getExtensionsDir(), extId);
  return existsSync(dir) ? dir : null;
}

/**
 * 检查扩展是否已安装
 * @param extId - 扩展 ID
 */
function isInstalled(extId: string): boolean {
  return existsSync(join(getExtensionsDir(), extId, 'index.js'));
}

/**
 * 获取已安装扩展的版本
 * @param extId - 扩展 ID
 * @returns 版本号，未安装返回 null
 */
function getInstalledVersion(extId: string): string | null {
  const versionFile = join(getExtensionsDir(), extId, '.version');
  if (!existsSync(versionFile)) return null;
  try {
    return readFileSync(versionFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * 根据更新源构造扩展下载 URL
 * @param meta - 扩展元数据
 * @param source - 更新源
 * @param resolvedUrl - COS/OSS 自定义 URL
 * @returns 下载地址
 */
function resolveDownloadUrl(meta: ExtensionMeta, source: UpdateSourceKey, resolvedUrl?: string): string {
  if (source === 'github') {
    return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${app.getVersion()}/${meta.zipName}`;
  }
  if ((source === 'tencent-cos' || source === 'aliyun-oss') && resolvedUrl) {
    // COS/OSS 使用用户配置的 base URL
    return `${resolvedUrl.replace(/\/$/, '')}/extensions/${meta.zipName}`;
  }
  if (source === 'esa-cdn') {
    return `${ESA_CDN_URL}/extensions/${meta.zipName}`;
  }
  // 默认 R2
  return `${R2_UPDATE_URL}/extensions/${meta.zipName}`;
}

/**
 * 下载文件到本地
 * @param url - 下载地址
 * @param destPath - 目标文件路径
 * @param onProgress - 进度回调
 */
function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (transferred: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const total = parseInt(response.headers['content-length']?.toString() || '0', 10);
      let transferred = 0;
      const fileStream = createWriteStream(destPath);
      response.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        fileStream.write(chunk);
        onProgress?.(transferred, total);
      });
      response.on('end', () => {
        fileStream.end();
        fileStream.on('finish', resolve);
      });
      response.on('error', (err: Error) => {
        fileStream.destroy();
        reject(err);
      });
    });
    request.on('error', reject);
    request.end();
  });
}

/**
 * 解压 zip 文件到目标目录
 * @param zipPath - zip 文件路径
 * @param destDir - 目标目录
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  mkdirSync(destDir, { recursive: true });

  // 使用 PowerShell 解压（Windows 内置）
  await execFileAsync('powershell', [
    '-Command',
    `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
  ]);
}

/**
 * 获取所有扩展的状态列表
 * @returns 扩展状态数组
 */
export function getExtensionStatusList(): ExtensionStatus[] {
  const registry = getExtensionRegistry();
  return registry.map((meta) => {
    const installed = isInstalled(meta.id);
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      availableVersion: app.getVersion(),
      installedVersion: installed ? getInstalledVersion(meta.id) : null,
      isInstalled: installed,
      requiredRestart: meta.requiredRestart,
    };
  });
}

/**
 * 安装扩展
 * @param extId - 扩展 ID
 * @param source - 更新源
 * @param resolvedUrl - COS/OSS 自定义 URL
 * @param onProgress - 进度回调
 */
export async function installExtension(
  extId: string,
  source: UpdateSourceKey = 'cloudflare-r2',
  resolvedUrl?: string,
  onProgress?: (data: ExtensionProgressData) => void,
): Promise<void> {
  const registry = getExtensionRegistry();
  const meta = registry.find((e) => e.id === extId);
  if (!meta) throw new Error(`Unknown extension: ${extId}`);

  const extDir = getExtensionsDir();
  mkdirSync(extDir, { recursive: true });

  const url = resolveDownloadUrl(meta, source, resolvedUrl);
  const tempZip = join(extDir, `${extId}.zip.tmp`);
  const installPath = join(extDir, meta.installDir);

  console.log(`[Extension] Downloading ${extId} from ${url}`);

  try {
    // 下载
    await downloadFile(url, tempZip, (transferred, total) => {
      const progress = total > 0 ? Math.round((transferred / total) * 100) : 0;
      onProgress?.({ id: extId, progress, transferred, total });
    });

    console.log(`[Extension] Download complete, extracting...`);

    // 解压
    await extractZip(tempZip, installPath);

    // 验证
    if (!existsSync(join(installPath, 'index.js'))) {
      throw new Error('Extension package invalid: index.js not found after extraction');
    }

    console.log(`[Extension] ${extId} installed successfully`);
  } finally {
    // 清理临时文件
    try {
      if (existsSync(tempZip)) rmSync(tempZip);
    } catch { /* ignore */ }
  }
}

/**
 * 卸载扩展
 * @param extId - 扩展 ID
 */
export function uninstallExtension(extId: string): void {
  const installPath = join(getExtensionsDir(), extId);
  if (!existsSync(installPath)) return;
  rmSync(installPath, { recursive: true, force: true });
  console.log(`[Extension] ${extId} uninstalled`);
}
