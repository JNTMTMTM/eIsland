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
 * @file useBackgroundMediaSettingsState.test.ts
 * @description 背景设置真实 Hook 状态、媒体选择、持久化、预览事件及桌面壁纸同步回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useBackgroundMediaSettingsState from '../useBackgroundMediaSettingsState';
import { renderWithHooks, resetLifecycle } from './settingsCoverageHarness';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks,
}));

const storeWrite = vi.fn<(key: string, value: unknown) => Promise<void>>();
const settingsPreview = vi.fn<(key: string, value: unknown) => Promise<void>>();
const openImageDialog = vi.fn<() => Promise<string | null>>();
const openVideoDialog = vi.fn<() => Promise<string | null>>();
const loadWallpaperFile = vi.fn<(path: string) => Promise<string | null>>();
const wallpaperVideoCover = vi.fn<(path: string) => Promise<string | null>>();
const setSystemDesktopWallpaper = vi.fn<(options: unknown) => Promise<boolean>>();
const clearWallpaperCache = vi.fn<() => Promise<void>>();
const dispatchEvent = vi.fn<(event: CustomEvent<Record<string, unknown>>) => boolean>();
const layer = { style: { backgroundImage: '', opacity: '', filter: '' } };
const getElementById = vi.fn<(id: string) => typeof layer | null>();
const api = { storeWrite, settingsPreview, openImageDialog, openVideoDialog, loadWallpaperFile, wallpaperVideoCover, setSystemDesktopWallpaper, clearWallpaperCache };
const location = { href: 'https://app.example/view/index.html' };

/**
 * 求值真实背景设置 Hook 并保留公开状态。
 * @returns Hook 当前返回值。
 */
function render() {
  return renderWithHooks(() => useBackgroundMediaSettingsState());
}
/**
 * 开启公开的系统壁纸同步设置后重新渲染。
 * @returns 捕获新同步设置的真实回调。
 */
