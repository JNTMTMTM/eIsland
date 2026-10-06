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
 * @file useSettingsAppearanceEffects.test.ts
 * @description 外观初始化、天气会员限制、屏幕选择、媒体解析和监听清理回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsAppearanceEffects } from '../useSettingsAppearanceEffects';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
import type { Mock } from 'vitest';
const storage = vi.hoisted(() => ({
  loadWeatherLocationConfig: vi.fn<() => {
    priority: string;
    customLocation: {
      city: string;
    } | null;
  }>(),
  loadWeatherProviderConfig: vi.fn<() => {
    primaryProvider: string;
  }>(),
  saveWeatherProviderConfig: vi.fn()
}));
vi.mock('../../../../../../../store/utils/storage', () => storage);
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsAppearanceEffects>[0];
const setterNames = ["setWeatherPrimaryProvider", "setWeatherLocationPriority", "setWeatherCustomCityInput", "setWeatherAlertEnabled", "setIslandPositionOffset", "setIslandPositionLocked", "setIslandDisplayOptions", "setIslandDisplaySelection", "setIslandOpacity", "setAutoDimEnabled", "setAutoDimDelaySec", "setBgVideoFit", "setBgVideoMuted", "setBgVideoLoop", "setBgVideoVolume", "setBgVideoRate", "setBgVideoHwDecode", "setSyncDesktopWallpaperOnBackgroundChange", "setBgImageOpacity", "setBgImageBlur", "setBgMedia", "setBgMediaPreviewUrl"] as const;
const setters = Object.fromEntries(setterNames.map((name) => [name, vi.fn<(value: unknown) => void>()])) as Record<typeof setterNames[number], Mock<(value: unknown) => void>>;
const values = new Map<string, unknown>();
const api = {
  storeRead: vi.fn<(key: string) => Promise<unknown>>(),
  getIslandPositionOffset: vi.fn<() => Promise<unknown>>(),
  getIslandDisplays: vi.fn<() => Promise<unknown>>(),
  getIslandDisplaySelection: vi.fn<() => Promise<unknown>>(),
  islandOpacityGet: vi.fn<() => Promise<unknown>>(),
  loadWallpaperFile: vi.fn<(path: string) => Promise<string | null>>(),
  onIslandPositionOffsetChanged: vi.fn<(callback: (offset: unknown) => void) => () => void>()
};
const unsubscribe = vi.fn();
const setProperty = vi.fn();
const t = vi.fn<(key: string) => string>((key) => key);
let listener: ((offset: unknown) => void) | undefined;
let options: Options;
/**
 * 挂载实际外观 effect 并等待服务结果。
 * @returns 无返回值。
 */
