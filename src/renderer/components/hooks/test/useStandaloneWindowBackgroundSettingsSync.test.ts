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
 * @file useStandaloneWindowBackgroundSettingsSync.test.ts
 * @description 独立窗口背景设置真实初始化、原生设置广播、本地同步与卸载竞争测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStandaloneWindowBackgroundSettingsSync } from '../useStandaloneWindowBackgroundSettingsSync';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../test/elementHarness')).hookMocks,
  ...(await import('../../components/test/contentLifecycleHarness')).lifecycleHooks
}));

vi.mock('../../config/dynamicIslandConfig', async () => ({
  ...(await import('../../config/dynamicIslandStorageKeys')),
  ...(await import('../../config/dynamicIslandBackgroundMedia'))
}));
vi.mock('../../config/standaloneWindowConfig', async () => import('../../config/standaloneWindowKeys'));

type Options = Parameters<typeof useStandaloneWindowBackgroundSettingsSync>[0];
const api = {
  storeRead: vi.fn<Window['api']['storeRead']>(),
  onSettingsChanged: vi.fn<Window['api']['onSettingsChanged']>(),
  loadWallpaperFile: vi.fn<Window['api']['loadWallpaperFile']>()
};
const unsubscribe = vi.fn<() => void>();
let options: Options;
let surface: EventTarget;
const values = new Map<string, unknown>();

/**
 * 注册真实 Hook 的 effect 并处理原生 Promise 返回。
 * @returns 异步订阅和背景更新完成。
 */
