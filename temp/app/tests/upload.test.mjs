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
 * @file upload.test.mjs
 * @description 全程使用离线 AWS 替身验证清单最后发布和失败阻断，不接触真实桶。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { adapterArtifacts, uploadAdapter } from '../scripts/upload.mjs';
import { awsSession } from '../../../scripts/native/aws-upload.mjs';
const roots = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

/** 创建非可执行的元数据文件，公钥仅用于格式校验，不冒充签名验证通过。
 * @returns 离线发布边界。
 */
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'adapter-publish-test-')); roots.push(directory);
  const name = 'eIsland-27.0.2-Setup.exe'; const bytes = Buffer.from('not executable');
  const sha512 = createHash('sha512').update(bytes).digest('base64');
  await writeFile(join(directory, name), bytes); await writeFile(join(directory, `${name}.blockmap`), 'map');
  await writeFile(join(directory, 'latest.yml'), `version: 27.0.2\npath: ${name}\nsha512: ${sha512}\nfiles:\n  - url: ${name}\n    sha512: ${sha512}\n    size: ${bytes.length}\n`);
  const publicKey = Buffer.from(`untrusted comment: isolated format-only public key\n${Buffer.alloc(42).toString('base64')}\n`).toString('base64');
  await writeFile(join(directory, 'adapter-build.json'), JSON.stringify({ sha512, publicKey, version: '27.0.2', appId: 'com.eisland.app' }));
  const events = [];
  const dependencies = { directory, env: { TAURI_UPDATER_PUBLIC_KEY: publicKey, ESA_ACCESS_KEY_ID: 'test', ESA_ACCESS_KEY_SECRET: 'test', ESA_ZONE_ID: '1' }, targets: [{ provider: 'cos' }, { provider: 'r2', publicBase: 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev' }],
    resolveAws: () => 'fake-aws', preflight: vi.fn(async () => { events.push('preflight'); }),
    session: () => ({ upload: (file, key) => { events.push(key); }, close: () => { events.push('close'); } }), purge: vi.fn(async () => { events.push('purge'); }) };
  return { directory, dependencies, events };
}
it('publishes every immutable asset to every mirror before any legacy manifest', async () => {
  const { dependencies, events } = await fixture(); await uploadAdapter([], dependencies);
  const first = events.indexOf('latest.yml');
  expect(events.slice(0, first)).toEqual(['preflight', 'preflight', 'eIsland-27.0.2-Setup.exe', 'eIsland-27.0.2-Setup.exe.blockmap', 'eIsland-27.0.2-Setup.exe', 'eIsland-27.0.2-Setup.exe.blockmap']);
  expect(events.slice(first)).toEqual(['latest.yml', 'latest.yml', 'purge', 'close', 'close']);
});
it('never publishes a manifest after an installer upload failure', async () => {
  const { dependencies, events } = await fixture();
  dependencies.session = () => ({ upload: () => { throw new Error('upload failed'); }, close: () => events.push('close') });
  await expect(uploadAdapter([], dependencies)).rejects.toThrow('upload failed');
  expect(events).not.toContain('latest.yml'); expect(dependencies.purge).not.toHaveBeenCalled();
});
it('blocks migration when the signed Tauri target is unavailable', async () => {
  const { dependencies } = await fixture(); dependencies.preflight.mockRejectedValue(new Error('target unavailable'));
  dependencies.resolveAws = vi.fn(); await expect(uploadAdapter([], dependencies)).rejects.toThrow('target unavailable');
  expect(dependencies.resolveAws).not.toHaveBeenCalled();
});
it('dry-run performs no network, upload or purge and corrupt files fail before upload', async () => {
  const { dependencies, directory, events } = await fixture(); await uploadAdapter(['--dry-run'], dependencies);
  expect(events).toEqual([]); expect(dependencies.preflight).not.toHaveBeenCalled();
  await writeFile(join(directory, 'eIsland-27.0.2-Setup.exe'), 'changed');
  await expect(adapterArtifacts(directory)).rejects.toThrow('hash or size mismatch');
});
it('shared AWS transport gives legacy YAML the correct type and no-cache policy', () => {
  const calls = [];
  const session = awsSession('fake-aws', { provider: 'r2', endpoint: 'https://example.test', region: 'auto', bucket: 'fixture', accessKeyId: 'test', secretAccessKey: 'test' }, {}, (binary, args) => { calls.push(args); return { status: 0 }; });
  try {
    session.upload('latest.yml', 'latest.yml', true);
    const args = calls.at(-1);
    expect(args[args.indexOf('--content-type') + 1]).toBe('application/yaml');
    expect(args[args.indexOf('--cache-control') + 1]).toBe('no-cache, no-store, must-revalidate');
  } finally { session.close(); }
});
it('refuses to upload an installer built with a different embedded key', async () => {
  const { dependencies, directory } = await fixture();
  const file = join(directory, 'adapter-build.json');
  await writeFile(file, JSON.stringify({ version: '27.0.2', appId: 'com.eisland.app', publicKey: 'different key', sha512: 'mismatch' }));
  await expect(uploadAdapter([], dependencies)).rejects.toThrow('build identity');
  expect(dependencies.preflight).not.toHaveBeenCalled();
});
