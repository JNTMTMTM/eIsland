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
 * @file albumMediaIntegration.test.tsx
 * @description 相册轮播真实 videoProbe 工具与原生视频、画布叶边界的封面生成、失败和卸载集成测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumCarouselWidget } from '../AlbumCarouselWidget';
import { byClass } from '../../../../../../test/tree';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(),
  getAlbumMediaInfo: vi.fn<Window['api']['getAlbumMediaInfo']>(),
  loadWallpaperFile: vi.fn<Window['api']['loadWallpaperFile']>()
};
const drawImage = vi.fn();
const pause = vi.fn<() => void>();
const load = vi.fn<() => void>();
const removeAttribute = vi.fn<(key: string) => void>();
const toDataURL = vi.fn<(mime: string, quality: number) => string>();
const open = vi.fn<() => void>();
let video: { src: string; videoWidth: number; videoHeight: number; duration: number; onloadeddata: (() => void) | null; pause: typeof pause; load: typeof load; removeAttribute: typeof removeAttribute };
let canvas: { width: number; height: number; getContext: () => { drawImage: typeof drawImage }; toDataURL: typeof toDataURL };
/**
 * 渲染并提交真实相册异步与媒体 effect。
 * @returns 当前相册元素树。
 */
async function commit() {
  renderWithHooks(() => AlbumCarouselWidget({ openAlbumPage: open }));
  runEffects();
  await Array.from({ length: 12 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  renderWithHooks(() => AlbumCarouselWidget({ openAlbumPage: open }));
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  return renderWithHooks(() => AlbumCarouselWidget({ openAlbumPage: open }));
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  api.storeRead.mockImplementation((key) => Promise.resolve(key === 'photo-album-items' ? [{ id: 1, path: 'C:/video.mp4', name: 'Video', mediaType: 'video', ext: 'mp4', addedAt: 1 }] : { autoRotate: false }));
  api.onSettingsChanged.mockReturnValue(() => undefined);
  api.getAlbumMediaInfo.mockResolvedValue({ url: 'eisland-media://album/video', sizeBytes: 10 });
  toDataURL.mockReturnValue('data:image/jpeg;base64,poster');
  video = { pause, load, removeAttribute, src: '', videoWidth: 1280, videoHeight: 720, duration: 3, onloadeddata: null };
  canvas = { toDataURL, width: 0, height: 0, getContext: () => ({ drawImage }) };
  vi.stubGlobal('document', { createElement: (tag: string) => tag === 'video' ? video : canvas });
  vi.stubGlobal('window', { setTimeout, clearTimeout, api });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('AlbumCarouselWidget real probeVideo integration', () => {
  it('generates a real scaled poster and releases native decoder and canvas resources', async () => {
    await commit();
    vi.advanceTimersByTime(680);
    await commit();
    expect(video.src).toBe('eisland-media://album/video');
    video.onloadeddata?.();
    const root = await commit();
    expect(byClass(root, 'ov-dash-album-video').props.poster).toBe('data:image/jpeg;base64,poster');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360);
    expect(pause).toHaveBeenCalledOnce();
    expect(removeAttribute).toHaveBeenCalledWith('src');
    expect(load).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('keeps native video playback available when canvas capture fails', async () => {
    toDataURL.mockImplementation(() => { throw new Error('tainted canvas'); });
    await commit();
    vi.advanceTimersByTime(680);
    await commit();
    video.onloadeddata?.();
    const root = await commit();
    expect(byClass(root, 'ov-dash-album-video').props.src).toBe('eisland-media://album/video');
    expect(byClass(root, 'ov-dash-album-video').props.poster).toBeUndefined();
    expect(pause).toHaveBeenCalledOnce();
  });
  it('aborts the real metadata probe on unmount and removes its timeout', async () => {
    await commit();
    vi.advanceTimersByTime(680);
    await commit();
    expect(vi.getTimerCount()).toBe(1);
    unmountHooks();
    expect(pause).toHaveBeenCalledOnce();
    expect(video.onloadeddata).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