async function commit(): Promise<void> {
  renderWithHooks(() => useStandaloneWindowBackgroundSettingsSync(options));
  runEffects();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * 通过已注册的真实 IPC 监听器推送设置。
 * @param channel - 原生广播通道。
 * @param value - 外部设置内容。
 */
function broadcast(channel: string, value: unknown): void {
  const [[listener]] = api.onSettingsChanged.mock.calls;
  listener(channel, value);
}

/**
 * 使用实际 EventTarget 发送本地背景同步事件。
 * @param detail - 自定义事件数据。
 */
function local(detail: unknown): void {
  surface.dispatchEvent(new CustomEvent('island-bg-local-sync', { detail }));
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  values.clear();
  api.storeRead.mockReset().mockImplementation((key) => Promise.resolve(values.get(key)));
  api.onSettingsChanged.mockReset().mockReturnValue(unsubscribe);
  api.loadWallpaperFile.mockReset().mockResolvedValue('data:image/png;base64,preview');
  options = {
    setBgVideoFit: vi.fn<Options['setBgVideoFit']>(),
    setBgVideoMuted: vi.fn<Options['setBgVideoMuted']>(),
    setBgVideoLoop: vi.fn<Options['setBgVideoLoop']>(),
    setBgVideoVolume: vi.fn<Options['setBgVideoVolume']>(),
    setBgVideoRate: vi.fn<Options['setBgVideoRate']>(),
    setBgVideoHwDecode: vi.fn<Options['setBgVideoHwDecode']>(),
    setStandaloneMacControls: vi.fn<Options['setStandaloneMacControls']>(),
    applyBgMedia: vi.fn<Options['applyBgMedia']>(),
    applyBgOpacity: vi.fn<Options['applyBgOpacity']>(),
    applyBgBlur: vi.fn<Options['applyBgBlur']>()
  };
  surface = new EventTarget();
  vi.stubGlobal('window', Object.assign(surface, { api }));
});
afterEach(() => {
  unmountHooks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Standalone background initialization', () => {
  it.each([
    { fit: 'cover', boolean: true, volume: 2, rate: 9, expectedVolume: 1, expectedRate: 3 },
    { fit: 'contain', boolean: false, volume: -2, rate: -9, expectedVolume: 0, expectedRate: 0.25 },
    { fit: 'invalid', boolean: 'false', volume: NaN, rate: Infinity, expectedVolume: null, expectedRate: null },
    { fit: undefined, boolean: undefined, volume: '1', rate: '1', expectedVolume: null, expectedRate: null }
  ])('validates saved video settings $fit/$volume/$rate', async ({ fit, boolean, volume, rate, expectedVolume, expectedRate }) => {
    values.set('island-bg-video-fit', fit);
    values.set('island-bg-video-muted', boolean);
    values.set('island-bg-video-loop', boolean);
    values.set('island-bg-video-hw-decode', boolean);
    values.set('standalone-window-mac-controls', boolean);
    values.set('island-bg-video-volume', volume);
    values.set('island-bg-video-rate', rate);
    values.set('island-bg-opacity', 35);
    values.set('island-bg-blur', 7);
    await commit();
    expect(options.applyBgOpacity).toHaveBeenCalledWith(35);
    expect(options.applyBgBlur).toHaveBeenCalledWith(7);
    expect(options.applyBgMedia).toHaveBeenCalledWith(null, null);
    if (fit === 'cover' || fit === 'contain') expect(options.setBgVideoFit).toHaveBeenCalledWith(fit);
    else expect(options.setBgVideoFit).not.toHaveBeenCalled();
    if (typeof boolean === 'boolean') {
      expect(options.setBgVideoMuted).toHaveBeenCalledWith(boolean);
      expect(options.setBgVideoLoop).toHaveBeenCalledWith(boolean);
      expect(options.setBgVideoHwDecode).toHaveBeenCalledWith(boolean);
      expect(options.setStandaloneMacControls).toHaveBeenCalledWith(boolean);
    } else {
      expect(options.setBgVideoMuted).not.toHaveBeenCalled();
      expect(options.setBgVideoLoop).not.toHaveBeenCalled();
      expect(options.setBgVideoHwDecode).not.toHaveBeenCalled();
      expect(options.setStandaloneMacControls).not.toHaveBeenCalled();
    }
    if (expectedVolume === null) expect(options.setBgVideoVolume).not.toHaveBeenCalled();
    else expect(options.setBgVideoVolume).toHaveBeenCalledWith(expectedVolume);
    if (expectedRate === null) expect(options.setBgVideoRate).not.toHaveBeenCalled();
    else expect(options.setBgVideoRate).toHaveBeenCalledWith(expectedRate);
  });

  it.each([
    { media: { type: 'video', source: 'https://video' }, legacy: null, expected: { type: 'video', source: 'https://video' }, url: 'https://video' },
    { media: null, legacy: 'https://image', expected: { type: 'image', source: 'https://image' }, url: 'https://image' },
    { media: null, legacy: '', expected: null, url: null },
    { media: null, legacy: 2, expected: null, url: null }
  ])('resolves persisted media and legacy images', async ({ media, legacy, expected, url }) => {
    values.set('island-bg-media', media);
    values.set('island-bg-image', legacy);
    await commit();
    expect(options.applyBgMedia).toHaveBeenCalledWith(expected, url);
  });

  it('loads local images through the real media resolver and absorbs leaf failures', async () => {
    values.set('island-bg-media', { type: 'image', source: 'C:/wallpaper.png' });
    await commit();
    expect(api.loadWallpaperFile).toHaveBeenCalledWith('C:/wallpaper.png');
    expect(options.applyBgMedia).toHaveBeenCalledWith({ type: 'image', source: 'C:/wallpaper.png' }, 'data:image/png;base64,preview');
    api.loadWallpaperFile.mockRejectedValue(new Error('file unavailable'));
    broadcast('store:island-bg-media', 'C:/missing.png');
    await commit();
    expect(options.applyBgMedia).toHaveBeenCalledTimes(1);
  });

  it('absorbs every initial storage rejection', async () => {
    api.storeRead.mockRejectedValue(new Error('storage unavailable'));
    await commit();
    expect(options.applyBgMedia).not.toHaveBeenCalled();
    expect(options.applyBgOpacity).not.toHaveBeenCalled();
    expect(options.applyBgBlur).not.toHaveBeenCalled();
    expect(options.setStandaloneMacControls).not.toHaveBeenCalled();
  });

  it('ignores all pending storage responses and stale IPC callbacks after unmount', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    api.storeRead.mockReturnValue(new Promise((done) => { resolve = done; }));
    const remove = vi.spyOn(surface, 'removeEventListener');
    renderWithHooks(() => useStandaloneWindowBackgroundSettingsSync(options));
    runEffects();
    unmountHooks();
    resolve?.(true);
    broadcast('store:island-bg-opacity', 1);
    await Promise.resolve();
    await Promise.resolve();
    expect(options.applyBgOpacity).not.toHaveBeenCalled();
    expect(options.applyBgBlur).not.toHaveBeenCalled();
    expect(options.applyBgMedia).not.toHaveBeenCalled();
    expect(options.setStandaloneMacControls).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith('island-bg-local-sync', expect.any(Function));
  });

  it.each(['initial', 'broadcast'])('ignores a file preview resolving after %s unmount', async (origin) => {
    let resolve: ((value: string | null) => void) | undefined;
    api.loadWallpaperFile.mockReturnValue(new Promise((done) => { resolve = done; }));
    if (origin === 'initial') values.set('island-bg-media', 'C:/image.png');
    await commit();
    if (origin === 'broadcast') broadcast('store:island-bg-media', 'C:/image.png');
    expect(api.loadWallpaperFile).toHaveBeenCalled();
    vi.mocked(options.applyBgMedia).mockClear();
    unmountHooks();
    resolve?.('data:image/png;base64,late');
    await Promise.resolve();
    await Promise.resolve();
    expect(options.applyBgMedia).not.toHaveBeenCalled();
  });
});

