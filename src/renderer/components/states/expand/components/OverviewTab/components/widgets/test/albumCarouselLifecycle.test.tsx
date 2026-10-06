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
 * @file albumCarouselLifecycle.test.tsx
 * @description 真实相册轮播组件的持久化监听、筛选、媒体解码取消、封面缓存、手动与自动轮播测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../maxExpand/components/album/hooks/test/albumHookHarness';
import { byClass, find, invoke, text, elements } from '../../../../../../test/tree';
import { PHOTO_ALBUM_STORE_KEY, OVERVIEW_ALBUM_CONFIG_STORE_KEY, OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS } from '../../../utils/overviewUtils';
import type { OverviewAlbumItem, OverviewAlbumCardConfig } from '../../../utils/overviewUtils';
const probe = vi.hoisted(() => vi.fn<(url: string, signal: AbortSignal, capture: boolean) => Promise<{
  poster?: string;
} | null>>());
vi.mock('../../../../../../../../utils/media/videoProbe', () => ({
  default: probe
}));
const {
  AlbumCarouselWidget
} = await import('../AlbumCarouselWidget');
const cache = new Map<string, unknown>();
const listeners: Array<(channel: string, value: unknown) => void> = [];
const unsubscribe = vi.fn();
const read = vi.fn<(key: string) => Promise<unknown>>();
const load = vi.fn<(path: string) => Promise<string | null>>();
const info = vi.fn<(path: string) => Promise<{
  url: string;
  sizeBytes: number;
} | null>>();
const open = vi.fn();
/** 构造持久化媒体条目。
 * @param id - 条目 ID
 * @param mediaType - 媒体类型
 * @returns 真实归一化输入
 */
function item(id: number, mediaType: 'image' | 'video' = 'image'): OverviewAlbumItem {
  return {
    id,
    mediaType,
    path: `C:/${  id  }${mediaType === 'image' ? '.jpg' : '.mp4'}`,
    name: `item-${  id}`,
    ext: mediaType === 'image' ? 'jpg' : 'mp4',
    addedAt: id
  };
}
/** 执行真实组件。
 * @returns 组件元素树
 */
function view() {
  return renderHook(AlbumCarouselWidget, {
    openAlbumPage: open
  });
}
/** 提交 effect 和叶服务 Promise。
 * @returns 最新组件元素树
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
/** 模拟已注册的 IPC 设置通知。
 * @param channel - IPC 通道
 * @param value - 新设置
 */
function notify(channel: string, value: unknown): void {
  listeners.forEach((callback) => callback(channel, value));
}
/** 变更真实配置并提交状态。
 * @param value - 新配置
 * @returns 最新组件树
 */
async function config(value: Partial<OverviewAlbumCardConfig>) {
  notify(`store:${  OVERVIEW_ALBUM_CONFIG_STORE_KEY}`, value);
  return commit();
}
/** 触发组件实际导航按钮。
 * @param direction - 导航方向
 */
