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
 * @file musicSettingsInteractions.test.ts
 * @description 音乐设置实际生命周期、服务持久化、歌词和播放器交互分支回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MusicSettingsSection } from '../MusicSettingsSection';
import { renderWithHooks, resetLifecycle, runEffects } from '../../../hooks/test/settingsCoverageHarness';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import type { ComponentProps } from 'react';
const store = vi.hoisted(() => ({
  setMusicProvidersLogin: vi.fn()
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../hooks/test/settingsCoverageHarness')).lifecycleHooks
}));
vi.mock('../../../../../../../../store/slices', () => ({
  default: () => store
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {
      error?: string;
    }) => options?.error ? `${key}:${String(options.error)}` : key
  })
}));
const api = {
  musicProviderAuthStatus: vi.fn<() => Promise<{
    loggedIn: boolean;
  }>>(),
  musicProviderModeGet: vi.fn<() => Promise<'guest' | 'logged-in'>>(),
  musicProviderModeSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicProviderAuthClear: vi.fn<() => Promise<void>>(),
  musicWhitelistSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsEnabledSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsTranslationEnabledSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsSourceSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsKaraokeSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsClockSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsCalibrateEnabledSet: vi.fn<(value: unknown) => Promise<void>>(),
  musicLyricsCalibrateDelaySet: vi.fn<(value: unknown) => Promise<void>>()
};
const dispatchEvent = vi.fn<(event: CustomEvent<{ channel: string; value: boolean }> ) => boolean>();
let props: ComponentProps<typeof MusicSettingsSection>;
/**
 * 构造隔离设置状态和可观察回调的完整配置。
 * @returns 配置状态及可观察回调。
 */
function makeProps(): ComponentProps<typeof MusicSettingsSection> {
  return {
    currentMusicSettingsPageLabel: '',
    musicSettingsPage: 'whitelist',
    whitelist: [],
    setWhitelist: vi.fn(),
    whitelistInputError: '',
    setWhitelistInputError: vi.fn(),
    whitelistDraft: '',
    setWhitelistDraft: vi.fn(),
    handleAddWhitelist: vi.fn(),
    handleDetectSourceAppId: vi.fn(() => Promise.resolve()),
    detectingSourceAppId: false,
    detectedSources: [],
    lyricsSourceOptions: [],
    lyricsSource: '',
    setLyricsSource: vi.fn(),
    lyricsKaraoke: false,
    setLyricsKaraoke: vi.fn(),
    lyricsEnabled: false,
    setLyricsEnabled: vi.fn(),
    lyricsTranslationEnabled: false,
    setLyricsTranslationEnabled: vi.fn(),
    lyricsClock: false,
    setLyricsClock: vi.fn(),
    lyricsCalibrateEnabled: false,
    setLyricsCalibrateEnabled: vi.fn(),
    lyricsCalibrateDelay: 10,
    setLyricsCalibrateDelay: vi.fn(),
    musicSmtcUnsubscribeInput: '',
    setMusicSmtcUnsubscribeInput: vi.fn(),
    musicSmtcNeverUnsubscribe: false,
    setMusicSmtcNeverUnsubscribe: vi.fn(),
    saveMusicSmtcUnsubscribeConfig: vi.fn(() => Promise.resolve()),
    setMusicSmtcConfigMessage: vi.fn(),
    musicSmtcConfigMessage: null,
    musicSettingsPages: [],
    musicSettingsPageLabels: {
      whitelist: 'Apps',
      lyrics: 'Lyrics',
      smtc: 'SMTC',
      providers: 'Providers'
    },
    setMusicSettingsPage: vi.fn()
  };
}
/**
 * 执行真实音乐组件并保留 Hook 生命周期。
 * @returns 真实元素树。
 */
function render() {
  return renderWithHooks(() => MusicSettingsSection(props));
}
/**
 * 等待服务状态和回调队列处理。
 * @returns 当前异步队列完成。
 */
async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
/**
 * 按翻译键找到真实按钮。
 * @param label - 按钮实际翻译键。
 * @returns 真实按钮元素。
 */
