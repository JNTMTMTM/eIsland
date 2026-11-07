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
 * @file backupService.ts
 * @description 原数据只读、有界备份与逐文件 SHA-256 校验，不覆盖原目录及既有备份。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { createReadStream, constants } from 'node:fs';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, isAbsolute, resolve } from 'node:path';
import { MAX_BACKUP_BYTES, MAX_BACKUP_FILES } from '../../shared/config/adapterConfig';
import { fail } from '../../shared/utils/adapterErrors';
import type { Backup, Progress } from '../../shared/types/adapterTypes';

/** 待复制文件：扫描时记录大小与修改时间，复制前后据此判断原数据是否变化。 */
interface Entry { source: string; destination: string; bytes: number; mtime: number; }

/** backup.json 中的单个文件记录，backup 为相对备份目录的路径。 */
interface BackupRecord { backup: string; sha256: string; }

/** 对文件按流计算摘要，取消时立即停止读取。
 * @param path - 文件路径。
 * @param signal - 取消信号。
 * @returns SHA-256 摘要。
 */
function digest(path: string, signal: AbortSignal): Promise<string> {
  return new Promise((resolveDigest, reject) => {
    const hash = createHash('sha256');
    const input = createReadStream(path, { signal });
    input.on('data', (chunk) => hash.update(chunk));
    input.once('error', reject);
    input.once('end', () => resolveDigest(hash.digest('hex')));
  });
}

/** 备份 Electron 和已有 Tauri 数据，完整标记仅在全部内容校验后写入。
 * @param roots - 已检测的数据根目录。
 * @param destination - 本次专属备份目录。
 * @param signal - 取消信号。
 * @param progress - 字节进度回调。
 * @returns 可供用户手工恢复的校验备份。
 */
export async function backupData(roots: string[], destination: string, signal: AbortSignal, progress: (value: Progress) => void): Promise<Backup> {
  // 目标尚未创建，先规范化其父目录，使短路径和目录别名与源目录使用相同的路径形式。
  const resolvedDestination = resolve(destination);
  const canonicalDestination = join(await realpath(dirname(resolvedDestination)), basename(resolvedDestination));
  await Promise.all(roots.map(async (root) => {
    const path = relative(await realpath(root), canonicalDestination);
    if (!path || (path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(path))) fail('backupLink');
  }));
  await mkdir(destination, { recursive: false });
  const entries: Entry[] = [];
  let bytes = 0;
  const walk = async (root: string, directory: string, output: string): Promise<void> => {
    signal.throwIfAborted();
    const info = await lstat(directory);
    if (info.isSymbolicLink()) fail('backupLink');
    const path = relative(root, await realpath(directory));
    if (path.startsWith('..') || isAbsolute(path)) fail('backupLink');
    if (info.isDirectory()) {
      // 按顺序遍历，使文件数与字节上限在扫描过程中立即生效。
      await (await readdir(directory)).reduce(async (previous, child) => { await previous; await walk(root, join(directory, child), join(output, child)); }, Promise.resolve());
    } else if (info.isFile()) {
      bytes += info.size;
      if (bytes > MAX_BACKUP_BYTES || entries.length >= MAX_BACKUP_FILES) fail('backupLimit');
      entries.push({ source: directory, destination: output, bytes: info.size, mtime: info.mtimeMs });
    } else fail('backupLink');
  };
  for (let index = 0; index < roots.length; index += 1) {
    const root = roots[index];
    if ((await lstat(root)).isSymbolicLink()) fail('backupLink');
    await walk(await realpath(root), root, join(destination, `data-${index}`));
  }
  const records: (BackupRecord & { source: string; bytes: number })[] = [];
  let done = 0;
  await entries.reduce(async (previous, entry) => {
    await previous;
    signal.throwIfAborted();
    await mkdir(join(entry.destination, '..'), { recursive: true });
    const before = await lstat(entry.source);
    if (before.isSymbolicLink() || before.size !== entry.bytes || before.mtimeMs !== entry.mtime) fail('dataChanged');
    await copyFile(entry.source, entry.destination, constants.COPYFILE_EXCL);
    const [sourceHash, copiedHash, after] = await Promise.all([digest(entry.source, signal), digest(entry.destination, signal), stat(entry.source)]);
    if (sourceHash !== copiedHash || after.size !== entry.bytes || after.mtimeMs !== entry.mtime) fail('dataChanged');
    records.push({ source: entry.source, backup: relative(destination, entry.destination), bytes: entry.bytes, sha256: copiedHash });
    done += entry.bytes;
    progress({ done, total: bytes });
  }, Promise.resolve());
  const manifest = { roots, schema: 1, complete: true, createdAt: new Date().toISOString(), files: records };
  await writeFile(join(destination, 'backup.json.tmp'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await rename(join(destination, 'backup.json.tmp'), join(destination, 'backup.json'));
  return { bytes, directory: destination, files: entries.length };
}

/** 安装前复核备份：完整标记之外，逐个确认文件仍在备份目录内且 SHA-256 未变化。
 * @param directory - backupData 生成的备份目录。
 * @param signal - 取消信号。
 * @returns 全部文件校验通过后完成，否则以 backupMissing 失败。
 */
export async function verifyBackup(directory: string, signal: AbortSignal): Promise<void> {
  const manifest = JSON.parse(await readFile(join(directory, 'backup.json'), 'utf8')) as { complete?: boolean; files?: BackupRecord[] };
  if (manifest.complete !== true || !Array.isArray(manifest.files)) fail('backupMissing');
  await manifest.files.reduce(async (previous, record) => {
    await previous;
    signal.throwIfAborted();
    const path = resolve(directory, record.backup);
    const inside = relative(resolve(directory), path);
    if (!inside || inside.startsWith('..') || isAbsolute(inside)) fail('backupMissing');
    const actual = await digest(path, signal).catch(() => null);
    if (actual !== record.sha256) fail('backupMissing');
  }, Promise.resolve());
}