function navigate(direction: 'prev' | 'next'): void {
  invoke(find(view(), (node) => node.props.title === `overview.album.${  direction}`), 'onClick');
}
beforeEach(() => {
  vi.useFakeTimers();
  resetHook();
  cache.clear();
  cache.set(OVERVIEW_ALBUM_CONFIG_STORE_KEY, {
    autoRotate: false
  });
  listeners.length = 0;
  unsubscribe.mockReset();
  read.mockReset();
  read.mockImplementation((key) => Promise.resolve(cache.get(key) ?? null));
  load.mockReset();
  load.mockImplementation((path) => Promise.resolve(`data:image/jpeg;base64,${  path}`));
  info.mockReset();
  info.mockImplementation((path) => Promise.resolve({
    url: `eisland-media:${  path}`,
    sizeBytes: 100
  }));
  probe.mockReset();
  probe.mockResolvedValue({
    poster: 'data:image/jpeg;base64,poster'
  });
  open.mockReset();
  vi.stubGlobal('window', {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    api: {
      storeRead: read,
      loadWallpaperFile: load,
      getAlbumMediaInfo: info,
      onSettingsChanged: (callback: (channel: string, value: unknown) => void) => {
        listeners.push(callback);
        return unsubscribe;
      }
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
describe('album carousel stores and navigation', () => {
  it('renders empty storage, accepts item notifications, ignores other channels and clamps removed indexes', async () => {
    await commit();
    expect(text(view())).toContain('overview.album.empty');
    notify('unrelated', [item(1)]);
    await commit();
    expect(text(view())).toContain('overview.album.empty');
    notify(`store:${  PHOTO_ALBUM_STORE_KEY}`, [item(1), item(2), item(3)]);
    await commit();
    navigate('prev');
    await commit();
    expect(text(view())).toContain('item-3');
    notify(`store:${  PHOTO_ALBUM_STORE_KEY}`, [item(1)]);
    await commit();
    expect(text(view())).toContain('item-1');
    navigate('prev');
    navigate('next');
    expect(text(view())).toContain('item-1');
    notify(`store:${  PHOTO_ALBUM_STORE_KEY}`, []);
    await commit();
    expect(text(view())).toContain('overview.album.empty');
    invoke(byClass(view(), 'ov-dash-widget-title'), 'onClick');
    expect(open).toHaveBeenCalledOnce();
  });
  it.each(['image', 'video'] as const)('filters normalized %s media and updates config from IPC', async (mediaFilter) => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1), item(2, 'video')]);
    await commit();
    await config({
      mediaFilter,
      autoRotate: false
    });
    expect(text(view())).toContain(mediaFilter === 'image' ? 'item-1' : 'item-2');
    expect(text(view())).not.toContain(mediaFilter === 'image' ? 'item-2' : 'item-1');
    await config({
      mediaFilter: 'all',
      autoRotate: false
    });
    expect(text(view())).toContain('item-1');
  });
  it('catches failed item/config reads and uses real default config', async () => {
    read.mockRejectedValue(new Error('store'));
    await commit();
    notify(`store:${  PHOTO_ALBUM_STORE_KEY}`, [item(1), item(2)]);
    await commit();
    expect(vi.getTimerCount()).toBe(2);
    notify('unrelated-config', {
      autoRotate: false
    });
    expect(vi.getTimerCount()).toBe(2);
  });
  it.each(['resolve', 'reject'])('ignores late store reads and queued IPC notifications after unmount %s', async (mode) => {
    const request = deferred<unknown>();
    read.mockReturnValue(request.promise);
    view();
    flushHookEffects();
    unmountHook();
    if (mode === 'resolve') request.resolve([item(1)]);else request.reject(new Error('late'));
    await settleHook();
    notify(`store:${  PHOTO_ALBUM_STORE_KEY}`, [item(1)]);
    notify(`store:${  OVERVIEW_ALBUM_CONFIG_STORE_KEY}`, {
      autoRotate: true
    });
    expect(text(view())).toContain('overview.album.empty');
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('wraps both navigation directions and prevents control clicks from bubbling', async () => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1), item(2)]);
    await commit();
    navigate('prev');
    await commit();
    expect(text(view())).toContain('item-2');
    expect(byClass(view(), 'ov-dash-album-media').props.className).toContain('--prev');
    navigate('next');
    await commit();
    expect(text(view())).toContain('item-1');
    const stopPropagation = vi.fn();
    invoke(byClass(view(), 'ov-dash-album-controls'), 'onClick', {
      stopPropagation
    });
    expect(stopPropagation).toHaveBeenCalledOnce();
    invoke(byClass(view(), 'ov-dash-album-card'), 'onClick');
    expect(open).toHaveBeenCalledOnce();
    await config({
      autoRotate: false,
      clickBehavior: 'none'
    });
    expect(byClass(view(), 'ov-dash-album-card').props).toMatchObject({
      onClick: undefined,
      title: ''
    });
    invoke(byClass(view(), 'ov-dash-album-btn-play'), 'onClick');
    expect(byClass(view(), 'ov-dash-album-btn-play').props.disabled).toBe(true);
  });
  it('avoids the current item in both manual random directions', async () => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1), item(2)]);
    await commit();
    await config({
      autoRotate: false,
      orderMode: 'random'
    });
    const random = vi.spyOn(Math, 'random');
    random.mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    navigate('next');
    await commit();
    expect(text(view())).toContain('item-2');
    random.mockReturnValueOnce(0.9).mockReturnValueOnce(0);
    navigate('prev');
    await commit();
    expect(text(view())).toContain('item-1');
    expect(random).toHaveBeenCalledTimes(4);
  });
  it.each(['sequential', 'random'] as const)('runs and pauses/resumes %s auto rotation and clears timers', async (orderMode) => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1), item(2)]);
    await commit();
    await config({
      orderMode,
      autoRotate: true,
      intervalMs: 3000
    });
    if (orderMode === 'random') vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.9);
    await vi.advanceTimersByTimeAsync(3000);
    await commit();
    expect(text(view())).toContain('item-2');
    invoke(byClass(view(), 'ov-dash-album-btn-play'), 'onClick');
    await commit();
    expect(vi.getTimerCount()).toBe(0);
    expect(byClass(view(), 'ov-dash-album-btn-play').props.title).toBe('overview.album.play');
    invoke(byClass(view(), 'ov-dash-album-btn-play'), 'onClick');
    await commit();
    expect(vi.getTimerCount()).toBe(1);
    unmountHook();
    expect(vi.getTimerCount()).toBe(0);
  });
});
describe('album carousel media lifetime', () => {
  it.each(['success', 'empty', 'reject'])('loads image preview %s', async (mode) => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1)]);
    if (mode === 'empty') load.mockResolvedValue(null);
    if (mode === 'reject') load.mockRejectedValue(new Error('read'));
    await commit();
    expect(elements(view()).some((node) => node.type === 'img' && node.props.alt === 'item-1')).toBe(mode === 'success');
    if (mode !== 'success') expect(byClass(view(), 'ov-dash-album-fallback')).toBeDefined();
  });
  it('ignores pending image completion after moving to a video and waits for delayed video decode', async () => {
    const request = deferred<string | null>();
    load.mockReturnValue(request.promise);
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1), item(2, 'video')]);
    await commit();
    navigate('next');
    await commit();
    request.resolve('data:image/jpeg;base64,old');
    await settleHook();
    expect(elements(view()).some((node) => node.type === 'img' && node.props.alt === 'item-1')).toBe(false);
    expect(info).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);
    await commit();
    expect(info).toHaveBeenCalledWith(item(2, 'video').path);
    expect(find(view(), (node) => node.type === 'video').props).toMatchObject({
      muted: true,
      autoPlay: true,
      poster: 'data:image/jpeg;base64,poster',
      src: 'eisland-media:C:/2.mp4'
    });
    expect(probe).toHaveBeenCalledWith('eisland-media:C:/2.mp4', expect.any(AbortSignal), true);
  });
  it.each(['no-info', 'info-reject', 'no-poster', 'probe-reject'])('handles video preview %s', async (mode) => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1, 'video')]);
    if (mode === 'no-info') info.mockResolvedValue(null);
    if (mode === 'info-reject') info.mockRejectedValue(new Error('read'));
    if (mode === 'no-poster') probe.mockResolvedValue(null);
    if (mode === 'probe-reject') probe.mockRejectedValue(new Error('probe'));
    await commit();
    await vi.advanceTimersByTimeAsync(OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);
    await commit();
    const videos = elements(view()).filter((node) => node.type === 'video');
    expect(videos.length).toBe(mode === 'no-info' || mode === 'info-reject' ? 0 : 1);
    if (videos.length) expect(videos[0].props.poster).toBeUndefined();
  });
  it('ignores pending video info and aborts its signal after unmount', async () => {
    const request = deferred<{
      url: string;
      sizeBytes: number;
    } | null>();
    info.mockReturnValue(request.promise);
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1, 'video')]);
    await commit();
    await vi.advanceTimersByTimeAsync(OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);
    await commit();
    unmountHook();
    request.resolve({
      url: 'media://late',
      sizeBytes: 1
    });
    await settleHook();
    expect(probe).not.toHaveBeenCalled();
    expect(elements(view()).some((node) => node.type === 'video')).toBe(false);
  });
  it('ignores decoder completion after switching away and preserves only the current poster', async () => {
    const request = deferred<{
      poster?: string;
    } | null>();
    probe.mockReturnValue(request.promise);
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1, 'video'), item(2)]);
    await commit();
    await vi.advanceTimersByTimeAsync(OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);
    await commit();
    const [[, signal]] = probe.mock.calls;
    navigate('next');
    await commit();
    expect(signal.aborted).toBe(true);
    request.resolve({
      poster: 'late-poster'
    });
    await settleHook();
    expect(elements(view()).some((node) => node.props.poster === 'late-poster')).toBe(false);
  });
  it('uses cached poster during re-entry and source changes, showing poster before fresh preview', async () => {
    cache.set(PHOTO_ALBUM_STORE_KEY, [item(1, 'video'), item(2, 'video')]);
    await commit();
    await vi.advanceTimersByTimeAsync(OVERVIEW_ALBUM_MEDIA_LOAD_DELAY_MS);
    await commit();
    const request = deferred<{
      url: string;
      sizeBytes: number;
    } | null>();
    info.mockReturnValue(request.promise);
    navigate('next');
    await commit();
    navigate('prev');
    await commit();
    const poster = find(view(), (node) => node.type === 'img' && node.props.alt === 'item-1');
    expect(poster.props.src).toBe('data:image/jpeg;base64,poster');
    request.resolve({
      url: 'media://restored',
      sizeBytes: 1
    });
    await commit();
    expect(probe).toHaveBeenCalledOnce();
    expect(find(view(), (node) => node.type === 'video').props.poster).toBe('data:image/jpeg;base64,poster');
    await config({
      autoRotate: false,
      videoAutoPlay: false,
      videoMuted: false
    });
    expect(find(view(), (node) => node.type === 'video').props).toMatchObject({
      muted: false,
      autoPlay: false
    });
  });
});