function button(label: string) {
  return findElement(render(), (node) => node.type === 'button' && textContent(node) === label);
}
beforeEach(() => {
  resetLifecycle();
  vi.resetAllMocks();
  props = makeProps();
  api.musicProviderAuthStatus.mockResolvedValue({
    loggedIn: false
  });
  api.musicProviderModeGet.mockResolvedValue('guest');
  [api.musicProviderModeSet, api.musicProviderAuthClear, api.musicWhitelistSet, api.musicLyricsEnabledSet, api.musicLyricsTranslationEnabledSet, api.musicLyricsSourceSet, api.musicLyricsKaraokeSet, api.musicLyricsClockSet, api.musicLyricsCalibrateEnabledSet, api.musicLyricsCalibrateDelaySet].forEach((mock) => {
    mock.mockResolvedValue(undefined);
  });
  vi.stubGlobal('window', {
    api,
    dispatchEvent
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('播放器真实持久化与输入', () => {
  it.each([true, false])('白名单移除持久化失败=%s仍保留其他进程', async (failure) => {
    props.whitelist = ['QQMusic.exe', 'unknown.exe'];
    if (failure) api.musicWhitelistSet.mockRejectedValue(new Error('offline'));
    const tree = render();
    expect(elements(tree).filter((node) => elementProps(node).className === 'settings-whitelist-icon')).toHaveLength(1);
    invoke(findElement(tree, (node) => elementProps(node).className === 'settings-whitelist-remove'), 'onClick');
    await settle();
    expect(props.setWhitelist).toHaveBeenCalledWith(['unknown.exe']);
    expect(api.musicWhitelistSet).toHaveBeenCalledWith(['unknown.exe']);
  });
  it.each(['netease.exe', 'kugou.exe', 'sodamusic.exe', 'applemusic.exe', 'spotify.exe'])('进程%s显示播放器图标', (name) => {
    props.whitelist = [name];
    expect(elements(render()).filter((node) => elementProps(node).className === 'settings-whitelist-icon')).toHaveLength(1);
  });
  it.each(['', 'invalid'])('输入错误=%s时焦点和编辑只清除已有错误', (error) => {
    props.whitelistInputError = error;
    const input = findElement(render(), (node) => node.type === 'input');
    expect(String(elementProps(input).className).includes(' error')).toBe(Boolean(error));
    invoke(input, 'onFocus');
    invoke(input, 'onChange', {
      target: {
        value: 'spotify.exe'
      }
    });
    expect(props.setWhitelistDraft).toHaveBeenCalledWith('spotify.exe');
    expect(props.setWhitelistInputError).toHaveBeenCalledTimes(error ? 2 : 0);
    invoke(input, 'onKeyDown', {
      key: 'Escape'
    });
    expect(props.handleAddWhitelist).not.toHaveBeenCalled();
    invoke(input, 'onKeyDown', {
      key: 'Enter'
    });
    invoke(button('settings.common.add'), 'onClick');
    expect(props.handleAddWhitelist).toHaveBeenCalledTimes(2);
  });
  it.each([true, false])('检测失败=%s时清除已有错误并等待', async (failure) => {
    props.whitelistInputError = failure ? 'invalid' : '';
    props.detectingSourceAppId = failure;
    if (failure) props.handleDetectSourceAppId = vi.fn(() => Promise.reject(new Error('offline')));
    const key = failure ? 'settings.music.whitelist.fetching' : 'settings.music.whitelist.fetchSourceProcess';
    expect(elementProps(button(key)).disabled).toBe(failure);
    invoke(button(key), 'onClick');
    await settle();
    expect(props.handleDetectSourceAppId).toHaveBeenCalledOnce();
    expect(props.setWhitelistInputError).toHaveBeenCalledTimes(failure ? 1 : 0);
  });
  it.each([true, false])('检测结果增加新进程持久化失败=%s', async (failure) => {
    props.whitelist = ['QQMusic.exe'];
    props.detectedSources = [{
      sourceAppId: 'qqmusic.EXE',
      isPlaying: true,
      hasTitle: true,
      thumbnail: 'cover'
    }, {
      sourceAppId: 'new.exe',
      isPlaying: false,
      hasTitle: false,
      thumbnail: null
    }];
    if (failure) api.musicWhitelistSet.mockRejectedValue(new Error('offline'));
    const tree = render();
    expect(textContent(tree)).toContain('settings.music.whitelist.added');
    expect(elements(tree).filter((node) => elementProps(node).className === 'settings-whitelist-detected-thumb')).toHaveLength(1);
    const rows = elements(tree).filter((node) => elementProps(node).className === 'settings-whitelist-detected-item');
    invoke(findElement(rows[1], (node) => node.type === 'button'), 'onClick');
    await settle();
    expect(props.setWhitelist).toHaveBeenCalledWith(['QQMusic.exe', 'new.exe']);
    expect(api.musicWhitelistSet).toHaveBeenCalledWith(['QQMusic.exe', 'new.exe']);
  });
});
describe('歌词真实事件与边界', () => {
  it.each([true, false])('全部歌词开关持久化失败=%s并分发公开事件', async (failure) => {
    props.musicSettingsPage = 'lyrics';
    props.lyricsCalibrateEnabled = true;
    const bindings = [{
      label: 'settings.music.lyrics.enabledToggle',
      setter: props.setLyricsEnabled,
      api: api.musicLyricsEnabledSet
    }, {
      label: 'settings.music.lyrics.translationToggle',
      setter: props.setLyricsTranslationEnabled,
      api: api.musicLyricsTranslationEnabledSet
    }, {
      label: 'settings.music.lyrics.karaokeToggle',
      setter: props.setLyricsKaraoke,
      api: api.musicLyricsKaraokeSet
    }, {
      label: 'settings.music.lyrics.clockToggle',
      setter: props.setLyricsClock,
      api: api.musicLyricsClockSet
    }, {
      label: 'settings.music.lyrics.calibrateToggle',
      setter: props.setLyricsCalibrateEnabled,
      api: api.musicLyricsCalibrateEnabledSet
    }];
    bindings.forEach((binding) => {
      if (failure) binding.api.mockRejectedValue(new Error('offline'));
      const label = findElement(render(), (node) => node.type === 'label' && textContent(node) === binding.label);
      invoke(findElement(label, (node) => node.type === 'input'), 'onChange', {
        target: {
          checked: true
        }
      });
      expect(binding.setter).toHaveBeenCalledWith(true);
      expect(binding.api).toHaveBeenCalledWith(true);
    });
    await settle();
    expect(dispatchEvent).toHaveBeenCalledTimes(3);
    expect(dispatchEvent.mock.calls.map(([event]) => event.detail)).toEqual([{
      channel: 'music:lyrics-enabled',
      value: true
    }, {
      channel: 'music:lyrics-translation-enabled',
      value: true
    }, {
      channel: 'music:lyrics-karaoke',
      value: true
    }]);
  });
  it.each([true, false])('歌词源持久化失败=%s，未知来源仍显示默认文字', async (failure) => {
    props.musicSettingsPage = 'lyrics';
    props.lyricsSource = 'auto';
    props.lyricsSourceOptions = [{
      value: 'auto',
      label: 'auto'
    }, {
      value: 'custom',
      label: 'Custom'
    }];
    if (failure) api.musicLyricsSourceSet.mockRejectedValue(new Error('offline'));
    const options = elements(render()).filter((node) => node.type === 'button' && String(elementProps(node).className).startsWith('settings-lyrics-source-btn'));
    expect(String(elementProps(options[0]).className)).toContain('active');
    expect(String(elementProps(options[1]).className)).not.toContain('active');
    invoke(options[1], 'onClick');
    await settle();
    expect(props.setLyricsSource).toHaveBeenCalledWith('custom');
    expect(api.musicLyricsSourceSet).toHaveBeenCalledWith('custom');
  });
  it.each([{
    input: '',
    expected: 0
  }, {
    input: '-Infinity',
    expected: 0
  }, {
    input: 'Infinity',
    expected: 120
  }, {
    input: '3.9',
    expected: 3
  }])('校准输入$input规范化为$expected且服务失败安全', async ({
    input,
    expected
  }) => {
    props.musicSettingsPage = 'lyrics';
    props.lyricsCalibrateEnabled = true;
    api.musicLyricsCalibrateDelaySet.mockRejectedValue(new Error('offline'));
    invoke(findElement(render(), (node) => node.type === 'input' && elementProps(node).type === 'number'), 'onChange', {
      target: {
        value: input
      }
    });
    await settle();
    expect(props.setLyricsCalibrateDelay).toHaveBeenCalledWith(expected);
    expect(api.musicLyricsCalibrateDelaySet).toHaveBeenCalledWith(expected);
  });
});
describe('SMTC保存与反馈', () => {
  it.each([null, {
    type: 'error',
    text: 'failed'
  }, {
    type: 'success',
    text: 'saved'
  }] as const)('已有反馈%o时编辑清除并显示对应颜色', (message) => {
    props.musicSettingsPage = 'smtc';
    props.musicSmtcConfigMessage = message;
    const tree = render();
    if (message) {
      const feedback = findElement(tree, (node) => textContent(node) === message.text);
      expect(elementProps(feedback).style).toEqual({
        color: message.type === 'error' ? '#ff8b8b' : '#7df2a0'
      });
    }
    invoke(findElement(tree, (node) => node.type === 'input' && elementProps(node).type === 'number'), 'onChange', {
      target: {
        value: '4000'
      }
    });
    invoke(findElement(tree, (node) => node.type === 'input' && elementProps(node).type === 'checkbox'), 'onChange', {
      target: {
        checked: true
      }
    });
    expect(props.setMusicSmtcUnsubscribeInput).toHaveBeenCalledWith('4000');
    expect(props.setMusicSmtcNeverUnsubscribe).toHaveBeenCalledWith(true);
    expect(props.setMusicSmtcConfigMessage).toHaveBeenCalledTimes(message ? 2 : 0);
  });
  it.each([new Error('offline'), 'bad-value'])('保存拒绝%o生成具体或未知错误反馈', async (error) => {
    props.musicSettingsPage = 'smtc';
    // 非 Error 拒绝值来自 IPC 损坏返回，验证组件已有未知错误兜底。
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- 验证损坏 IPC 的非 Error 拒绝兜底。
    props.saveMusicSmtcUnsubscribeConfig = vi.fn(() => Promise.reject(error));
    invoke(button('settings.common.save'), 'onClick');
    await settle();
    expect(props.setMusicSmtcConfigMessage).toHaveBeenCalledWith({
      type: 'error',
      text: `settings.common.saveFailed:${error instanceof Error ? error.message : 'settings.common.unknownError'}`
    });
  });
  it('保存成功不创建错误反馈', async () => {
    props.musicSettingsPage = 'smtc';
    invoke(button('settings.common.save'), 'onClick');
    await settle();
    expect(props.saveMusicSmtcUnsubscribeConfig).toHaveBeenCalledOnce();
    expect(props.setMusicSmtcConfigMessage).not.toHaveBeenCalled();
  });
});
describe('真实提供方启动和登录生命周期', () => {
  it.each([true, false])('登录状态=%s通过真实启动效果完成加载', async (loggedIn) => {
    props.musicSettingsPage = 'providers';
    api.musicProviderAuthStatus.mockResolvedValue({
      loggedIn
    });
    api.musicProviderModeGet.mockResolvedValue(loggedIn ? 'logged-in' : 'guest');
    expect(elementProps(button('settings.music.providers.sodaMusic.login')).disabled).toBe(true);
    runEffects();
    await settle();
    const key = loggedIn ? 'settings.musicProviderLogin.actions.logout' : 'settings.music.providers.sodaMusic.login';
    expect(elementProps(button(key)).disabled).toBe(false);
    expect(elementProps(button('settings.music.providers.mode.logged-in')).disabled).toBe(!loggedIn);
    invoke(button(key), 'onClick');
    if (loggedIn) {
      expect(elementProps(button(key)).disabled).toBe(true);
      await settle();
      expect(api.musicProviderAuthClear).toHaveBeenCalledWith('qishui');
      expect(textContent(render())).toContain('settings.music.providers.sodaMusic.login');
    } else expect(store.setMusicProvidersLogin).toHaveBeenCalledWith('qishui');
  });
  it('启动请求失败恢复未登录态与guest模式', async () => {
    props.musicSettingsPage = 'providers';
    api.musicProviderAuthStatus.mockRejectedValue(new Error('offline'));
    render();
    runEffects();
    await settle();
    expect(elementProps(button('settings.music.providers.sodaMusic.login')).disabled).toBe(false);
    expect(String(elementProps(button('settings.music.providers.mode.guest')).className)).toContain('active');
  });
  it.each([true, false])('更换请求模式持久化失败=%s，真实本地状态更新', async (failure) => {
    props.musicSettingsPage = 'providers';
    api.musicProviderAuthStatus.mockResolvedValue({
      loggedIn: true
    });
    render();
    runEffects();
    await settle();
    if (failure) api.musicProviderModeSet.mockRejectedValue(new Error('offline'));
    invoke(button('settings.music.providers.mode.logged-in'), 'onClick');
    await settle();
    expect(api.musicProviderModeSet).toHaveBeenCalledWith('logged-in');
    expect(String(elementProps(button('settings.music.providers.mode.logged-in')).className)).toContain('active');
    invoke(button('settings.music.providers.mode.guest'), 'onClick');
    await settle();
    expect(String(elementProps(button('settings.music.providers.mode.guest')).className)).toContain('active');
  });
  it('公开页名损坏时内容为空，导航开关仍正常', () => {
    props.musicSettingsPage = 'unknown' as typeof props.musicSettingsPage;
    expect(elements(render()).some((node) => elementProps(node).className === 'settings-cards')).toBe(false);
    invoke(findElement(render(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(render(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(true);
    invoke(findElement(render(), (node) => 'onToggle' in elementProps(node)), 'onToggle');
    expect(elementProps(findElement(render(), (node) => 'onToggle' in elementProps(node))).expanded).toBe(false);
  });
});
