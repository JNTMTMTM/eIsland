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
 * @file useSettingsSyncEffects.test.ts
 * @description 设置跨窗口及本地事件同步、媒体迟到结果、非法值隔离和监听清理回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsSyncEffects } from '../useSettingsSyncEffects';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
import type { Mock } from 'vitest';
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
const setterNames = ["setActiveTab", "setAboutInitialPage", "setUserInitialProfilePage", "setAppSettingsPage", "setAppLanguage", "setStandaloneMacControls", "setBgImageOpacity", "setBgImageBlur", "setBgMedia", "setBgMediaPreviewUrl", "setBgVideoFit", "setBgVideoMuted", "setBgVideoLoop", "setBgVideoVolume", "setBgVideoRate", "setBgVideoHwDecode", "setSyncDesktopWallpaperOnBackgroundChange", "setIslandPositionLocked", "setAutoDimEnabled", "setAutoDimDelaySec", "setAutoHideFullscreenWindowsState", "setWhitelist", "setLyricsKaraoke", "setUpdateSource"] as const;
const setters = Object.fromEntries(setterNames.map((name) => [name, vi.fn<(value: unknown) => void>()])) as Record<typeof setterNames[number], Mock<(value: unknown) => void>>;
const unsubscribe = vi.fn();
const removeEventListener = vi.fn();
let changed: ((channel: string, value: unknown) => void) | undefined;
let localIntent: ((event: Event) => void) | undefined;
const api = {
  onSettingsChanged: vi.fn<(callback: (channel: string, value: unknown) => void) => () => void>(),
  storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>(),
  loadWallpaperFile: vi.fn<(path: string) => Promise<string | null>>()
};
/**
 * 等待实际媒体解析和事件回调队列。
 * @returns 异步回调处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  changed = undefined;
  localIntent = undefined;
  api.onSettingsChanged.mockImplementation((callback) => {
    changed = callback;
    return unsubscribe;
  });
  api.storeWrite.mockResolvedValue(undefined);
  api.loadWallpaperFile.mockResolvedValue('data:preview');
  vi.stubGlobal('window', {
    api,
    removeEventListener,
    addEventListener: (type: string, callback: (event: Event) => void) => {
      if (type === 'settings-open-tab-intent') localIntent = callback;
    }
  });
  renderWithHooks(() => useSettingsSyncEffects(setters));
  runEffects();
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
const intents = [{
  intent: 'update',
  tab: 'update'
}, {
  intent: 'mail',
  tab: 'mail'
}, {
  intent: 'ai',
  tab: 'ai'
}, {
  intent: 'about-feedback',
  tab: 'about',
  setter: 'setAboutInitialPage',
  page: 'feedback'
}, {
  intent: 'user-orders',
  tab: 'user',
  setter: 'setUserInitialProfilePage',
  page: 'orders'
}, {
  intent: 'user-info',
  tab: 'user',
  setter: 'setUserInitialProfilePage',
  page: 'info'
}, {
  intent: 'performance-monitor',
  tab: 'app',
  setter: 'setAppSettingsPage',
  page: 'performance-monitor'
}, {
  intent: 'expand-layout',
  tab: 'app',
  setter: 'setAppSettingsPage',
  page: 'expand-layout'
}] as const;
describe('打开页面意图与监听生命周期', () => {
  it.each(intents)('$intent远端/本地意图均设置目标并消费存储', async (value) => {
    changed?.('store:settings-open-tab', value.intent);
    expect(setters.setActiveTab).toHaveBeenCalledWith(value.tab);
    if ('setter' in value && value.setter) expect(setters[value.setter]).toHaveBeenCalledWith(value.page);
    localIntent?.({
      detail: value.intent
    } as unknown as Event);
    await settle();
    expect(api.storeWrite).toHaveBeenCalledTimes(2);
    expect(api.storeWrite).toHaveBeenCalledWith('settings-open-tab', null);
  });
  it('空意图和非字符串本地事件不消费，未知非空远端意图消费但不跳转', async () => {
    [null, 42, '', undefined].forEach((detail) => {
      localIntent?.({
        detail
      } as unknown as Event);
    });
    changed?.('store:settings-open-tab', null);
    expect(api.storeWrite).not.toHaveBeenCalled();
    changed?.('store:settings-open-tab', 'unknown');
    await settle();
    expect(api.storeWrite).toHaveBeenCalledOnce();
    expect(setters.setActiveTab).not.toHaveBeenCalled();
  });
  it('意图消费失败被catch隔离，卸载移除原始监听', async () => {
    api.storeWrite.mockRejectedValue(new Error('write failed'));
    localIntent?.({
      detail: 'update'
    } as unknown as Event);
    await settle();
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledWith('settings-open-tab-intent', localIntent);
  });
});
describe('实际跨窗口配置事件', () => {
  it.each(['zh-CN', 'en-US', 'zh-TW', 'ja-JP'])('语言%s同步到正确setter', (value) => {
    changed?.('i18n:language', value);
    expect(setters.setAppLanguage).toHaveBeenCalledWith(value);
  });
  it.each(['', 'de-DE', null])('非法语言%o不覆盖', (value) => {
    changed?.('i18n:language', value);
    expect(setters.setAppLanguage).not.toHaveBeenCalled();
  });
  it.each([{
    channel: 'store:standalone-window-mac-controls',
    setter: 'setStandaloneMacControls'
  }, {
    channel: 'store:island-bg-video-muted',
    setter: 'setBgVideoMuted'
  }, {
    channel: 'store:island-bg-video-loop',
    setter: 'setBgVideoLoop'
  }, {
    channel: 'store:island-bg-video-hw-decode',
    setter: 'setBgVideoHwDecode'
  }, {
    channel: 'store:island-bg-sync-system-wallpaper',
    setter: 'setSyncDesktopWallpaperOnBackgroundChange'
  }, {
    channel: 'store:island-position-locked',
    setter: 'setIslandPositionLocked'
  }, {
    channel: 'store:island-auto-dim-enabled',
    setter: 'setAutoDimEnabled'
  }, {
    channel: 'music:lyrics-karaoke',
    setter: 'setLyricsKaraoke'
  }] as const)('$channel只同步布尔值', ({
    channel,
    setter
  }) => {
    changed?.(channel, null);
    expect(setters[setter]).not.toHaveBeenCalled();
    [true, false].forEach((value) => {
      changed?.(channel, value);
      expect(setters[setter]).toHaveBeenLastCalledWith(value);
    });
  });
  it.each([{
    channel: 'store:island-bg-opacity',
    setter: 'setBgImageOpacity',
    low: 0,
    high: 100,
    invalid: 30
  }, {
    channel: 'store:island-bg-blur',
    setter: 'setBgImageBlur',
    low: 0,
    high: 20,
    invalid: 0
  }, {
    channel: 'store:island-bg-video-volume',
    setter: 'setBgVideoVolume',
    low: 0,
    high: 1
  }, {
    channel: 'store:island-bg-video-rate',
    setter: 'setBgVideoRate',
    low: 0.25,
    high: 3
  }, {
    channel: 'store:island-auto-dim-delay',
    setter: 'setAutoDimDelaySec',
    low: 1,
    high: 120
  }] as const)('$channel有限数值夹紧与非法值默认', ({
    channel,
    setter,
    low,
    high,
    invalid
  }) => {
    changed?.(channel, -999);
    expect(setters[setter]).toHaveBeenLastCalledWith(low);
    changed?.(channel, 999);
    expect(setters[setter]).toHaveBeenLastCalledWith(high);
    [NaN, Infinity, 'wrong'].forEach((value) => {
      setters[setter].mockClear();
      changed?.(channel, value);
      if (invalid === undefined) expect(setters[setter]).not.toHaveBeenCalled();else expect(setters[setter]).toHaveBeenLastCalledWith(invalid);
    });
  });
  it.each(['cover', 'contain', 'invalid'])('视频fit%s有效性', (value) => {
    changed?.('store:island-bg-video-fit', value);
    if (value === 'invalid') expect(setters.setBgVideoFit).not.toHaveBeenCalled();else expect(setters.setBgVideoFit).toHaveBeenCalledWith(value);
  });
  it('全屏自动隐藏只接受true；白名单数组，更新源已知和未知回退', () => {
    changed?.('store:auto-hide-fullscreen-windows', true);
    expect(setters.setAutoHideFullscreenWindowsState).toHaveBeenLastCalledWith(true);
    changed?.('store:auto-hide-fullscreen-windows', 1);
    expect(setters.setAutoHideFullscreenWindowsState).toHaveBeenLastCalledWith(false);
    changed?.('store:music-whitelist', 'not array');
    expect(setters.setWhitelist).not.toHaveBeenCalled();
    changed?.('store:music-whitelist', ['Player.exe']);
    expect(setters.setWhitelist).toHaveBeenCalledWith(['Player.exe']);
    changed?.('store:update-source', null);
    changed?.('store:update-source', '');
    expect(setters.setUpdateSource).not.toHaveBeenCalled();
    changed?.('store:update-source', 'github');
    expect(setters.setUpdateSource).toHaveBeenLastCalledWith('github');
    changed?.('store:update-source', 'unknown');
    expect(setters.setUpdateSource).toHaveBeenLastCalledWith('cloudflare-r2');
  });
  it('未知channel不触发任何setter', () => {
    changed?.('unknown:channel', true);
    setterNames.forEach((name) => {
      expect(setters[name]).not.toHaveBeenCalled();
    });
  });
});
describe('同步媒体结果与取消', () => {
  it.each([null, '', {}, {
    source: ' '
  }])('无效媒体%o清空媒体和预览', (value) => {
    changed?.('store:island-bg-media', value);
    expect(setters.setBgMedia).toHaveBeenCalledWith(null);
    expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith(null);
  });
  it('直接视频地址传入真实规范化结果', async () => {
    changed?.('store:island-bg-media', {
      type: 'video',
      source: ' https://host/movie.mp4 '
    });
    await settle();
    expect(setters.setBgMedia).toHaveBeenCalledWith({
      type: 'video',
      source: 'https://host/movie.mp4'
    });
    expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith('https://host/movie.mp4');
  });
  it.each(['success', 'empty', 'rejected', 'cancelled'])('本地图片解析%s', async (mode) => {
    let resolve: (value: string | null) => void = () => undefined;
    if (mode === 'empty') api.loadWallpaperFile.mockResolvedValue(null);
    if (mode === 'rejected') api.loadWallpaperFile.mockRejectedValue(new Error('file failed'));
    if (mode === 'cancelled') {
      api.loadWallpaperFile.mockReturnValue(new Promise((done) => {
        resolve = done;
      }));
    }
    changed?.('store:island-bg-media', {
      type: 'image',
      source: 'C:/Pictures/image.png'
    });
    await settle();
    if (mode === 'cancelled') {
      unmountHooks();
      resolve('late-preview');
      await settle();
      expect(setters.setBgMedia).not.toHaveBeenCalled();
    }
    if (mode === 'empty') {
      expect(setters.setBgMedia).toHaveBeenCalledWith(null);
      expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith(null);
    }
    if (mode === 'rejected') expect(setters.setBgMedia).not.toHaveBeenCalled();
    if (mode === 'success') expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith('data:preview');
  });
});
