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
 * @file migration.test.ts
 * @description 两跳更新在隔离文件系统中验证交接，绝不启动真实安装器。
 * @author 鸡哥
 */
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { MigrationService } from '../main/services/migrationService';
import { backupData } from '../main/services/backupService';
import { AdapterError } from '../shared/utils/adapterErrors';
import type { MigrationPorts, ServiceConfig } from '../main/types/serviceTypes';
import type { Inspection, Release } from '../shared/types/adapterTypes';
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

/** 为安装边界注入无执行权限的文件夹与注册表快照。
 * @returns 测试状态机、隔离目录和可观测边界。
 */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'adapter-migration-')); roots.push(root);
  const data = join(root, 'roaming/eIsland/eIsland_store'); await mkdir(data, { recursive: true }); await writeFile(join(data, 'preferences.json'), '{"kept":true}');
  const config: ServiceConfig = { feeds: { esa: 'https://example.test/latest.json' }, publicKey: 'public test label, never used for cryptography', workRoot: join(root, 'work'), verifier: 'unused', appData: join(root, 'roaming'), localData: join(root, 'local'), ownExecutable: 'unused' };
  const inspection: Inspection = { installations: [{ directory: join(root, 'legacy'), version: '27.0.1', runtime: 'electron' }], running: [], dataRoots: [join(root, 'roaming/eIsland')], legacyStore: data, tauriStore: join(root, 'new-store'), selectedStore: data, targetDirectory: join(root, 'tauri') };
  const release: Release = { version: '27.0.3', notes: '', url: 'https://example.test/setup.exe', signature: 'not a crypto test' };
  const events: string[] = [];
  const ports: MigrationPorts = {
    inspect: vi.fn(async () => structuredClone(inspection)), release: vi.fn(async () => release),
    backup: vi.fn(async (...args: Parameters<MigrationPorts['backup']>) => { events.push('backup'); return backupData(...args); }),
    download: vi.fn(async (release: Release, file: string) => { void release; events.push('download'); await writeFile(file, 'MZ mock file, never executed'); }),
    verify: vi.fn(async () => { events.push('verify'); }),
    install: vi.fn(async (file: string, directory: string) => {
      void file;
      events.push('install-boundary'); await mkdir(directory); await writeFile(join(directory, 'eisland.exe'), 'not an executable');
      inspection.installations.push({ directory, version: '27.0.3', runtime: 'tauri' });
    }), publish: vi.fn(),
  };
  return { config, ports, inspection, events, service: new MigrationService(config, ports) };
}

it('protects data before download, verifies twice, and confirms installed identity and version', async () => {
  const { service, ports, events } = await fixture();
  await service.inspect('esa'); expect(service.state.phase).toBe('ready');
  await service.prepare(); expect(service.state.phase).toBe('prepared'); expect(ports.install).not.toHaveBeenCalled();
  await service.install(); expect(service.state.phase).toBe('complete');
  expect(events).toEqual(['backup', 'download', 'verify', 'verify', 'install-boundary']);
});
it('fails closed before network work if the production key is missing', async () => {
  const { config, ports } = await fixture(); config.publicKey = '';
  const service = new MigrationService(config, ports); await service.inspect('esa');
  expect(service.state.error).toBe('missingKey'); expect(ports.release).not.toHaveBeenCalled();
});
it('rejects an unconfigured source and never downgrades an existing Tauri installation', async () => {
  const { service, inspection, ports } = await fixture();
  await service.inspect('cos'); expect(service.state.error).toBe('invalidSource');
  inspection.installations.push({ runtime: 'tauri', version: '27.0.4', directory: inspection.targetDirectory });
  await service.inspect('esa'); expect(service.state.phase).toBe('installed'); expect(ports.backup).not.toHaveBeenCalled(); expect(ports.release).not.toHaveBeenCalled();
});
it('requires running instances to be closed by the user', async () => {
  const { service, inspection, ports } = await fixture();
  await service.inspect('esa'); inspection.running.push({ pid: 123, path: 'C:/external/eisland.exe' });
  await service.prepare(); expect(service.state.error).toBe('closeRunning'); expect(ports.download).not.toHaveBeenCalled(); expect(ports.install).not.toHaveBeenCalled();
});
it('keeps the backup and never installs a rejected signature', async () => {
  const { service, ports } = await fixture(); vi.mocked(ports.verify).mockRejectedValue(new AdapterError('signatureRejected'));
  await service.inspect('esa'); await service.prepare(); await service.install();
  expect(service.state.error).toBe('signatureRejected'); expect(service.state.backup).not.toBeNull(); expect(ports.install).not.toHaveBeenCalled();
});
it('rejects a file changed after preparation through re-verification', async () => {
  const { service, ports } = await fixture(); await service.inspect('esa'); await service.prepare();
  vi.mocked(ports.verify).mockRejectedValue(new AdapterError('signatureRejected'));
  await service.install(); expect(service.state.error).toBe('signatureRejected'); expect(ports.install).not.toHaveBeenCalled();
});
it('does not confuse zero installer exit with confirmed installation', async () => {
  const { service, ports } = await fixture(); vi.mocked(ports.install).mockResolvedValue(undefined);
  await service.inspect('esa'); await service.prepare(); await service.install(); expect(service.state.error).toBe('installNotConfirmed');
});
it('refuses install when the backup completion marker disappears or target changes', async () => {
  const { service, inspection, ports } = await fixture(); await service.inspect('esa'); await service.prepare();
  inspection.targetDirectory += '-changed'; await service.install(); expect(service.state.error).toBe('dataChanged'); expect(ports.install).not.toHaveBeenCalled();
});
it('blocks install without a completed backup marker', async () => {
  const { service, ports } = await fixture(); await service.inspect('esa'); await service.prepare();
  await writeFile(join(service.state.backup!.directory, 'backup.json'), '{"complete":false}');
  await service.install(); expect(service.state.error).toBe('backupMissing'); expect(ports.install).not.toHaveBeenCalled();
});
it('checks again for running applications immediately before installation', async () => {
  const { service, inspection, ports } = await fixture(); await service.inspect('esa'); await service.prepare();
  inspection.running.push({ pid: 456, path: 'C:/external/eisland.exe' });
  await service.install(); expect(service.state.error).toBe('closeRunning'); expect(ports.install).not.toHaveBeenCalled();
});
it('cancels only owned preparation and serializes duplicate commands', async () => {
  const { service, ports } = await fixture();
  vi.mocked(ports.release).mockImplementation(async (source, signal) => { void source; return new Promise((resolveResult, reject) => { void resolveResult; signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true }); }); });
  const pending = service.inspect('esa'); await vi.waitFor(() => expect(ports.release).toHaveBeenCalledOnce());
  await service.inspect('esa'); service.cancel(); await pending;
  expect(ports.release).toHaveBeenCalledOnce(); expect(service.state.phase).toBe('cancelled'); expect(ports.install).not.toHaveBeenCalled();
});
