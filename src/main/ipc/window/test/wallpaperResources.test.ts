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
 * @file wallpaperResources.test.ts
 * @description 真实临时文件验证壁纸预览队列、磁盘缓存与桌面更新并发边界。
 * @author 鸡哥
 */
import { mkdtemp, mkdir, writeFile, readdir, rm, open, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  directory: '', thumbnail: vi.fn(), exec: vi.fn(), dialog: vi.fn(),
  copying: 0, peakCopies: 0, copyGate: null as Promise<void> | null,
}));
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>();
  return { ...actual, copyFile: async (source: string, target: string) => {
    mocks.copying += 1; mocks.peakCopies = Math.max(mocks.peakCopies, mocks.copying);
    try { await mocks.copyGate; await actual.copyFile(source, target); }
    finally { mocks.copying -= 1; }
  } };
});
vi.mock('electron', () => ({
  app: { getPath: () => mocks.directory },
  BrowserWindow: { fromWebContents: () => ({}), getFocusedWindow: () => null },
  dialog: { showOpenDialog: mocks.dialog },
  ipcMain: { handle: (name: string, handler: (...args: unknown[]) => Promise<unknown>) => mocks.handlers.set(name, handler) },
  nativeImage: { createThumbnailFromPath: mocks.thumbnail },
}));
vi.mock('child_process', () => ({ execFile: mocks.exec }));
vi.mock('../../../media/albumMedia', () => ({ getAlbumMediaInfo: vi.fn() }));
vi.mock('../../../media/downloadWallpaper', () => ({ default: vi.fn() }));
import { registerWallpaperIpcHandlers } from '../wallpaper';
const thumbnail = { isEmpty: () => false, toPNG: () => Buffer.from('small preview') };
let file: string;
/** 调用注册的实际处理器。 */
function invoke(name: string, ...args: unknown[]): Promise<unknown> { return mocks.handlers.get(name)!({}, ...args); }
beforeEach(async () => {
  mocks.directory = await mkdtemp(join(tmpdir(), 'eisland-preview-test-'));
  file = join(mocks.directory, 'large.png'); await writeFile(file, 'fixture');
  mocks.copying = 0; mocks.peakCopies = 0; mocks.copyGate = null;
  mocks.dialog.mockResolvedValue({ canceled: false, filePaths: [file] });
  mocks.handlers.clear(); mocks.thumbnail.mockResolvedValue(thumbnail); registerWallpaperIpcHandlers();
});
it('serializes image/video imports with one waiting slot and clears only completed copies', async () => {
  let finish!: () => void;
  mocks.copyGate = new Promise<void>((resolve) => { finish = resolve; });
  const requests = Array.from({ length: 8 }, (_, index) => invoke(index % 2 ? 'dialog:open-video' : 'dialog:open-image'));
  await vi.waitFor(() => expect(mocks.copying).toBe(1));
  finish();
  const results = await Promise.all(requests);
  expect(results.filter(Boolean)).toHaveLength(2);
  expect(mocks.peakCopies).toBe(1);
  expect((await readdir(join(mocks.directory, 'wallpapers'))).filter((name) => name.endsWith('.part'))).toEqual([]);
});
it('rejects oversized image imports before removing the current background', async () => {
  const cache = join(mocks.directory, 'wallpapers'); await mkdir(cache);
  const previous = join(cache, 'custom-bg-previous.png'); await writeFile(previous, 'keep current');
  const source = await open(file, 'r+');
  try { await source.truncate(64 * 1024 * 1024 + 1); } finally { await source.close(); }
  expect(await invoke('dialog:open-image')).toBeNull();
  expect(mocks.peakCopies).toBe(0);
  expect(await readFile(previous, 'utf8')).toBe('keep current');
});
it('orders cache clearing after an active import so it cannot publish a late background', async () => {
  let finish!: () => void;
  mocks.copyGate = new Promise<void>((resolve) => { finish = resolve; });
  const importing = invoke('dialog:open-image');
  await vi.waitFor(() => expect(mocks.copying).toBe(1));
  const clearing = invoke('wallpaper:clear-cache');
  finish();
  expect(await importing).toBeTruthy(); await clearing;
  expect(await readdir(join(mocks.directory, 'wallpapers'))).toEqual([]);
});
afterEach(async () => {
  if (mocks.directory.startsWith(join(tmpdir(), 'eisland-preview-test-'))) await rm(mocks.directory, { recursive: true, force: true });
});
it('serializes preview decoding, caps queued work at four, and reuses cached output', async () => {
  let finish!: (value: typeof thumbnail) => void;
  mocks.thumbnail.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const requests = Array.from({ length: 12 }, () => invoke('wallpaper:load-file', file, true));
  await vi.waitFor(() => expect(mocks.thumbnail).toHaveBeenCalledTimes(1));
  expect(mocks.thumbnail).toHaveBeenCalledWith(file, { width: 2048, height: 2048 });
  finish(thumbnail);
  const results = await Promise.all(requests);
  expect(results.filter(Boolean)).toHaveLength(4);
  expect(mocks.thumbnail).toHaveBeenCalledTimes(1);
  expect(await invoke('wallpaper:load-file', file, true)).toBe(results.find(Boolean));
  expect(mocks.thumbnail).toHaveBeenCalledTimes(1);
});
it('bounds persisted previews and keeps animated formats on the original streaming path', async () => {
  const cache = join(mocks.directory, 'wallpapers'); await mkdir(cache);
  for (let i = 0; i < 25; i += 1) await writeFile(join(cache, 'preview-old-' + i + '.png'), 'x');
  expect(await invoke('wallpaper:load-file', file, true)).toEqual(expect.stringContaining('eisland-media://asset/'));
  expect((await readdir(cache)).filter((name) => name.startsWith('preview-'))).toHaveLength(16);
  const gif = join(mocks.directory, 'animated.gif'); await writeFile(gif, 'gif');
  expect(await invoke('wallpaper:load-file', gif, true)).toEqual(expect.stringContaining('eisland-media://asset/'));
  expect(mocks.thumbnail).toHaveBeenCalledTimes(1);
});
it('allows one desktop wallpaper operation at a time and bounds its helper lifetime', async () => {
  let finish!: (error: Error | null, stdout: string) => void;
  mocks.exec.mockImplementation((_file: string, _args: string[], options: unknown, callback: typeof finish) => {
    expect(options).toMatchObject({ windowsHide: true, timeout: 10_000, maxBuffer: 64 * 1024 }); finish = callback;
  });
  const first = invoke('wallpaper:system:set', { sourcePath: file });
  await vi.waitFor(() => expect(mocks.exec).toHaveBeenCalledTimes(1));
  expect(await invoke('wallpaper:system:set', { sourcePath: file })).toBe(false);
  finish(null, 'True'); expect(await first).toBe(true);
});