function enableSync() {
  render().setSyncDesktopWallpaperOnBackgroundChange(true);
  return render();
}
/**
 * 等待实际 fire-and-forget 壁纸同步链消费 Promise。
 * @returns 异步操作等待句柄。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  storeWrite.mockReset().mockResolvedValue(undefined);
  settingsPreview.mockReset().mockResolvedValue(undefined);
  openImageDialog.mockReset().mockResolvedValue('C:\\background.png');
  openVideoDialog.mockReset().mockResolvedValue('C:\\background.mp4');
  loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,preview');
  wallpaperVideoCover.mockReset().mockResolvedValue(null);
  setSystemDesktopWallpaper.mockReset().mockResolvedValue(true);
  clearWallpaperCache.mockReset().mockResolvedValue(undefined);
  dispatchEvent.mockReturnValue(true);
  getElementById.mockReset().mockReturnValue(layer);
  Object.assign(layer.style, { backgroundImage: '', opacity: '', filter: '' });
  location.href = 'https://app.example/view/index.html';
  vi.stubGlobal('document', { getElementById });
  vi.stubGlobal('window', { api, location, dispatchEvent });
});
afterEach(() => vi.unstubAllGlobals());

describe('real background media state and preview application', () => {
  it('initializes all public values and preserves timer refs while updating settings', () => {
    const current = render();
    expect(current.bgMedia).toBeNull();
    expect(current.bgMediaPreviewUrl).toBeNull();
    expect(current.bgVideoFit).toBe('cover');
    expect(current.bgVideoMuted).toBe(true);
    expect(current.bgVideoLoop).toBe(true);
    expect(current.bgVideoVolume).toBe(0.6);
    expect(current.bgVideoRate).toBe(1);
    expect(current.bgVideoHwDecode).toBe(true);
    expect(current.syncDesktopWallpaperOnBackgroundChange).toBe(false);
    expect(current.bgImageOpacity).toBe(30);
    expect(current.bgImageBlur).toBe(0);
    expect(current.bgOpacitySaveTimerRef.current).toBeNull();
    expect(current.bgBlurSaveTimerRef.current).toBeNull();
    current.setBgVideoFit('contain');
    current.setBgVideoMuted(false);
    current.setBgVideoLoop(false);
    current.setBgVideoVolume(0.4);
    current.setBgVideoRate(2);
    current.setBgVideoHwDecode(false);
    current.setBgImageOpacity(75);
    current.setBgImageBlur(4);
    const next = render();
    expect(next.bgOpacitySaveTimerRef).toBe(current.bgOpacitySaveTimerRef);
    expect(next.bgBlurSaveTimerRef).toBe(current.bgBlurSaveTimerRef);
    expect([next.bgVideoFit, next.bgVideoMuted, next.bgVideoLoop, next.bgVideoVolume, next.bgVideoRate, next.bgVideoHwDecode, next.bgImageOpacity, next.bgImageBlur]).toEqual(['contain', false, false, 0.4, 2, false, 75, 4]);
  });
  it('applies image and video styles with the current opacity and blur and publishes actual event details', () => {
    render().setBgImageOpacity(75);
    render().setBgImageBlur(4);
    const current = render();
    const image = { type: 'image' as const, source: 'image.png' };
    current.applyBgMedia(image, '/image.png');
    expect(layer.style).toEqual({ backgroundImage: 'url(/image.png)', opacity: '0.75', filter: 'blur(4px)' });
    expect(render().bgMedia).toEqual(image);
    expect(render().bgMediaPreviewUrl).toBe('/image.png');
    expect(dispatchEvent.mock.lastCall?.[0].type).toBe('island-bg-local-sync');
    expect(dispatchEvent.mock.lastCall?.[0].detail).toEqual({ media: image, previewUrl: '/image.png', image: '/image.png' });
    const video = { type: 'video' as const, source: 'video.mp4' };
    current.applyBgMedia(video, '/video.mp4');
    expect(layer.style).toEqual({ backgroundImage: '', opacity: '0.75', filter: 'blur(4px)' });
    expect(dispatchEvent.mock.lastCall?.[0].detail).toEqual({ media: video, previewUrl: '/video.mp4', image: null });
  });
  it('hides absent media or absent previews and works without a rendered background layer', () => {
    const current = render();
    current.applyBgMedia({ type: 'image', source: 'image.png' }, null);
    expect(layer.style).toEqual({ backgroundImage: '', opacity: '0', filter: 'none' });
    current.applyBgMedia({ type: 'video', source: 'video.mp4' }, null);
    current.applyBgMedia(null, null);
    getElementById.mockReturnValue(null);
    current.applyBgMedia({ type: 'image', source: 'next.png' }, '/next.png');
    expect(render().bgMediaPreviewUrl).toBe('/next.png');
    expect(dispatchEvent.mock.lastCall?.[0].detail.image).toBe('/next.png');
  });
  it('applies opacity and both blur branches with and without an existing layer', () => {
    const current = render();
    current.applyBgOpacity(50);
    expect(layer.style.opacity).toBe('0.5');
    current.applyBgBlur(3);
    expect(layer.style.filter).toBe('blur(3px)');
    current.applyBgBlur(0);
    expect(layer.style.filter).toBe('none');
    getElementById.mockReturnValue(null);
    current.applyBgOpacity(80);
    current.applyBgBlur(2);
    expect(dispatchEvent.mock.calls.map(([event]) => event.detail)).toEqual([{ opacity: 50 }, { blur: 3 }, { blur: 0 }, { opacity: 80 }, { blur: 2 }]);
  });
  it('publishes fit, playback and hardware settings and clamps volume/rate boundaries', () => {
    const current = render();
    current.applyBgVideoFit('contain');
    current.applyBgVideoMuted(false);
    current.applyBgVideoLoop(false);
    current.applyBgVideoHwDecode(false);
    current.applyBgVideoVolume(-1);
    current.applyBgVideoVolume(2);
    current.applyBgVideoVolume(0.4);
    current.applyBgVideoRate(0);
    current.applyBgVideoRate(10);
    current.applyBgVideoRate(1.5);
    expect(dispatchEvent.mock.calls.map(([event]) => event.detail)).toEqual([{ videoFit: 'contain' }, { videoMuted: false }, { videoLoop: false }, { videoHwDecode: false }, { videoVolume: 0 }, { videoVolume: 1 }, { videoVolume: 0.4 }, { videoRate: 0.25 }, { videoRate: 3 }, { videoRate: 1.5 }]);
  });
});

describe('public persistence handlers', () => {
  it.each([false, true])('writes every setting and consumes storage rejection=%s', async (reject) => {
    if (reject) storeWrite.mockRejectedValue(new Error('storage write'));
    const current = render();
    current.persistBgMedia({ type: 'image', source: 'image.png' });
    current.persistBgMedia({ type: 'video', source: 'video.mp4' });
    current.persistBgMedia(null);
    current.persistBgVideoFit('contain');
    current.persistBgVideoMuted(false);
    current.persistBgVideoLoop(false);
    current.persistBgVideoVolume(2);
    current.persistBgVideoRate(0);
    current.persistBgVideoHwDecode(false);
    current.persistBgOpacity(50);
    current.persistBgBlur(3);
    await settle();
    expect(storeWrite.mock.calls).toEqual([
      ['island-bg-media', { type: 'image', source: 'image.png' }], ['island-bg-image', 'image.png'],
      ['island-bg-media', { type: 'video', source: 'video.mp4' }], ['island-bg-image', null],
      ['island-bg-media', null], ['island-bg-image', null],
      ['island-bg-video-fit', 'contain'], ['island-bg-video-muted', false], ['island-bg-video-loop', false],
      ['island-bg-video-volume', 1], ['island-bg-video-rate', 0.25], ['island-bg-video-hw-decode', false],
      ['island-bg-opacity', 50], ['island-bg-blur', 3],
    ]);
  });
});

describe('image/video picker, marketplace and clear actions', () => {
  it('stops image selection after cancellation or an unreadable file', async () => {
    const current = render();
    openImageDialog.mockResolvedValue(null);
    await current.handleSelectBgImage();
    expect(loadWallpaperFile).not.toHaveBeenCalled();
    openImageDialog.mockResolvedValue('missing.png');
    loadWallpaperFile.mockResolvedValue(null);
    await current.handleSelectBgImage();
    expect(storeWrite).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it('selects an image and leaves desktop settings alone when synchronization is off', async () => {
    await render().handleSelectBgImage();
    expect(render().bgMedia).toEqual({ type: 'image', source: 'C:\\background.png' });
    expect(loadWallpaperFile).toHaveBeenCalledWith('C:\\background.png');
    expect(storeWrite).toHaveBeenCalledWith('island-bg-image', 'C:\\background.png');
    expect(setSystemDesktopWallpaper).not.toHaveBeenCalled();
  });
  it('propagates picker and image read failures without applying partial media', async () => {
    const current = render();
    openImageDialog.mockRejectedValue(new Error('dialog'));
    await expect(current.handleSelectBgImage()).rejects.toThrow('dialog');
    openImageDialog.mockResolvedValue('local.png');
    loadWallpaperFile.mockRejectedValue(new Error('read'));
    await expect(current.handleSelectBgImage()).rejects.toThrow('read');
    openVideoDialog.mockRejectedValue(new Error('video dialog'));
    await expect(current.handleSelectBgVideo()).rejects.toThrow('video dialog');
    expect(storeWrite).not.toHaveBeenCalled();
  });
  it('stops a cancelled video picker and resolves an actual local video protocol URL', async () => {
    const current = render();
    openVideoDialog.mockResolvedValue(null);
    await current.handleSelectBgVideo();
    expect(storeWrite).not.toHaveBeenCalled();
    openVideoDialog.mockResolvedValue('C:\\背景.mp4');
    await current.handleSelectBgVideo();
    expect(render().bgMediaPreviewUrl).toBe('eisland-media://local/C%3A%2F%E8%83%8C%E6%99%AF.mp4');
    expect(storeWrite).toHaveBeenCalledWith('island-bg-image', null);
  });
  it('applies a builtin image and its default opacity through real state and persistence', () => {
    render().handleSelectBuiltinBgImage('/builtin.png', 45);
    expect(render().bgImageOpacity).toBe(45);
    expect(render().bgMedia).toEqual({ type: 'image', source: '/builtin.png' });
    expect(layer.style.opacity).toBe('0.45');
    expect(storeWrite).toHaveBeenCalledWith('island-bg-opacity', 45);
  });
  it('ignores empty marketplace addresses and supports absent, image and video options', async () => {
    const current = render();
    current.handleApplyMarketplaceWallpaper('');
    expect(storeWrite).not.toHaveBeenCalled();
    current.handleApplyMarketplaceWallpaper('/image.png');
    current.handleApplyMarketplaceWallpaper('/another.png', {});
    current.handleApplyMarketplaceWallpaper('/explicit.png', { type: 'image' });
    current.handleApplyMarketplaceWallpaper('/video.mp4', { type: 'video' });
    await settle();
    expect(render().bgMedia).toEqual({ type: 'video', source: '/video.mp4' });
    expect(settingsPreview.mock.calls).toEqual([
      ['store:island-bg-image', '/image.png'], ['store:island-bg-media', { type: 'image', source: '/image.png' }],
      ['store:island-bg-image', '/another.png'], ['store:island-bg-media', { type: 'image', source: '/another.png' }],
      ['store:island-bg-image', '/explicit.png'], ['store:island-bg-media', { type: 'image', source: '/explicit.png' }],
      ['store:island-bg-media', { type: 'video', source: '/video.mp4' }],
    ]);
  });
  it('consumes preview rejections for both marketplace image and media updates', async () => {
    settingsPreview.mockRejectedValue(new Error('preview'));
    render().handleApplyMarketplaceWallpaper('/image.png');
    await settle();
    expect(settingsPreview).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])('clears state, legacy image, preview, wallpaper and cache with rejection=%s', async (reject) => {
    if (reject) {
      storeWrite.mockRejectedValue(new Error('store'));
      settingsPreview.mockRejectedValue(new Error('preview'));
      setSystemDesktopWallpaper.mockRejectedValue(new Error('wallpaper'));
      clearWallpaperCache.mockRejectedValue(new Error('cache'));
    }
    render().handleClearBgImage();
    await settle();
    expect(render().bgMedia).toBeNull();
    expect(render().bgMediaPreviewUrl).toBeNull();
    expect(settingsPreview).toHaveBeenCalledWith('store:island-bg-image', null);
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ clear: true });
    expect(clearWallpaperCache).toHaveBeenCalledOnce();
  });
  it('clears successfully when the optional cache-clear API is absent', () => {
    vi.stubGlobal('window', { dispatchEvent, location, api: { ...api, clearWallpaperCache: undefined } });
    render().handleClearBgImage();
    expect(clearWallpaperCache).not.toHaveBeenCalled();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ clear: true });
  });
});

describe('desktop wallpaper synchronization through actual public actions', () => {
  it('synchronizes a selected local image with its decoded data preview', async () => {
    await enableSync().handleSelectBgImage();
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: 'C:\\background.png', previewUrl: 'data:image/png;base64,preview' });
  });
  it.each(['data:image/png;base64,remote', 'http://example/image', 'https://example/image', 'file:///C:/image.png'])('uses trimmed absolute preview %s without deriving a local source path', async (source) => {
    enableSync().handleSelectBuiltinBgImage(` ${source} `, 30);
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: ` ${source} `, previewUrl: source });
  });
  it('normalizes relative builtin previews against the current page URL', async () => {
    enableSync().handleSelectBuiltinBgImage('/builtin.png', 30);
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: null, previewUrl: 'https://app.example/builtin.png' });
  });
  it('preserves a relative preview when the page URL is unusable and consumes desktop failures', async () => {
    location.href = 'invalid-base';
    setSystemDesktopWallpaper.mockRejectedValue(new Error('wallpaper'));
    enableSync().handleSelectBuiltinBgImage('relative.png', 30);
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: 'relative.png', previewUrl: 'relative.png' });
  });
  it.each(['', '   '])('normalizes an empty builtin preview %j to null', async (source) => {
    enableSync().handleSelectBuiltinBgImage(source, 30);
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: source, previewUrl: null });
  });
  it.each([false, true])('uses a local video cover and consumes cover wallpaper rejection=%s', async (reject) => {
    wallpaperVideoCover.mockResolvedValue('C:\\cover.png');
    if (reject) setSystemDesktopWallpaper.mockRejectedValue(new Error('wallpaper'));
    await enableSync().handleSelectBgVideo();
    await settle();
    expect(wallpaperVideoCover).toHaveBeenCalledWith('C:\\background.mp4');
    expect(setSystemDesktopWallpaper).toHaveBeenCalledTimes(1);
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: 'C:\\cover.png', previewUrl: 'C:\\cover.png' });
  });
  it.each([false, true])('falls back to actual video preview when cover is absent or rejection=%s', async (reject) => {
    if (reject) wallpaperVideoCover.mockRejectedValue(new Error('cover'));
    await enableSync().handleSelectBgVideo();
    await settle();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: 'C:\\background.mp4', previewUrl: 'eisland-media://local/C%3A%2Fbackground.mp4' });
  });
  it('synchronizes remote marketplace video without reading a local cover', async () => {
    enableSync().handleApplyMarketplaceWallpaper('https://example/video.mp4', { type: 'video' });
    await settle();
    expect(wallpaperVideoCover).not.toHaveBeenCalled();
    expect(setSystemDesktopWallpaper).toHaveBeenCalledWith({ sourcePath: null, previewUrl: 'https://example/video.mp4' });
  });
});
