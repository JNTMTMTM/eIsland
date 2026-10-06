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
 * @file useAlbumItemsRuntime.test.ts
 * @description 真实相册条目的初始化、媒体队列、原图/EXIF、文件导入、删除和浏览器资源清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MEDIA_LOAD_DELAY_MS, STORE_KEY, COLUMNS_STORE_KEY, SORT_STORE_KEY, GROUP_MODE_STORE_KEY, LOCAL_STORAGE_KEY } from '../../config/albumConfig';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from './albumHookHarness';
import type { AlbumItem } from '../../types/albumTypes';
import type { ChangeEvent } from 'react';
const probe = vi.hoisted(() => vi.fn<(url: string, signal: AbortSignal) => Promise<{
  width: number;
  height: number;
  durationSec: number;
} | null>>());
vi.mock('../../../../../../../utils/media/videoProbe', () => ({
  default: probe
}));
const {
  useAlbumItems
} = await import('../useAlbumItems');
const io = {
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, value: unknown) => Promise<boolean>>(),
  info: vi.fn<(path: string) => Promise<{
    url: string;
    sizeBytes: number;
  } | null>>(),
  thumbnail: vi.fn<(path: string) => Promise<string | null>>(),
  full: vi.fn<(path: string) => Promise<string | null>>(),
  buffer: vi.fn<(path: string) => Promise<Uint8Array | null>>(),
  path: vi.fn<(file: File) => string>(),
  get: vi.fn<(key: string) => string | null>(),
  set: vi.fn<(key: string, value: string) => void>(),
  revoke: vi.fn<(url: string) => void>()
};
const cache = new Map<string, unknown>();
const images: TestImage[] = [];
/** 浏览器图像解码叶节点，显式触发真实 onload/onerror 回调。 */
class TestImage {
  src = '';

  naturalWidth = 4000;

  naturalHeight = 3000;

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null; /** 创建不会读取用户文件的图像探针。 */

  constructor() {
    images.push(this);
  }
}
/** 构造正常持久化条目。
 * @param id - 条目 ID
 * @param type - 媒体类型
 * @returns 相册条目
 */
function item(id: number, type: 'image' | 'video' = 'image'): AlbumItem {
  const ext = type === 'image' ? 'jpg' : 'mp4';
  return {
    id,
    ext,
    mediaType: type,
    path: `C:/album/${  id  }.${  ext}`,
    name: `${id  }.${  ext}`,
    addedAt: id
  };
}
/** 执行真实条目管理 Hook。
 * @returns 当前条目管理器
 */
function view() {
  return renderHook(useAlbumItems);
}
/** 提交状态和异步叶回调。
 * @returns 最新条目管理器
 */
async function commit() {
  view();
  flushHookEffects();
  await settleHook();
  view();
  flushHookEffects();
  await settleHook();
  return view();
}
/** 从真实存档初始化条目并启动延迟加载。
 * @param items - 初始条目
 * @returns 最新条目管理器
 */
async function ready(items: AlbumItem[]) {
  cache.set(STORE_KEY, items);
  await commit();
  await vi.advanceTimersByTimeAsync(MEDIA_LOAD_DELAY_MS);
  return commit();
}
/** 制造带真实 TIFF 厂商字段的 JPEG，不替换 EXIF 算法。
 * @returns JPEG 二进制
 */
