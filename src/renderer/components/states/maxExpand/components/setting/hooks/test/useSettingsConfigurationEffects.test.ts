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
 * @file useSettingsConfigurationEffects.test.ts
 * @description 设置初始化配置读取、规范化、跳转意图、失败兜底与卸载取消回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsConfigurationEffects } from '../useSettingsConfigurationEffects';
import { CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, SETTINGS_OPEN_TAB_STORE_KEY, UPDATE_SOURCE_STORE_KEY } from '../../config/settingsTabConfig';
import { LAYOUT_STORE_KEY, MAXEXPAND_NAV_LAYOUT_STORE_KEY } from '../../utils/settingsConfig';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './settingsCoverageHarness';
import type { Mock } from 'vitest';
vi.mock('../../../../../../../i18n', () => ({
  default: {},
  setLanguage: vi.fn()
}));
const store = vi.hoisted(() => ({
  setSpringAnimation: vi.fn(),
  setAnimationSpeed: vi.fn()
}));
vi.mock('../../../../../../../store/slices', () => ({
  default: {
    getState: () => store,
    subscribe: vi.fn()
  }
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../test/elementHarness')).hookMocks,
  ...(await import('./settingsCoverageHarness')).lifecycleHooks
}));
type Options = Parameters<typeof useSettingsConfigurationEffects>[0];
type SetterKey = Exclude<keyof Options, 'islandPositionOffset'>;
const setterNames = ["setIslandPositionInput", "setWhitelist", "setLyricsSource", "setLyricsEnabled", "setLyricsTranslationEnabled", "setLyricsKaraoke", "setLyricsClock", "setLyricsCalibrateEnabled", "setLyricsCalibrateDelay", "setExpandLeaveIdle", "setMaxExpandLeaveIdle", "setClipboardUrlMonitorEnabled", "setClipboardUrlDetectMode", "setClipboardUrlBlacklist", "setClipboardUrlSuppressInFavorites", "setAutostartMode", "setNavOrder", "setHiddenNavOrder", "setMusicSmtcNeverUnsubscribe", "setMusicSmtcUnsubscribeInput", "setLayoutConfig", "setMaxExpandNavLayout", "setHideHotkey", "setQuitHotkey", "setScreenshotHotkey", "setNextSongHotkey", "setPlayPauseSongHotkey", "setResetPositionHotkey", "setToggleTrayHotkey", "setShowSettingsWindowHotkey", "setOpenClipboardHistoryHotkey", "setTogglePassthroughHotkey", "setToggleUiLockHotkey", "setAgentVoiceInputHotkey", "setToggleShapeModeHotkey", "setAboutVersion", "setUpdateSource", "setActiveTab", "setAboutInitialPage", "setUserInitialProfilePage", "setAppSettingsPage"] as const;
const settings = [{
  api: 'musicWhitelistGet',
  setter: 'setWhitelist',
  value: ["Player.exe"]
}, {
  api: 'musicLyricsSourceGet',
  setter: 'setLyricsSource',
  value: "auto"
}, {
  api: 'musicLyricsEnabledGet',
  setter: 'setLyricsEnabled',
  value: true
}, {
  api: 'musicLyricsTranslationEnabledGet',
  setter: 'setLyricsTranslationEnabled',
  value: false
}, {
  api: 'musicLyricsKaraokeGet',
  setter: 'setLyricsKaraoke',
  value: true
}, {
  api: 'musicLyricsClockGet',
  setter: 'setLyricsClock',
  value: false
}, {
  api: 'musicLyricsCalibrateEnabledGet',
  setter: 'setLyricsCalibrateEnabled',
  value: true
}, {
  api: 'musicLyricsCalibrateDelayGet',
  setter: 'setLyricsCalibrateDelay',
  value: 321
}, {
  api: 'expandMouseleaveIdleGet',
  setter: 'setExpandLeaveIdle',
  value: true
}, {
  api: 'maxexpandMouseleaveIdleGet',
  setter: 'setMaxExpandLeaveIdle',
  value: false
}, {
  api: 'clipboardUrlMonitorGet',
  setter: 'setClipboardUrlMonitorEnabled',
  value: true
}, {
  api: 'clipboardUrlDetectModeGet',
  setter: 'setClipboardUrlDetectMode',
  value: "all"
}, {
  api: 'clipboardUrlBlacklistGet',
  setter: 'setClipboardUrlBlacklist',
  value: ["example.com"]
}, {
  api: 'autostartGet',
  setter: 'setAutostartMode',
  value: "high-priority"
}] as const;
const shortcuts = [{
  api: 'hotkeyGet',
  setter: 'setHideHotkey'
}, {
  api: 'quitHotkeyGet',
  setter: 'setQuitHotkey'
}, {
  api: 'screenshotHotkeyGet',
  setter: 'setScreenshotHotkey'
}, {
  api: 'nextSongHotkeyGet',
  setter: 'setNextSongHotkey'
}, {
  api: 'playPauseSongHotkeyGet',
  setter: 'setPlayPauseSongHotkey'
}, {
  api: 'resetPositionHotkeyGet',
  setter: 'setResetPositionHotkey'
}, {
  api: 'toggleTrayHotkeyGet',
  setter: 'setToggleTrayHotkey'
}, {
  api: 'showSettingsWindowHotkeyGet',
  setter: 'setShowSettingsWindowHotkey'
}, {
  api: 'openClipboardHistoryHotkeyGet',
  setter: 'setOpenClipboardHistoryHotkey'
}, {
  api: 'togglePassthroughHotkeyGet',
  setter: 'setTogglePassthroughHotkey'
}, {
  api: 'toggleUiLockHotkeyGet',
  setter: 'setToggleUiLockHotkey'
}, {
  api: 'agentVoiceInputHotkeyGet',
  setter: 'setAgentVoiceInputHotkey'
}, {
  api: 'toggleShapeModeHotkeyGet',
  setter: 'setToggleShapeModeHotkey'
}] as const;
const setters = Object.fromEntries(setterNames.map((name) => [name, vi.fn<(value: unknown) => void>()])) as Record<SetterKey, Mock<(value: unknown) => void>>;
const api: Record<string, Mock<(...args: unknown[]) => Promise<unknown>>> = {};
const setItem = vi.fn<(key: string, value: string) => void>();
const values = new Map<string, unknown>();
/**
 * 执行真实配置 Hook 并提交已登记的 effect。
 * @returns 无返回值。
 */
