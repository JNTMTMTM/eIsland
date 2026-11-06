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
 * @file backup.test.ts
 * @description 在隔离目录验证原数据不变、校验备份、链接拒绝和取消边界。
 * @author 鸡哥
 */
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { backupData } from '../main/services/backupService';
import { directoriesOverlap, selectTargetDirectory } from '../main/services/platformService';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });
it('backs up per-key JSON and binary bytes while preserving originals', async () => {
  const root = await mkdtemp(join(tmpdir(), 'adapter-backup-')); roots.push(root);
  const source = join(root, 'eIsland'); await mkdir(join(source, 'eIsland_store'), { recursive: true });
  const bytes = Buffer.from('{"history":["中文"]}');
  await writeFile(join(source, 'eIsland_store', 'downloads.json'), bytes);
  const backup = await backupData([source], join(root, 'backup'), new AbortController().signal, () => {});
  expect(backup.files).toBe(1); expect(backup.bytes).toBe(bytes.length);
  expect(await readFile(join(source, 'eIsland_store', 'downloads.json'))).toEqual(bytes);
  expect(await readFile(join(root, 'backup/data-0/eIsland_store/downloads.json'))).toEqual(bytes);
  const manifest = JSON.parse(await readFile(join(root, 'backup/backup.json'), 'utf8')) as { complete: boolean; files: { sha256: string }[] };
  expect(manifest.complete).toBe(true); expect(manifest.files[0].sha256).toHaveLength(64);
  await expect(backupData([source], join(root, 'backup'), new AbortController().signal, () => {})).rejects.toThrow();
});
it('rejects backup inside original data and rejects junction traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'adapter-links-')); roots.push(root);
  const source = join(root, 'source'); await mkdir(source);
  await expect(backupData([source], join(source, 'backup'), new AbortController().signal, () => {})).rejects.toThrow('backupLink');
  const outside = join(root, 'outside'); await mkdir(outside);
  await symlink(outside, join(source, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(backupData([source], join(root, 'backup'), new AbortController().signal, () => {})).rejects.toThrow('backupLink');
  await expect(access(join(root, 'backup/backup.json'))).rejects.toThrow();
});
it('never writes a complete marker after cancellation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'adapter-backup-cancel-')); roots.push(root);
  const source = join(root, 'source'); await mkdir(source); await writeFile(join(source, 'a'), 'original');
  const controller = new AbortController(); controller.abort();
  await expect(backupData([source], join(root, 'backup'), controller.signal, () => {})).rejects.toThrow();
  await expect(access(join(root, 'backup/backup.json'))).rejects.toThrow();
  expect(await readFile(join(source, 'a'), 'utf8')).toBe('original');
});
it('recognizes nested install paths without conflating adjacent names', () => {
  expect(directoriesOverlap('C:/Apps/eIsland', 'C:/Apps/eIsland/new')).toBe(true);
  expect(directoriesOverlap('C:/Apps/eIsland', 'C:/Apps/eIsland-Tauri')).toBe(false);
});
it('never overwrites the running adapter or an unregistered existing directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'adapter-paths-')); roots.push(root);
  const primary = join(root, 'eIsland');
  expect(await selectTargetDirectory([], root, join(primary, 'eIsland.exe'))).toBe(join(root, 'eIsland-Tauri'));
  await mkdir(primary); await writeFile(join(primary, 'keep.txt'), 'unchanged');
  expect(await selectTargetDirectory([], root, join(root, 'adapter/eIsland.exe'))).toBe(join(root, 'eIsland-Tauri'));
  await mkdir(join(root, 'eIsland-Tauri'));
  await expect(selectTargetDirectory([], root, join(root, 'adapter/eIsland.exe'))).rejects.toThrow('installOverlap');
  expect(await readFile(join(primary, 'keep.txt'), 'utf8')).toBe('unchanged');
  expect(await selectTargetDirectory([{ directory: primary, version: '27.0.2', runtime: 'tauri' }], root, join(root, 'adapter/eIsland.exe'))).toBe(primary);
});
