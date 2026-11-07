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
 * @file release.test.ts
 * @description 离线验证清单兼容、边界下载、重定向和取消，测试数据不属于真实安装器。
 * @author 鸡哥
 */
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseRelease, ReleaseService, releaseUrl, trustedHosts } from '../main/services/releaseService';
import { MINIMUM_TAURI_VERSION } from '../shared/config/adapterConfig';

const payload = Buffer.from('MZ isolated download bytes 中文');
const asset = { url: 'https://example.test/setup.exe', signature: Buffer.from('not a real signature').toString('base64'), format: 'nsis', size: payload.length, sha512: createHash('sha512').update(payload).digest('base64') };
const manifest = { runtime: 'tauri', version: MINIMUM_TAURI_VERSION, platforms: { 'windows-x86_64': asset } };
const roots: string[] = [];
const service = (fetcher: ConstructorParameters<typeof ReleaseService>[0] = fetch): ReleaseService => new ReleaseService(fetcher, false, ['example.test']);
afterEach(async () => { vi.useRealTimers(); await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('official Tauri release contract', () => {
  it('accepts official-only and current extended JSON', () => {
    expect(parseRelease(manifest).version).toBe(MINIMUM_TAURI_VERSION);
    expect(parseRelease({ version: MINIMUM_TAURI_VERSION, platforms: { 'windows-x86_64': { url: asset.url, signature: asset.signature } } }).size).toBeUndefined();
  });
  it.each(['27.0.1', '27.0.3-beta.1', 'v27.0.3', 'bad'])('rejects unsupported version %s', (version) => {
    const candidate = { ...manifest }; candidate.version = version;
    expect(() => parseRelease(candidate)).toThrow();
  });
  it.each([{ runtime: 'electron' }, { platforms: {} }, { version: null }])('rejects incompatible manifests', (change) => expect(() => parseRelease({ ...manifest, ...change })).toThrow());
  it.each([{ url: 'http://example.test/setup.exe' }, { url: 'https://user:secret@example.test/setup.exe' }, { url: 'https://example.test/setup.zip' }, { signature: '%' }, { size: 0 }, { size: 3e9 }, { sha512: 'bad' }, { format: 'msi' }])('rejects invalid asset %j', (change) => expect(() => parseRelease({ ...manifest, platforms: { 'windows-x86_64': { ...asset, ...change } } })).toThrow());
  it('allows loopback HTTP only at the explicit test boundary', () => {
    expect(() => releaseUrl('http://127.0.0.1/a')).toThrow();
    expect(releaseUrl('http://127.0.0.1/a', true).hostname).toBe('127.0.0.1');
    expect(() => releaseUrl('http://localhost/a', true)).toThrow();
  });
});

describe('bounded network and staging', () => {
  it('reads a UTF-8 manifest split across network chunks', async () => {
    const bytes = Buffer.from(JSON.stringify({ ...manifest, notes: '更新说明' }));
    const body = new ReadableStream({ start(controller) { bytes.forEach((byte) => controller.enqueue(Uint8Array.of(byte))); controller.close(); } });
    const client = service(vi.fn().mockResolvedValue(new Response(body)));
    expect((await client.manifest(asset.url, new AbortController().signal)).notes).toBe('更新说明');
  });
  it('rejects oversized manifest and redirect loops', async () => {
    const oversized = service(vi.fn().mockResolvedValue(new Response(' '.repeat(1024 * 1024 + 1))));
    await expect(oversized.manifest(asset.url, new AbortController().signal)).rejects.toThrow();
    const fetcher = vi.fn().mockImplementation(async () => new Response(null, { status: 302, headers: { location: '/again' } }));
    await expect(service(fetcher).request(asset.url, new AbortController().signal)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(6);
  });
  it('limits requests and redirects to trusted hosts', async () => {
    await expect(service(vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://internal.example/admin' } }))).request(asset.url, new AbortController().signal)).rejects.toThrow();
    const fetcher = vi.fn();
    await expect(service(fetcher).request('https://other.example/latest.json', new AbortController().signal)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(trustedHosts({ r2: 'https://pub.example.dev/a/latest.json' })).toEqual(expect.arrayContaining(['pub.example.dev', 'release-assets.githubusercontent.com']));
  });
  it.each(['https://10.0.0.1/a', 'https://169.254.169.254/a', 'https://[::1]/a', 'https://127.0.0.1/a'])('rejects IP literal destination %s', (address) => expect(() => releaseUrl(address)).toThrow());
  it('blocks HTTP redirect downgrade and error status', async () => {
    await expect(service(vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://example.test/setup.exe' } }))).request(asset.url, new AbortController().signal)).rejects.toThrow();
    await expect(service(vi.fn().mockResolvedValue(new Response(null, { status: 503 }))).request(asset.url, new AbortController().signal)).rejects.toThrow();
  });
  it('commits exact bytes and removes owned partial data on hash failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adapter-download-')); roots.push(root);
    const path = join(root, 'setup.exe');
    const client = service(vi.fn().mockImplementation(async () => new Response(payload)));
    await client.download(parseRelease(manifest), path, new AbortController().signal, () => {});
    expect(await readFile(path)).toEqual(payload);
    const bad = { ...parseRelease(manifest), sha512: 'wrong' };
    await expect(client.download(bad, join(root, 'bad.exe'), new AbortController().signal, () => {})).rejects.toThrow();
    await expect(access(join(root, 'bad.exe.part'))).rejects.toThrow();
    await expect(access(join(root, 'bad.exe'))).rejects.toThrow();
  });
  it('rejects truncated and overlong downloads without a final file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adapter-truncated-')); roots.push(root);
    await [payload.subarray(0, 2), Buffer.concat([payload, payload])].reduce(async (previous, bytes) => {
      await previous;
      const client = service(vi.fn().mockResolvedValue(new Response(bytes)));
      await expect(client.download(parseRelease(manifest), join(root, 'setup.exe'), new AbortController().signal, () => {})).rejects.toThrow();
      await expect(access(join(root, 'setup.exe'))).rejects.toThrow();
    }, Promise.resolve());
  });
  it('copies a selected offline installer without touching its source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adapter-local-')); roots.push(root);
    const source = join(root, 'source.exe'); await writeFile(source, payload);
    await service().download(parseRelease(manifest), join(root, 'stage.exe'), new AbortController().signal, () => {}, source);
    expect(await readFile(source)).toEqual(payload);
    expect(await readFile(join(root, 'stage.exe'))).toEqual(payload);
  });
  it('respects cancellation before downloading', async () => {
    const root = await mkdtemp(join(tmpdir(), 'adapter-cancel-')); roots.push(root);
    const controller = new AbortController(); controller.abort();
    await expect(service().download(parseRelease(manifest), join(root, 'stage.exe'), controller.signal, () => {}, join(root, 'missing.exe'))).rejects.toThrow();
    await expect(access(join(root, 'stage.exe'))).rejects.toThrow();
  });
});