function jpeg(): Uint8Array {
  return Uint8Array.from([255, 216, 255, 225, 0, 28, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 15, 1, 2, 0, 2, 0, 0, 0, 65, 0, 0, 0, 255, 217]);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  resetHook();
  cache.clear();
  images.length = 0;
  Object.values(io).forEach((mock) => mock.mockReset());
  probe.mockReset();
  io.read.mockImplementation((key) => Promise.resolve(cache.get(key) ?? null));
  io.write.mockResolvedValue(true);
  io.info.mockImplementation((path) => Promise.resolve({
    url: `blob:${  path}`,
    sizeBytes: 100
  }));
  probe.mockResolvedValue({
    width: 800,
    height: 600,
    durationSec: 20
  });
  io.thumbnail.mockResolvedValue('data:image/jpeg;base64,YWJj');
  io.full.mockResolvedValue('data:image/jpeg;base64,YWJj');
  io.buffer.mockResolvedValue(jpeg());
  io.path.mockImplementation((file) => file.name);
  io.get.mockReturnValue(null);
  vi.stubGlobal('Image', TestImage);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(io.revoke);
  vi.stubGlobal('localStorage', {
    getItem: io.get,
    setItem: io.set
  });
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    api: {
      storeRead: io.read,
      storeWrite: io.write,
      getAlbumMediaInfo: io.info,
      loadAlbumThumbnail: io.thumbnail,
      loadWallpaperFile: io.full,
      readLocalFileAsBuffer: io.buffer,
      getPathForFile: io.path
    }
  });
});
afterEach(() => {
  unmountHook();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('album initialization and file import', () => {
  it.each(['addedDesc', 'addedAsc', 'nameAsc', 'nameDesc', 'durationDesc', 'durationAsc'])('hydrates saved sort %s and real sanitized items', async (sort) => {
    cache.set(STORE_KEY, [item(1), {
      path: 'invalid.txt'
    }, item(1)]);
    cache.set(COLUMNS_STORE_KEY, 100);
    cache.set(SORT_STORE_KEY, sort);
    cache.set(GROUP_MODE_STORE_KEY, 'folder');
    await commit();
    expect(view()).toMatchObject({
      items: [item(1)],
      loaded: true,
      mediaLoadReady: false,
      initColumns: 8,
      initSortMode: sort,
      initGroupMode: 'folder'
    });
    expect(io.set.mock.calls[0][0]).toBe(LOCAL_STORAGE_KEY);
    expect(JSON.parse(io.set.mock.calls[0][1]) as unknown).toEqual([item(1)]);
    expect(io.write).toHaveBeenCalledWith(STORE_KEY, [item(1)]);
  });
  it.each(['none', 'folder', 'date', 'invalid'])('hydrates group %s and ignores invalid sort', async (group) => {
    cache.set(GROUP_MODE_STORE_KEY, group);
    cache.set(SORT_STORE_KEY, 'invalid');
    await commit();
    expect(view().initGroupMode).toBe(group === 'invalid' ? 'none' : group);
    expect(view().initSortMode).toBe('addedDesc');
  });
  it.each(['normal', 'invalid-json', 'read-error', 'local-error'])('uses local fallback %s after failed or empty store reads', async (mode) => {
    io.get.mockReturnValue(mode === 'invalid-json' ? 'broken' : JSON.stringify([item(2)]));
    if (mode === 'read-error') io.read.mockRejectedValue(new Error('store'));
    if (mode === 'local-error') {io.get.mockImplementation(() => {
      throw new Error('local');
    });}
    await commit();
    expect(view().loaded).toBe(true);
    expect(view().items).toEqual(mode === 'invalid-json' || mode === 'local-error' ? [] : [item(2)]);
  });
  it('ignores delayed persisted load after unmount and cancels the media delay', async () => {
    const request = deferred<unknown>();
    io.read.mockReturnValue(request.promise);
    view();
    flushHookEffects();
    unmountHook();
    request.resolve([item(1)]);
    await settleHook();
    expect(view().loaded).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ignores empty file lists and unsupported/missing paths, adds real media and rejects duplicates', async () => {
    await commit();
    view().handleAddFiles(null);
    view().handleAddFiles([]);
    expect(view().statusMessage).toBe('');
    io.path.mockReturnValue('');
    view().handleAddFiles([new File(['a'], 'a.jpg')]);
    expect(view().statusMessage).toBe('albumTab.status.unsupportedOnly');
    io.path.mockImplementation((file) => file.name);
    view().handleAddFiles([new File(['x'], 'README'), new File(['x'], 'file.'), new File(['x'], 'unsupported.txt')]);
    expect(view().items).toEqual([]);
    view().handleAddFiles([new File(['x'], 'C:\\media\\A.JPG'), new File(['x'], 'plain.mp4'), new File(['x'], 'C:/media/b.png')]);
    await commit();
    expect(view().items.map((entry) => [entry.name, entry.ext, entry.mediaType, entry.id])).toEqual([['A.JPG', 'jpg', 'image', 10000], ['plain.mp4', 'mp4', 'video', 10001], ['b.png', 'png', 'image', 10002]]);
    view().handleAddFiles([new File(['x'], 'c:\\MEDIA\\a.jpg')]);
    expect(view().statusMessage).toBe('albumTab.status.allDuplicated');
    await commit();
    await vi.advanceTimersByTimeAsync(2400);
    expect(view().statusMessage).toBe('');
  });
  it('resets file input and invokes the file picker only when mounted', async () => {
    await commit();
    view().handlePickFiles();
    const click = vi.fn();
    view().fileInputRef.current = {
      click
    } as unknown as HTMLInputElement;
    view().handlePickFiles();
    expect(click).toHaveBeenCalledOnce();
    const target = {
      files: [new File(['x'], 'a.jpg')],
      value: 'chosen'
    };
    view().handleFileInputChange({
      target
    } as unknown as ChangeEvent<HTMLInputElement>);
    expect(target.value).toBe('');
    expect(view().items).toHaveLength(1);
  });
});
describe('album thumbnail and video requests', () => {
  it.each(['success', 'empty', 'reject'])('resolves image thumbnail %s and does not retry a failed preview', async (mode) => {
    if (mode === 'empty') io.thumbnail.mockResolvedValue(null);
    if (mode === 'reject') io.thumbnail.mockRejectedValue(new Error('read'));
    await ready([item(1)]);
    expect(view().metaCache[1]).toMatchObject({
      loading: false,
      loadFailed: mode !== 'success'
    });
    if (mode === 'success') expect(view().metaCache[1].thumbnailUrl).toBe('data:image/jpeg;base64,YWJj');
    view().setItems([...view().items]);
    await commit();
    expect(io.thumbnail).toHaveBeenCalledOnce();
  });
  it.each(['resolve', 'reject'])('ignores image thumbnail %s after removal or unmount', async (mode) => {
    const request = deferred<string | null>();
    io.thumbnail.mockReturnValue(request.promise);
    await ready([item(1)]);
    if (mode === 'resolve') view().handleRemove(1);else unmountHook();
    if (mode === 'resolve') request.resolve('data:image/png;base64,YQ==');else request.reject(new Error('late'));
    await settleHook();
    expect(view().metaCache[1]?.thumbnailUrl).toBeUndefined();
  });
  it.each(['success', 'no-info', 'info-reject', 'no-probe', 'probe-reject'])('resolves video metadata %s', async (mode) => {
    if (mode === 'no-info') io.info.mockResolvedValue(null);
    if (mode === 'info-reject') io.info.mockRejectedValue(new Error('info'));
    if (mode === 'no-probe') probe.mockResolvedValue(null);
    if (mode === 'probe-reject') probe.mockRejectedValue(new Error('probe'));
    await ready([item(1, 'video')]);
    expect(view().metaCache[1]).toMatchObject({
      loading: false,
      loadFailed: mode !== 'success'
    });
    if (mode === 'success') {
      expect(view().metaCache[1]).toMatchObject({
        width: 800,
        height: 600,
        durationSec: 20,
        sizeBytes: 100,
        videoCodec: 'H.264/H.265 (container-based)',
        videoUrl: 'blob:C:/album/1.mp4'
      });
      view().setItems([...view().items]);
      await commit();
      expect(io.info).toHaveBeenCalledOnce();
      unmountHook();
      expect(io.revoke).toHaveBeenCalledWith('blob:C:/album/1.mp4');
    }
  });
  it('never requests video metadata after removal while allowlist persistence is pending', async () => {
    const saved = deferred<boolean>();
    io.write.mockReturnValue(saved.promise);
    await ready([item(1, 'video')]);
    expect(io.info).not.toHaveBeenCalled();
    view().handleRemove(1);
    saved.resolve(true);
    await settleHook();
    expect(io.info).not.toHaveBeenCalled();
    expect(view().metaCache[1]).toBeUndefined();
  });
  it.each(['resolve', 'reject'])('drops video info completion %s after item removal', async (mode) => {
    const request = deferred<{
      url: string;
      sizeBytes: number;
    } | null>();
    io.info.mockReturnValue(request.promise);
    await ready([item(1, 'video')]);
    view().handleRemove(1);
    if (mode === 'resolve') {request.resolve({
      url: 'blob:late',
      sizeBytes: 10
    });} else request.reject(new Error('late'));
    await settleHook();
    expect(probe).not.toHaveBeenCalled();
    expect(view().metaCache[1]).toBeUndefined();
  });
  it('aborts pending probe and skips a removed queued item while draining concurrency', async () => {
    const requests: Array<ReturnType<typeof deferred<{
      width: number;
      height: number;
      durationSec: number;
    } | null>>> = [];
    probe.mockImplementation(() => {
      const request = deferred<{
        width: number;
        height: number;
        durationSec: number;
      } | null>();
      requests.push(request);
      return request.promise;
    });
    await ready(Array.from({
      length: 6
    }, (unused, index) => {
      void unused;
      return item(index + 1, 'video');
    }));
    expect(probe).toHaveBeenCalledTimes(4);
    const [[, signal]] = probe.mock.calls;
    view().handleRemoveSelected(new Set([1, 5]));
    expect(signal.aborted).toBe(true);
    requests[0].resolve(null);
    await settleHook();
    expect(io.info.mock.calls.map(([path]) => path)).toEqual(['C:/album/1.mp4', 'C:/album/2.mp4', 'C:/album/3.mp4', 'C:/album/4.mp4', 'C:/album/6.mp4']);
    expect(view().metaCache[1]).toBeUndefined();
  });
  it('cancels active video requests and ignores decoder completion after unmount', async () => {
    const request = deferred<{
      width: number;
      height: number;
      durationSec: number;
    } | null>();
    probe.mockReturnValue(request.promise);
    await ready([item(1, 'video')]);
    const [[, signal]] = probe.mock.calls;
    unmountHook();
    expect(signal.aborted).toBe(true);
    request.resolve({
      width: 800,
      height: 600,
      durationSec: 20
    });
    await settleHook();
    expect(view().metaCache[1]?.videoUrl).toBeUndefined();
    expect(io.info).toHaveBeenCalledOnce();
  });
  it('deduplicates active and queued loads when externally assigned items share IDs', async () => {
    const request = deferred<string | null>();
    io.thumbnail.mockReturnValue(request.promise);
    await commit();
    view().setItems([item(1), item(1), item(2), item(3), item(4), item(5)]);
    await vi.advanceTimersByTimeAsync(MEDIA_LOAD_DELAY_MS);
    await commit();
    expect(io.thumbnail.mock.calls.filter(([path]) => path === item(1).path)).toHaveLength(1);
    view().setItems([...view().items]);
    await commit();
    expect(io.thumbnail).toHaveBeenCalledTimes(3);
    request.resolve('data:image/png;base64,YQ==');
    await settleHook();
    expect(io.thumbnail.mock.calls.filter(([path]) => path === item(1).path)).toHaveLength(1);
  });
});
describe('album full image and EXIF lifetime', () => {
  it('ignores video originals, commits decoded dimensions, caches the active image and releases others', async () => {
    await commit();
    view().loadFullImage(item(1, 'video'));
    expect(io.full).not.toHaveBeenCalled();
    view().loadFullImage(item(1));
    view().loadFullImage(item(1));
    expect(io.full).toHaveBeenCalledOnce();
    await settleHook();
    images[0].onload?.();
    await commit();
    expect(view().metaCache[1]).toMatchObject({
      dataUrl: 'data:image/jpeg;base64,YWJj',
      width: 4000,
      height: 3000,
      sizeBytes: 3,
      loading: false,
      loadFailed: false
    });
    view().loadFullImage(item(1));
    expect(io.full).toHaveBeenCalledOnce();
    view().loadFullImage(item(2));
    await settleHook();
    images[1].onerror?.();
    await commit();
    expect(view().metaCache[1].dataUrl).toBeUndefined();
    expect(view().metaCache[2]).toMatchObject({
      dataUrl: 'data:image/jpeg;base64,YWJj',
      loading: false,
      loadFailed: false
    });
    expect(view().metaCache[2].width).toBeUndefined();
    view().releaseFullImage();
    await commit();
    expect(view().metaCache[2].dataUrl).toBeUndefined();
    view().releaseFullImage();
    expect(images.every((image) => image.src === '')).toBe(true);
  });
  it('clears stale decode probes and ignores old commit when another image is requested', async () => {
    await commit();
    view().loadFullImage(item(1));
    await settleHook();
    const [old] = images;
    view().loadFullImage(item(2));
    await settleHook();
    old.onload?.();
    expect(view().metaCache[1]?.dataUrl).toBeUndefined();
    view().releaseFullImage();
    expect(images[1]).toMatchObject({
      onload: null,
      onerror: null,
      src: ''
    });
    unmountHook();
    view().releaseFullImage();
  });
  it.each(['empty', 'reject', 'stale-resolve', 'stale-reject'])('handles full-image read %s', async (mode) => {
    const request = deferred<string | null>();
    io.full.mockReturnValue(request.promise);
    await commit();
    view().loadFullImage(item(1));
    if (mode.startsWith('stale')) view().releaseFullImage();
    if (mode.endsWith('reject')) request.reject(new Error('read'));else request.resolve(mode === 'empty' ? null : 'data:image/png;base64,YQ==');
    await settleHook();
    expect(images).toHaveLength(0);
    if (mode === 'reject') {expect(view().metaCache[1]).toMatchObject({
      loadFailed: true,
      loading: false
    });}
  });
  it('cleans a pending image probe on unmount and clears request selection on single and bulk removal', async () => {
    await commit();
    view().setItems([item(1), item(2)]);
    await commit();
    view().loadFullImage(item(1));
    await settleHook();
    view().handleRemove(1);
    images[0].onload?.();
    expect(view().metaCache[1]?.dataUrl).toBeUndefined();
    view().loadFullImage(item(2));
    await settleHook();
    view().handleRemoveSelected(new Set());
    expect(view().items).toHaveLength(1);
    view().handleRemoveSelected(new Set([2]));
    images[1].onload?.();
    expect(view().metaCache[2]?.dataUrl).toBeUndefined();
    view().loadFullImage(item(3));
    await settleHook();
    unmountHook();
    expect(images[2]).toMatchObject({
      onload: null,
      onerror: null,
      src: ''
    });
  });
  it('guards video/non-JPEG EXIF, deduplicates pending reads and caches real parsed metadata', async () => {
    await commit();
    view().loadExifIfNeeded(item(1, 'video'));
    view().loadExifIfNeeded({
      ...item(2),
      ext: 'png'
    });
    expect(io.buffer).not.toHaveBeenCalled();
    view().loadExifIfNeeded(item(1));
    view().loadExifIfNeeded(item(1));
    await settleHook();
    expect(io.buffer).toHaveBeenCalledOnce();
    expect(view().metaCache[1].exif).toEqual({
      make: 'A'
    });
    view().loadExifIfNeeded(item(1));
    expect(io.buffer).toHaveBeenCalledOnce();
    view().loadExifIfNeeded({
      ...item(2),
      ext: 'jpeg'
    });
    await settleHook();
    expect(io.buffer).toHaveBeenCalledTimes(2);
  });
  it.each(['empty', 'invalid', 'reject'])('handles EXIF %s and permits later retry', async (mode) => {
    if (mode === 'empty') io.buffer.mockResolvedValue(null);
    if (mode === 'invalid') io.buffer.mockResolvedValue(Uint8Array.from([0, 1]));
    if (mode === 'reject') io.buffer.mockRejectedValue(new Error('read'));
    await commit();
    view().loadExifIfNeeded(item(1));
    await settleHook();
    expect(view().metaCache[1]?.exif).toBeUndefined();
    io.buffer.mockResolvedValue(jpeg());
    view().loadExifIfNeeded(item(1));
    await settleHook();
    expect(view().metaCache[1].exif).toEqual({
      make: 'A'
    });
  });
  it('guards hover for images and absent video refs, plays/rejects and resets a mounted thumbnail', async () => {
    await commit();
    view().handleThumbMouseEnter(item(1));
    view().handleThumbMouseLeave(item(1));
    view().handleThumbMouseEnter(item(1, 'video'));
    view().handleThumbMouseLeave(item(1, 'video'));
    const video = {
      play: vi.fn<() => Promise<void>>().mockRejectedValue(new Error('blocked')),
      pause: vi.fn(),
      currentTime: 5
    };
    view().gridVideoRefs.current[1] = video as unknown as HTMLVideoElement;
    view().handleThumbMouseEnter(item(1, 'video'));
    await settleHook();
    expect(video.play).toHaveBeenCalledOnce();
    view().handleThumbMouseLeave(item(1, 'video'));
    expect(video.pause).toHaveBeenCalledOnce();
    expect(video.currentTime).toBe(0);
  });
});