describe('Standalone settings broadcasts and local events', () => {
  it('clears invalid media and applies valid and missing file previews', async () => {
    await commit();
    broadcast('store:island-bg-media', null);
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    broadcast('store:island-bg-media', 'https://wallpaper');
    await commit();
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'image', source: 'https://wallpaper' }, 'https://wallpaper');
    api.loadWallpaperFile.mockResolvedValue(null);
    broadcast('store:island-bg-media', 'C:/missing.png');
    await commit();
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'image', source: 'C:/missing.png' }, null);
  });

  it('validates all IPC settings and delegates raw opacity and blur values', async () => {
    await commit();
    ['cover', 'contain', 'invalid'].forEach((value) => broadcast('store:island-bg-video-fit', value));
    [true, false, 'invalid'].forEach((value) => {
      broadcast('store:island-bg-video-muted', value);
      broadcast('store:island-bg-video-loop', value);
      broadcast('store:island-bg-video-hw-decode', value);
      broadcast('store:standalone-window-mac-controls', value);
    });
    [-2, 2, 'invalid', Infinity].forEach((value) => {
      broadcast('store:island-bg-video-volume', value);
      broadcast('store:island-bg-video-rate', value);
    });
    broadcast('store:island-bg-opacity', 'raw-opacity');
    broadcast('store:island-bg-blur', 'raw-blur');
    broadcast('unknown', undefined);
    expect(options.setBgVideoFit).toHaveBeenLastCalledWith('contain');
    expect(options.setBgVideoMuted).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoLoop).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoHwDecode).toHaveBeenLastCalledWith(false);
    expect(options.setStandaloneMacControls).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoVolume).toHaveBeenLastCalledWith(1);
    expect(options.setBgVideoRate).toHaveBeenLastCalledWith(2);
    expect(options.applyBgOpacity).toHaveBeenLastCalledWith('raw-opacity');
    expect(options.applyBgBlur).toHaveBeenLastCalledWith('raw-blur');
  });

  it('validates local details and applies explicit media, preview and legacy image payloads', async () => {
    await commit();
    vi.mocked(options.applyBgMedia).mockClear();
    local(null);
    local('invalid');
    local({});
    expect(options.applyBgMedia).not.toHaveBeenCalled();
    local({ media: { type: 'video', source: 'https://movie' }, previewUrl: 'blob:preview' });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'video', source: 'https://movie' }, 'blob:preview');
    local({ media: null });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    local({ previewUrl: 'blob:only' });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, 'blob:only');
    local({ image: 'https://legacy' });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith({ type: 'image', source: 'https://legacy' }, 'https://legacy');
    local({ image: null });
    expect(options.applyBgMedia).toHaveBeenLastCalledWith(null, null);
    local({ opacity: 35, blur: 4, videoFit: 'cover', videoMuted: true, videoLoop: false, videoVolume: 2, videoRate: -2, videoHwDecode: false });
    local({ videoFit: 'contain', videoVolume: -1, videoRate: 4 });
    local({ videoFit: 'invalid', videoMuted: 1, videoLoop: 1, videoVolume: '1', videoRate: '1', videoHwDecode: 1 });
    local({ videoVolume: Infinity, videoRate: NaN });
    expect(options.applyBgOpacity).toHaveBeenLastCalledWith(35);
    expect(options.applyBgBlur).toHaveBeenLastCalledWith(4);
    expect(options.setBgVideoFit).toHaveBeenLastCalledWith('contain');
    expect(options.setBgVideoMuted).toHaveBeenLastCalledWith(true);
    expect(options.setBgVideoLoop).toHaveBeenLastCalledWith(false);
    expect(options.setBgVideoVolume).toHaveBeenLastCalledWith(0);
    expect(options.setBgVideoRate).toHaveBeenLastCalledWith(3);
    expect(options.setBgVideoHwDecode).toHaveBeenLastCalledWith(false);
  });
});