function mount(): void {
  renderWithHooks(() => useSettingsAppearanceEffects(options));
  runEffects();
}
/**
 * 等待读取和媒体解析的异步队列。
 * @returns 所有已排队回调执行完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  values.clear();
  listener = undefined;
  storage.loadWeatherProviderConfig.mockReturnValue({
    primaryProvider: 'uapi'
  });
  storage.loadWeatherLocationConfig.mockReturnValue({
    priority: 'custom',
    customLocation: {
      city: 'Beijing'
    }
  });
  t.mockImplementation((key) => key);
  options = {
    ...setters,
    t: t as unknown as Options['t'],
    isProUser: true,
    weatherPrimaryProvider: 'qweather-pro',
    opacitySaveTimerRef: {
      current: null
    },
    bgOpacitySaveTimerRef: {
      current: null
    },
    bgBlurSaveTimerRef: {
      current: null
    }
  };
  Object.entries({
    'weather-alert-enabled': false,
    'island-position-locked': true,
    'island-auto-dim-enabled': true,
    'island-auto-dim-delay': 5.7,
    'island-bg-media': {
      type: 'video',
      source: 'https://host/movie.mp4'
    },
    'island-bg-video-fit': 'contain',
    'island-bg-video-muted': false,
    'island-bg-video-loop': true,
    'island-bg-video-volume': 0.6,
    'island-bg-video-rate': 1.5,
    'island-bg-video-hw-decode': false,
    'island-bg-sync-system-wallpaper': true,
    'island-bg-opacity': 30.6,
    'island-bg-blur': 2.2
  }).forEach(([key, value]) => {
    values.set(key, value);
  });
  api.storeRead.mockImplementation((key) => Promise.resolve(values.get(key)));
  api.getIslandPositionOffset.mockResolvedValue({
    x: 1.7,
    y: -2.4
  });
  api.getIslandDisplays.mockResolvedValue([{
    id: '1',
    width: 1920,
    height: 1080,
    isPrimary: true
  }, {
    id: '2',
    width: 1280,
    height: 720,
    isPrimary: false
  }]);
  api.getIslandDisplaySelection.mockResolvedValue('2');
  api.islandOpacityGet.mockResolvedValue(77.7);
  api.loadWallpaperFile.mockResolvedValue('data:image/png;base64,content');
  api.onIslandPositionOffsetChanged.mockImplementation((callback) => {
    listener = callback;
    return unsubscribe;
  });
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('document', {
    documentElement: {
      style: {
        setProperty
      }
    }
  });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('外观初始化与清理', () => {
  it('真实规范化位置、显示器、透明度和所有背景设置', async () => {
    mount();
    await settle();
    expect(setters.setWeatherPrimaryProvider).toHaveBeenCalledWith('uapi');
    expect(setters.setWeatherLocationPriority).toHaveBeenCalledWith('custom');
    expect(setters.setWeatherCustomCityInput).toHaveBeenCalledWith('Beijing');
    expect(setters.setWeatherAlertEnabled).toHaveBeenCalledWith(false);
    expect(setters.setIslandPositionOffset).toHaveBeenCalledWith({
      x: 2,
      y: -2
    });
    expect(setters.setIslandPositionLocked).toHaveBeenCalledWith(true);
    expect(setters.setIslandDisplaySelection).toHaveBeenCalledWith('2');
    expect(setters.setIslandDisplayOptions).toHaveBeenCalledWith([{
      id: 'primary',
      label: 'settings.app.position.displayPrimaryOption'
    }, {
      id: '1',
      label: 'settings.app.position.displayOptionsettings.app.position.displayPrimarySuffix'
    }, {
      id: '2',
      label: 'settings.app.position.displayOption'
    }]);
    expect(setters.setIslandOpacity).toHaveBeenCalledWith(78);
    expect(setProperty).toHaveBeenCalledWith('--island-opacity', '78');
    expect(setters.setAutoDimEnabled).toHaveBeenCalledWith(true);
    expect(setters.setAutoDimDelaySec).toHaveBeenCalledWith(6);
    expect(setters.setBgVideoFit).toHaveBeenCalledWith('contain');
    expect(setters.setBgVideoMuted).toHaveBeenCalledWith(false);
    expect(setters.setBgVideoLoop).toHaveBeenCalledWith(true);
    expect(setters.setBgVideoVolume).toHaveBeenCalledWith(0.6);
    expect(setters.setBgVideoRate).toHaveBeenCalledWith(1.5);
    expect(setters.setBgVideoHwDecode).toHaveBeenCalledWith(false);
    expect(setters.setSyncDesktopWallpaperOnBackgroundChange).toHaveBeenCalledWith(true);
    expect(setters.setBgImageOpacity).toHaveBeenCalledWith(31);
    expect(setters.setBgImageBlur).toHaveBeenCalledWith(2);
    expect(setters.setBgMedia).toHaveBeenCalledWith({
      type: 'video',
      source: 'https://host/movie.mp4'
    });
    expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith('https://host/movie.mp4');
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it.each([true, false])('PRO=%s时是否禁用和风天气', async (isProUser) => {
    options.isProUser = isProUser;
    mount();
    await settle();
    expect(storage.saveWeatherProviderConfig).toHaveBeenCalledTimes(isProUser ? 0 : 1);
    if (!isProUser) {
      expect(storage.saveWeatherProviderConfig).toHaveBeenCalledWith({
        primaryProvider: 'open-meteo'
      });
    }
  });
  it('非PRO使用免费天气保持配置，没有自定义城市使用空输入', async () => {
    options.isProUser = false;
    options.weatherPrimaryProvider = 'uapi';
    storage.loadWeatherLocationConfig.mockReturnValue({
      priority: 'ip',
      customLocation: null
    });
    mount();
    await settle();
    expect(storage.saveWeatherProviderConfig).not.toHaveBeenCalled();
    expect(setters.setWeatherCustomCityInput).toHaveBeenCalledWith('');
  });
  it('卸载忽略迟到位置、屏幕和所有持久化值', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    const pending = new Promise<unknown>((done) => {
      resolve = done;
    });
    api.storeRead.mockReturnValue(pending);
    api.getIslandPositionOffset.mockReturnValue(pending);
    api.getIslandDisplays.mockReturnValue(pending);
    api.getIslandDisplaySelection.mockReturnValue(pending);
    api.islandOpacityGet.mockReturnValue(pending);
    mount();
    unmountHooks();
    resolve(null);
    await settle();
    expect(setters.setWeatherAlertEnabled).not.toHaveBeenCalled();
    expect(setters.setIslandPositionOffset).not.toHaveBeenCalled();
    expect(setters.setIslandPositionLocked).not.toHaveBeenCalled();
    expect(setters.setIslandDisplayOptions).not.toHaveBeenCalled();
    expect(setters.setIslandOpacity).not.toHaveBeenCalled();
    expect(setters.setAutoDimEnabled).not.toHaveBeenCalled();
    expect(setters.setAutoDimDelaySec).not.toHaveBeenCalled();
    expect(setters.setBgMedia).not.toHaveBeenCalled();
  });
  it('服务拒绝均被隔离，屏幕读取失败回退主屏', async () => {
    api.storeRead.mockRejectedValue(new Error('read'));
    api.getIslandPositionOffset.mockRejectedValue(new Error('offset'));
    api.getIslandDisplays.mockRejectedValue(new Error('display'));
    api.getIslandDisplaySelection.mockRejectedValue(new Error('selection'));
    api.islandOpacityGet.mockRejectedValue(new Error('opacity'));
    mount();
    await settle();
    expect(setters.setIslandDisplaySelection).toHaveBeenCalledWith('primary');
    expect(setters.setIslandOpacity).not.toHaveBeenCalled();
    expect(setters.setBgMedia).not.toHaveBeenCalled();
  });
  it('翻译提供者异常被显示器计算catch隔离', async () => {
    t.mockImplementation(() => {
      throw new Error('translation unavailable');
    });
    mount();
    await settle();
    expect(setters.setIslandDisplayOptions).not.toHaveBeenCalled();
  });
  it('卸载取消三个真实保存定时器并清空ref', async () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    options.opacitySaveTimerRef.current = setTimeout(callback, 100) as unknown as NonNullable<Options['opacitySaveTimerRef']['current']>;
    options.bgOpacitySaveTimerRef.current = setTimeout(callback, 200) as unknown as NonNullable<Options['opacitySaveTimerRef']['current']>;
    options.bgBlurSaveTimerRef.current = setTimeout(callback, 300) as unknown as NonNullable<Options['opacitySaveTimerRef']['current']>;
    mount();
    await settle();
    unmountHooks();
    vi.runAllTimers();
    expect(callback).not.toHaveBeenCalled();
    expect(options.opacitySaveTimerRef.current).toBeNull();
    expect(options.bgOpacitySaveTimerRef.current).toBeNull();
    expect(options.bgBlurSaveTimerRef.current).toBeNull();
  });
});
describe('位置、屏幕和数值边界', () => {
  it.each([null, {
    x: '1',
    y: NaN
  }, {
    x: Infinity,
    y: '2'
  }])('初始位置%o保持有限整数', async (offset) => {
    api.getIslandPositionOffset.mockResolvedValue(offset);
    mount();
    await settle();
    if (offset) {
      expect(setters.setIslandPositionOffset).toHaveBeenCalledWith({
        x: 0,
        y: 0
      });
    } else expect(setters.setIslandPositionOffset).not.toHaveBeenCalled();
  });
  it('位置事件忽略空值并夹紧数据类型，清理监听', async () => {
    mount();
    await settle();
    setters.setIslandPositionOffset.mockClear();
    listener?.(null);
    expect(setters.setIslandPositionOffset).not.toHaveBeenCalled();
    listener?.({
      x: 3.4,
      y: -7.8
    });
    expect(setters.setIslandPositionOffset).toHaveBeenLastCalledWith({
      x: 3,
      y: -8
    });
    listener?.({
      x: 'wrong',
      y: Infinity
    });
    expect(setters.setIslandPositionOffset).toHaveBeenLastCalledWith({
      x: 0,
      y: 0
    });
    listener?.({
      x: NaN,
      y: 'wrong'
    });
    expect(setters.setIslandPositionOffset).toHaveBeenLastCalledWith({
      x: 0,
      y: 0
    });
  });
  it.each([{
    value: 'primary',
    expected: 'primary'
  }, {
    value: 1.9,
    expected: '1'
  }, {
    value: ' 2 ',
    expected: '2'
  }, {
    value: '999',
    expected: 'primary'
  }, {
    value: 'invalid',
    expected: 'primary'
  }, {
    value: Infinity,
    expected: 'primary'
  }, {
    value: null,
    expected: 'primary'
  }])('保存屏幕$value规范化为$expected', async ({
    value,
    expected
  }) => {
    api.getIslandDisplaySelection.mockResolvedValue(value);
    mount();
    await settle();
    expect(setters.setIslandDisplaySelection).toHaveBeenCalledWith(expected);
  });
  it.each([{
    value: 1,
    expected: 10
  }, {
    value: 200,
    expected: 100
  }, {
    value: 'wrong',
    expected: 100
  }])('岛透明度$value规范化为$expected', async ({
    value,
    expected
  }) => {
    api.islandOpacityGet.mockResolvedValue(value);
    mount();
    await settle();
    expect(setters.setIslandOpacity).toHaveBeenCalledWith(expected);
  });
  it.each([null, 'wrong', Infinity, NaN])('媒体/数值非法%o不覆盖既有有效值', async (invalid) => {
    ['island-auto-dim-enabled', 'island-auto-dim-delay', 'island-bg-video-fit', 'island-bg-video-muted', 'island-bg-video-loop', 'island-bg-video-volume', 'island-bg-video-rate', 'island-bg-video-hw-decode', 'island-bg-sync-system-wallpaper', 'island-bg-opacity', 'island-bg-blur', 'weather-alert-enabled'].forEach((key) => {
      values.set(key, invalid);
    });
    values.set('island-bg-media', null);
    mount();
    await settle();
    expect(setters.setWeatherAlertEnabled).toHaveBeenCalledWith(true);
    expect(setters.setAutoDimEnabled).not.toHaveBeenCalled();
    expect(setters.setAutoDimDelaySec).not.toHaveBeenCalled();
    expect(setters.setBgVideoFit).not.toHaveBeenCalled();
    expect(setters.setBgVideoMuted).not.toHaveBeenCalled();
    expect(setters.setBgVideoLoop).not.toHaveBeenCalled();
    expect(setters.setBgVideoVolume).not.toHaveBeenCalled();
    expect(setters.setBgVideoRate).not.toHaveBeenCalled();
    expect(setters.setBgVideoHwDecode).not.toHaveBeenCalled();
    expect(setters.setSyncDesktopWallpaperOnBackgroundChange).not.toHaveBeenCalled();
    expect(setters.setBgImageOpacity).not.toHaveBeenCalled();
    expect(setters.setBgImageBlur).not.toHaveBeenCalled();
    expect(setters.setBgMedia).toHaveBeenCalledWith(null);
    expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith(null);
  });
  it.each([{
    value: -100,
    delay: 1,
    volume: 0,
    rate: 0.25,
    opacity: 0,
    blur: 0
  }, {
    value: 999,
    delay: 120,
    volume: 1,
    rate: 3,
    opacity: 100,
    blur: 20
  }])('有限数值$value限制有效范围', async (row) => {
    ['island-auto-dim-delay', 'island-bg-video-volume', 'island-bg-video-rate', 'island-bg-opacity', 'island-bg-blur'].forEach((key) => {
      values.set(key, row.value);
    });
    values.set('island-bg-video-fit', 'cover');
    mount();
    await settle();
    expect(setters.setAutoDimDelaySec).toHaveBeenCalledWith(row.delay);
    expect(setters.setBgVideoVolume).toHaveBeenCalledWith(row.volume);
    expect(setters.setBgVideoRate).toHaveBeenCalledWith(row.rate);
    expect(setters.setBgImageOpacity).toHaveBeenCalledWith(row.opacity);
    expect(setters.setBgImageBlur).toHaveBeenCalledWith(row.blur);
  });
});
describe('背景媒体兼容和异步预览', () => {
  it.each([true, false])('旧背景仅字段未定义时回退，旧值有效=%s', async (validLegacy) => {
    values.delete('island-bg-media');
    values.set('island-bg-image', validLegacy ? 'https://host/legacy.png' : 42);
    mount();
    await settle();
    expect(setters.setBgMedia).toHaveBeenCalledWith(validLegacy ? {
      type: 'image',
      source: 'https://host/legacy.png'
    } : null);
  });
  it.each(['success', 'empty', 'failed', 'cancelled'])('本地图片预览%s', async (mode) => {
    values.set('island-bg-media', {
      type: 'image',
      source: 'C:/Pictures/wall.png'
    });
    let resolve: (value: string | null) => void = () => undefined;
    if (mode === 'empty') api.loadWallpaperFile.mockResolvedValue(null);
    if (mode === 'failed') api.loadWallpaperFile.mockRejectedValue(new Error('file failed'));
    if (mode === 'cancelled') {
      api.loadWallpaperFile.mockReturnValue(new Promise((done) => {
        resolve = done;
      }));
    }
    mount();
    await settle();
    if (mode === 'cancelled') {
      unmountHooks();
      resolve('late-data');
      await settle();
      expect(setters.setBgMedia).not.toHaveBeenCalled();
    }
    if (mode === 'empty') {
      expect(setters.setBgMedia).toHaveBeenCalledWith(null);
      expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith(null);
    }
    if (mode === 'failed') expect(setters.setBgMedia).not.toHaveBeenCalled();
    if (mode === 'success') expect(setters.setBgMediaPreviewUrl).toHaveBeenCalledWith('data:image/png;base64,content');
  });
});
