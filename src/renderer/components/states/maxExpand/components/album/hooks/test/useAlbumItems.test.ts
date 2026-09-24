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
 * @file useAlbumItems.test.ts
 * @description 相册视频加载队列的持久化顺序、并发和卸载生命周期回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAlbumItems } from '../useAlbumItems';
import type { AlbumItem, AlbumMeta } from '../../types/albumTypes';

const { effectMock, stateMock, probeMock } = vi.hoisted(() => ({ effectMock: vi.fn(), stateMock: vi.fn(), probeMock: vi.fn() }));
vi.mock('react', () => ({
  useEffect: effectMock, useState: stateMock,
  useRef: (value: unknown) => ({ current: value }),
  useCallback: (callback: unknown) => callback,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../utils/media/videoProbe', () => ({ default: probeMock }));

const items: AlbumItem[] = Array.from({ length: 6 }, (value, id) => {
  void value;
  return { id, name: `${id}.mp4`, path: `C:/album/${id}.mp4`, ext: 'mp4', mediaType: 'video', addedAt: id };
});
let effects: Array<() => void | (() => void)>;
let cleanups: Array<void | (() => void)>;
let state: unknown[];
let completeProbe: Array<() => void>;
const mediaInfo = vi.fn();
const storeWrite = vi.fn();
const loadWallpaperFile = vi.fn();
let image: { src: string; naturalWidth: number; naturalHeight: number; onload: (() => void) | null; onerror: (() => void) | null };
const metadata = { width: 1920, height: 1080, durationSec: 60 };

beforeEach(() => {
  vi.useFakeTimers();
  effects = [];
  cleanups = [];
  state = [];
  completeProbe = [];
  image = { src: '', naturalWidth: 4000, naturalHeight: 3000, onload: null, onerror: null };
  vi.stubGlobal('Image', class { constructor() { return image; } });
  loadWallpaperFile.mockResolvedValue('data:image/jpeg;base64,YWJj');
  let stateIndex = 0;
  stateMock.mockImplementation((initial: unknown) => {
    const index = stateIndex++;
    state[index] = initial;
    if (index === 0) state[index] = items;
    if (index === 1 || index === 2) state[index] = true;
    return [state[index], (next: unknown) => {
      state[index] = typeof next === 'function' ? (next as (previous: unknown) => unknown)(state[index]) : next;
    }];
  });
  effectMock.mockImplementation((effect: () => void | (() => void)) => { effects.push(effect); });
  storeWrite.mockResolvedValue(true);
  mediaInfo.mockImplementation((path: string) => Promise.resolve({ url: `eisland-media://album/${path}`, sizeBytes: 4 * 1024 ** 3 }));
  probeMock.mockImplementation((url: string, signal: AbortSignal) => new Promise((resolve) => {
    expect(url).toMatch(/^eisland-media:/);
    completeProbe.push(() => resolve(metadata));
    signal.addEventListener('abort', () => resolve(null), { once: true });
  }));
  vi.stubGlobal('localStorage', { setItem: vi.fn() });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api: {
    storeWrite, loadWallpaperFile,
    storeRead: vi.fn((key: string) => Promise.resolve(key === 'photo-album-items' ? items : null)),
    getAlbumMediaInfo: mediaInfo,
  } });
});

afterEach(() => {
  cleanups.forEach((cleanup) => { if (cleanup) cleanup(); });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(): ReturnType<typeof useAlbumItems> {
  const hook = useAlbumItems();
  cleanups = effects.map((effect) => effect());
  return hook;
}

describe('album metadata queue', () => {
  it('waits for the album allowlist to persist before asking for stream URLs', async () => {
    let persisted!: () => void;
    storeWrite.mockReturnValue(new Promise<void>((resolve) => { persisted = resolve; }));
    mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(mediaInfo).not.toHaveBeenCalled();
    persisted();
    await vi.advanceTimersByTimeAsync(0);
    expect(mediaInfo).toHaveBeenCalledTimes(4);
  });

  it('limits actual decoders to four until metadata finishes', async () => {
    mount();
    await vi.advanceTimersByTimeAsync(0);
    expect(probeMock).toHaveBeenCalledTimes(4);
    completeProbe[0]();
    await vi.advanceTimersByTimeAsync(0);
    expect(probeMock).toHaveBeenCalledTimes(5);
    const cache = state[3] as Record<number, AlbumMeta>;
    expect(cache[0]).toMatchObject({ ...metadata, sizeBytes: 4 * 1024 ** 3, loading: false });
    expect(cache[0].videoUrl).toMatch(/^eisland-media:/);
  });

  it('cancels active probes and never starts queued work after unmount', async () => {
    mount();
    await vi.advanceTimersByTimeAsync(0);
    cleanups.forEach((cleanup) => { if (cleanup) cleanup(); });
    cleanups = [];
    await vi.advanceTimersByTimeAsync(0);
    expect(probeMock.mock.calls.every(([, signal]) => (signal as AbortSignal).aborted)).toBe(true);
    expect(mediaInfo).toHaveBeenCalledTimes(4);
    const cache = state[3] as Record<number, AlbumMeta>;
    expect(Object.values(cache).some((meta) => meta.videoUrl)).toBe(false);
  });

  it('releases the full-resolution image when returning to the thumbnail grid', async () => {
    const hook = mount();
    hook.loadFullImage({ ...items[0], mediaType: 'image' });
    await vi.advanceTimersByTimeAsync(0);
    image.onload?.();
    expect((state[3] as Record<number, AlbumMeta>)[0].dataUrl).toBe('data:image/jpeg;base64,YWJj');
    hook.releaseFullImage();
    expect((state[3] as Record<number, AlbumMeta>)[0].dataUrl).toBeUndefined();
    expect(image.src).toBe('');
    expect(image.onload).toBeNull();
  });

  it('drops image reads that complete after the viewer has closed', async () => {
    let finishRead!: (url: string) => void;
    loadWallpaperFile.mockReturnValue(new Promise<string>((resolve) => { finishRead = resolve; }));
    const hook = mount();
    hook.loadFullImage({ ...items[0], mediaType: 'image' });
    hook.releaseFullImage();
    finishRead('data:image/jpeg;base64,YWJj');
    await vi.advanceTimersByTimeAsync(0);
    expect((state[3] as Record<number, AlbumMeta>)[0].dataUrl).toBeUndefined();
    expect(image.onload).toBeNull();
  });

  it('does not resurrect metadata for a removed in-flight item', async () => {
    const hook = mount();
    await vi.advanceTimersByTimeAsync(0);
    hook.handleRemove(0);
    completeProbe[0]();
    await vi.advanceTimersByTimeAsync(0);
    expect((state[3] as Record<number, AlbumMeta>)[0]).toBeUndefined();
  });
});