function mount(): void {
  renderWithHooks(() => useSettingsConfigurationEffects({
    ...setters,
    islandPositionOffset: {
      x: 3,
      y: -4
    }
  }));
  runEffects();
}
/**
 * 等待读取 Promise 与实际回调全部处理。
 * @returns 异步队列处理完毕。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  values.clear();
  values.set(LAYOUT_STORE_KEY, {
    left: 'song',
    right: 'album',
    clockStyle: 'minimal',
    gradientColors: {
      start: '#112233',
      middle: '#445566',
      end: '#778899'
    }
  });
  values.set(MAXEXPAND_NAV_LAYOUT_STORE_KEY, [{
    id: 'todo',
    visible: true
  }]);
  values.set(UPDATE_SOURCE_STORE_KEY, 'github');
  values.set(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, false);
  settings.forEach(({
    api: name,
    value
  }) => {
    api[name] = vi.fn<() => Promise<unknown>>().mockResolvedValue(value);
  });
  shortcuts.forEach(({
    api: name
  }) => {
    api[name] = vi.fn<() => Promise<unknown>>().mockResolvedValue('Alt+B');
  });
  api.springAnimationGet = vi.fn<() => Promise<unknown>>().mockResolvedValue(true);
  api.animationSpeedGet = vi.fn<() => Promise<unknown>>().mockResolvedValue('fast');
  api.navOrderGet = vi.fn<() => Promise<unknown>>().mockResolvedValue({
    visibleOrder: ['user-pro', 'music-lyrics', 'music-lyrics', 'unknown'],
    hiddenOrder: ['music-smtc', 'music-smtc', 'music-lyrics', 'unknown', 'user-pro']
  });
  api.musicSmtcUnsubscribeMsGet = vi.fn<() => Promise<unknown>>().mockResolvedValue(5432.6);
  api.storeRead = vi.fn<(...args: unknown[]) => Promise<unknown>>().mockImplementation((key) => Promise.resolve(values.get(String(key))));
  api.storeWrite = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
  api.hotkeyResume = vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined);
  api.updaterVersion = vi.fn<() => Promise<unknown>>().mockResolvedValue('2.0.0');
  setItem.mockReset();
  vi.stubGlobal('window', {
    api
  });
  vi.stubGlobal('localStorage', {
    setItem
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('真实初始化配置接线', () => {
  it('所有音乐和快捷键读值传入正确状态并规范布局/导航', async () => {
    mount();
    await settle();
    expect(setters.setIslandPositionInput).toHaveBeenCalledWith({
      x: '3',
      y: '-4'
    });
    settings.forEach(({
      setter,
      value
    }) => {
      expect(setters[setter]).toHaveBeenCalledWith(value);
    });
    shortcuts.forEach(({
      setter
    }) => {
      expect(setters[setter]).toHaveBeenCalledWith('Alt+B');
    });
    expect(store.setSpringAnimation).toHaveBeenCalledWith(true);
    expect(store.setAnimationSpeed).toHaveBeenCalledWith('fast');
    expect(setters.setNavOrder).toHaveBeenCalledWith(['user-pro', 'music-lyrics']);
    expect(setters.setHiddenNavOrder).toHaveBeenCalledWith(['music-smtc']);
    expect(setters.setMusicSmtcNeverUnsubscribe).toHaveBeenCalledWith(false);
    expect(setters.setMusicSmtcUnsubscribeInput).toHaveBeenCalledWith('5433');
    expect(setters.setLayoutConfig).toHaveBeenCalledWith({
      left: 'song',
      right: 'album',
      clockStyle: 'minimal',
      gradientColors: {
        start: '#112233',
        middle: '#445566',
        end: '#778899'
      }
    });
    expect(setters.setMaxExpandNavLayout).toHaveBeenCalledWith(expect.arrayContaining([{
      id: 'todo',
      visible: true
    }]));
    expect(setters.setUpdateSource).toHaveBeenCalledWith('github');
    expect(setters.setAboutVersion).toHaveBeenCalledWith('2.0.0');
    expect(setItem).toHaveBeenCalledWith(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '0');
    unmountHooks();
    expect(api.hotkeyResume).toHaveBeenCalledOnce();
  });
  it('卸载后忽略所有迟到的配置和布局结果', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    const pending = new Promise<unknown>((done) => {
      resolve = done;
    });
    Object.entries(api).forEach(([name, fn]) => {
      if (!['updaterVersion', 'storeWrite', 'hotkeyResume'].includes(name)) fn.mockReturnValue(pending);
    });
    api.updaterVersion.mockResolvedValue('');
    mount();
    unmountHooks();
    resolve({
      visibleOrder: ['music-lyrics']
    });
    await settle();
    setterNames.filter((name) => name !== 'setIslandPositionInput').forEach((name) => {
      expect(setters[name]).not.toHaveBeenCalled();
    });
    expect(store.setAnimationSpeed).not.toHaveBeenCalled();
    expect(store.setSpringAnimation).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
  it('各读取和恢复接口拒绝时被真实catch隔离，收藏夹默认开启', async () => {
    Object.values(api).forEach((fn) => {
      fn.mockRejectedValue(new Error('read failed'));
    });
    setItem.mockImplementation(() => {
      throw new Error('storage blocked');
    });
    mount();
    await settle();
    unmountHooks();
    await settle();
    expect(setters.setClipboardUrlSuppressInFavorites).toHaveBeenCalledWith(true);
    expect(setters.setAboutVersion).not.toHaveBeenCalled();
    expect(setters.setHideHotkey).not.toHaveBeenCalled();
  });
  it('读取拒绝在卸载后也不能写入默认状态', async () => {
    let reject: (error: Error) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((resolve, fail) => {
      void resolve;
      reject = fail;
    }));
    mount();
    unmountHooks();
    reject(new Error('late rejection'));
    await settle();
    expect(setters.setClipboardUrlSuppressInFavorites).not.toHaveBeenCalled();
  });
});
describe('配置非法值和默认边界', () => {
  it.each(['slow', 'medium', 'fast', 'invalid'])('动画速度%s仅接受规范值', async (speed) => {
    api.animationSpeedGet.mockResolvedValue(speed);
    mount();
    await settle();
    expect(store.setAnimationSpeed).toHaveBeenCalledWith(speed === 'invalid' ? 'medium' : speed);
  });
  it.each([0, -1, 12.4, NaN, Infinity, '1200'])('SMTC取消订阅值%s规范化', async (value) => {
    api.musicSmtcUnsubscribeMsGet.mockResolvedValue(value);
    mount();
    await settle();
    expect(setters.setMusicSmtcNeverUnsubscribe).toHaveBeenCalledWith(value !== 12.4);
    expect(setters.setMusicSmtcUnsubscribeInput).toHaveBeenCalledWith(value === 12.4 ? '12' : '5000');
  });
  it('空快捷键、非数组黑名单和未知更新源均回退默认', async () => {
    shortcuts.forEach(({
      api: name
    }) => {
      api[name].mockResolvedValue(null);
    });
    api.clipboardUrlBlacklistGet.mockResolvedValue(42);
    values.set(UPDATE_SOURCE_STORE_KEY, 'unknown');
    mount();
    await settle();
    shortcuts.forEach(({
      setter
    }) => {
      expect(setters[setter]).toHaveBeenCalledWith('');
    });
    expect(setters.setClipboardUrlBlacklist).toHaveBeenCalledWith([]);
    expect(setters.setUpdateSource).toHaveBeenCalledWith('cloudflare-r2');
  });
  it.each([{
    visibleOrder: [],
    hiddenOrder: []
  }, {
    visibleOrder: null,
    hiddenOrder: 42
  }])('导航无合法数组时保留默认排序', async (value) => {
    api.navOrderGet.mockResolvedValue(value);
    mount();
    await settle();
    expect(setters.setNavOrder).not.toHaveBeenCalled();
    expect(setters.setHiddenNavOrder).not.toHaveBeenCalled();
  });
  it('只有隐藏列表时仍固定用户入口', async () => {
    api.navOrderGet.mockResolvedValue({
      visibleOrder: [],
      hiddenOrder: ['user-pro', 'music-smtc']
    });
    mount();
    await settle();
    expect(setters.setNavOrder).toHaveBeenCalledWith(['user-pro']);
    expect(setters.setHiddenNavOrder).toHaveBeenCalledWith(['music-smtc']);
  });
  it.each([true, false, null])('收藏夹抑制值%s，浏览器存储拒绝不阻断状态', async (value) => {
    values.set(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, value);
    setItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    mount();
    await settle();
    expect(setters.setClipboardUrlSuppressInFavorites).toHaveBeenCalledWith(value !== false);
  });
  it('收藏夹抑制缺省和读取拒绝都成功保存默认缓存', async () => {
    values.delete(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY);
    mount();
    await settle();
    expect(setItem).toHaveBeenCalledWith(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '1');
    resetLifecycle();
    setItem.mockClear();
    api.storeRead.mockRejectedValue(new Error('failed'));
    mount();
    await settle();
    expect(setItem).toHaveBeenCalledWith(CLIPBOARD_URL_SUPPRESS_IN_FAVORITES_KEY, '1');
  });
  it.each(['', null])('版本%s不覆盖当前版本', async (value) => {
    api.updaterVersion.mockResolvedValue(value);
    mount();
    await settle();
    expect(setters.setAboutVersion).not.toHaveBeenCalled();
  });
  it('旧preload没有版本接口仍可读取其他设置', async () => {
    delete api.updaterVersion;
    mount();
    await settle();
    expect(setters.setAboutVersion).not.toHaveBeenCalled();
    expect(setters.setHideHotkey).toHaveBeenCalledWith('Alt+B');
  });
});
describe('一次性设置跳转意图', () => {
  it.each([{
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
  }] as const)('$intent设置目标并消费存储意图', async (value) => {
    values.set(SETTINGS_OPEN_TAB_STORE_KEY, value.intent);
    api.storeWrite.mockRejectedValue(new Error('write failed'));
    mount();
    await settle();
    expect(setters.setActiveTab).toHaveBeenCalledWith(value.tab);
    if ('setter' in value && value.setter) expect(setters[value.setter]).toHaveBeenCalledWith(value.page);
    expect(api.storeWrite).toHaveBeenCalledWith(SETTINGS_OPEN_TAB_STORE_KEY, null);
  });
  it('未知意图不修改页面、不消费存储', async () => {
    values.set(SETTINGS_OPEN_TAB_STORE_KEY, 'unknown');
    mount();
    await settle();
    expect(setters.setActiveTab).not.toHaveBeenCalled();
    expect(api.storeWrite).not.toHaveBeenCalled();
  });
});
