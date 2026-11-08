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
 * @file installationOptions.test.ts
 * @description 在隔离目录验证自定义安装路径和旧版卸载计划，绝不启动安装或卸载程序。
 * @author 鸡哥
 */
import { mkdtemp, mkdir, writeFile, rm, realpath, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, parse } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { validateTargetDirectory } from '../main/services/platformService';
import { legacyUninstallPlan } from '../main/services/legacyUninstallService';
import type { Inspection, Installation } from '../shared/types/adapterTypes';
import type { ServiceConfig } from '../main/types/serviceTypes';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

/** 创建无真实程序的安装目录快照。
 * @returns 隔离的目录、配置和安装项。
 */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'adapter-install-options-')); roots.push(root);
  const old = join(root, 'old eIsland');
  const data = join(root, 'data');
  const target = join(root, 'new eIsland');
  await Promise.all([mkdir(join(old, 'resources'), { recursive: true }), mkdir(data), mkdir(target)]);
  const legacy: Installation = { directory: old, version: '27.0.1', runtime: 'electron', uninstaller: join(old, 'Uninstall eIsland.exe') };
  await writeFile(join(old, 'resources/app.asar'), 'fixture');
  await writeFile(legacy.uninstaller!, 'not an executable');
  const config: ServiceConfig = { workRoot: join(root, 'work'), ownExecutable: join(root, 'adapter/eisland.exe'), appData: data, localData: root, feeds: {}, publicKey: '', verifier: '' };
  const inspection: Inspection = { installations: [legacy], running: [], dataRoots: [data], legacyStore: data, tauriStore: data, selectedStore: data, targetDirectory: target };
  return { root, old, data, target, legacy, config, inspection };
}

it('allows empty or new folders and rejects nonempty folders, volume roots and protected locations', async () => {
  const f = await fixture();
  expect(await validateTargetDirectory(f.target, f.inspection, f.config)).toBe(await realpath(f.target));
  expect(await validateTargetDirectory(join(f.target, 'new'), f.inspection, f.config)).toBe(join(await realpath(f.target), 'new'));
  await writeFile(join(f.target, 'keep.txt'), 'keep');
  await expect(validateTargetDirectory(f.target, f.inspection, f.config)).rejects.toThrow('directoryNotEmpty');
  await Promise.all([f.old, f.data, f.config.workRoot, dirname(f.config.ownExecutable)].map(async (path) => {
    await expect(validateTargetDirectory(path, f.inspection, f.config)).rejects.toThrow('installOverlap');
  }));
  await expect(validateTargetDirectory(parse(f.root).root, f.inspection, f.config)).rejects.toThrow('invalidDirectory');
});

it('rejects a directory alias that resolves into old program data', async () => {
  const f = await fixture(); const alias = join(f.root, 'alias');
  await symlink(f.old, alias, process.platform === 'win32' ? 'junction' : 'dir');
  await expect(validateTargetDirectory(alias, f.inspection, f.config)).rejects.toThrow('installOverlap');
});

it('only builds a detached official-uninstaller plan after checking old and new program paths', async () => {
  const f = await fixture();
  await writeFile(join(f.target, 'eisland.exe'), 'not an executable');
  const plan = await legacyUninstallPlan(f.legacy, f.target, f.config.ownExecutable);
  const request = JSON.parse(Buffer.from(plan.env.EISLAND_LEGACY_UNINSTALL_REQUEST!, 'base64').toString()) as { uninstaller: string; executable: string; pid: number };
  expect(request.uninstaller).toBe(await realpath(f.legacy.uninstaller!));
  expect(request.executable).toBe(await realpath(join(f.target, 'eisland.exe')));
  expect(request.pid).toBe(process.pid);
  const script = Buffer.from(plan.args.at(-1)!, 'base64').toString('utf16le');
  expect(script).toContain('WaitForExit');
  expect(script).toContain('Start-Process');
  expect(script).not.toContain('Remove-Item');
  expect(script).not.toContain(f.old);
  expect(plan.env.TAURI_SIGNING_PRIVATE_KEY).toBeUndefined();
  await expect(legacyUninstallPlan({ ...f.legacy, uninstaller: join(f.target, 'eisland.exe') }, f.target, f.config.ownExecutable)).rejects.toThrow('legacyUnavailable');
  await expect(legacyUninstallPlan(f.legacy, f.old, f.config.ownExecutable)).rejects.toThrow('installOverlap');
});
