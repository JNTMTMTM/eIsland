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
 * @file useIslandStateBridges.test.ts
 * @description 状态桥接 Hook 的真实 Zustand 选择器、歌词比对、原生及本地设置事件和订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { browser, renderWithHooks, resetBrowser, runEffects, settle, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import useIslandStore from '../../../store/isLandStore';
import { useLyricsDisplayStore } from '../../../store/lyricsDisplayStore';
import { useIslandStateBridges } from '../useIslandStateBridges';
vi.hoisted(() => { vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } })); });
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
// 测试替身不提供 React 调度器，把歌词显示开关的 zustand Hook 绑定到当前快照。
vi.mock('../../../store/lyricsDisplayStore', async (load) => {
  const actual = await load<typeof import('../../../store/lyricsDisplayStore')>();
  const bound = Object.assign(<T,>(selector: (state: ReturnType<typeof actual.useLyricsDisplayStore.getState>) => T): T => selector(actual.useLyricsDisplayStore.getState()), actual.useLyricsDisplayStore);
  return { ...actual, useLyricsDisplayStore: bound };
});
vi.mock('../../../store/isLandStore', async (load) => {
  const actual = await load<typeof import('../../../store/isLandStore')>();
  const bound = Object.assign(<T>(selector?: (state: ReturnType<typeof actual.default.getState>) => T) => selector ? selector(actual.default.getState()) : actual.default.getState(), actual.default);
  return { ...actual, default: bound };
});
type Options = Parameters<typeof useIslandStateBridges>[0];
let settings: ((channel: string, value: unknown) => void) | null;
let voice: ((active: boolean) => void) | null;
const enabled = vi.fn(() => Promise.resolve(true)); const translationEnabled = vi.fn(() => Promise.resolve(true));
const unsubscribeSettings = vi.fn(() => { settings = null; }); const unsubscribeVoice = vi.fn(() => { voice = null; });
const ipc = {
  musicLyricsEnabledGet: enabled, musicLyricsTranslationEnabledGet: translationEnabled,
  onSettingsChanged: vi.fn((callback: (channel: string, value: unknown) => void) => { settings = callback; return unsubscribeSettings; }),
  onAgentVoiceInputState: vi.fn((callback: (active: boolean) => void) => { voice = callback; return unsubscribeVoice; }),
};
beforeEach(() => {
  resetBrowser(); enabled.mockResolvedValue(true); translationEnabled.mockResolvedValue(true); settings = null; voice = null;
  vi.stubGlobal('window', Object.assign(browser, { api: { ...browser.api, ...ipc } }));
  useIslandStore.setState({ uiStateLocked: false, currentPositionMs: 0, mediaInfo: { title: 'Song', artist: 'Singer', album: '', duration_ms: 0 } });
  useLyricsDisplayStore.setState({ lyricsEnabled: true });
});
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 构建真实调用方提供的桥接数据与可观察切换回调。
 * @param patch - 当前播放状态覆盖。
 * @returns 桥接参数。
 */
function options(patch: Partial<Options> = {}): Options {
  return { state: 'idle', timerState: 'idle', isPlaying: true, syncedLyrics: [{ time_ms: 0, text: 'Original' }], lyricsLoading: false, translationLyrics: null,
    setLyrics: vi.fn(), setLyricsTranslation: vi.fn(), setAgentVoiceInput: vi.fn(), setIdle: vi.fn(), ...patch };
}
/**
 * 更新真实 Zustand 值并运行目标 Hook 的选择器与 effect。
 * @param input - 当前调用方参数。
 * @returns 无返回值。
 */
function commit(input: Options): void {
  useIslandStore.setState({ state: input.state, syncedLyrics: input.syncedLyrics, translationLyrics: input.translationLyrics });
  renderWithHooks(() => useIslandStateBridges(input)); runEffects();
}
/**
 * 运行初次订阅并提交异步设置结果。
 * @param input - 当前调用方参数。
 * @returns 初始化完成结果。
 */
async function mount(input: Options): Promise<void> {
  commit(input); await settle(); commit(input);
}
/**
 * 模拟已保存并已加载的「歌词功能关闭」设置。
 * @returns 无返回值。
 */
function titleMode(): void {
  enabled.mockResolvedValue(false);
  useLyricsDisplayStore.setState({ lyricsEnabled: false });
}
describe('useIslandStateBridges 只显示歌名', () => {
  it('关闭歌词功能后，没有歌词的歌曲也进入歌词状态显示歌名', async () => {
    titleMode();
    const input = options({ syncedLyrics: null, lyricsLoading: false }); await mount(input);
    expect(input.setLyrics).toHaveBeenCalled();
  });
  it('只显示歌名时不升级到翻译歌词', async () => {
    titleMode();
    const input = options({ translationLyrics: { status: 'available', lines: [{ time_ms: 0, text: 'Translated' }] } }); await mount(input);
    expect(input.setLyrics).toHaveBeenCalled(); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
    commit({ ...input, state: 'lyrics' }); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it('UI 锁定时不切换，解锁后翻译歌词状态回退到歌词状态', async () => {
    titleMode(); useIslandStore.setState({ uiStateLocked: true });
    const input = options({ state: 'lyricsTranslation' }); await mount(input);
    expect(input.setLyrics).not.toHaveBeenCalled();
    useIslandStore.setState({ uiStateLocked: false }); commit(input);
    expect(input.setLyrics).toHaveBeenCalled();
  });
  it('只显示歌名时翻译歌词状态回退到歌词状态', async () => {
    titleMode();
    const input = options({ state: 'lyricsTranslation' }); await mount(input);
    expect(input.setLyrics).toHaveBeenCalled();
  });
  it('没有歌名或未播放时不进入', async () => {
    titleMode();
    useIslandStore.setState({ mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 } });
    const noTitle = options({ syncedLyrics: null }); await mount(noTitle); expect(noTitle.setLyrics).not.toHaveBeenCalled();
    useIslandStore.setState({ mediaInfo: { title: 'Song', artist: '', album: '', duration_ms: 0 } });
    const paused = options({ isPlaying: false }); await mount(paused); expect(paused.setLyrics).not.toHaveBeenCalled();
  });
});
describe('useIslandStateBridges 实际状态与设置', () => {
  it.each([
    { state: 'hover' }, { timerState: 'running' }, { isPlaying: false },
  ] satisfies Partial<Options>[])('不符合歌词显示条件时不切换：%s', async (patch) => {
    const input = options(patch); await mount(input); expect(input.setLyrics).not.toHaveBeenCalled(); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it('未获取到歌词时以前奏样式进入歌词状态，不使用翻译歌词', async () => {
    const input = options({ syncedLyrics: null, lyricsLoading: false, translationLyrics: { status: 'available', lines: [{ time_ms: 0, text: 'Translated' }] } });
    await mount(input);
    expect(input.setLyrics).toHaveBeenCalled(); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it('未获取到歌词且没有歌名时保持 idle', async () => {
    useIslandStore.setState({ mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 } });
    const input = options({ syncedLyrics: null, lyricsLoading: false }); await mount(input);
    expect(input.setLyrics).not.toHaveBeenCalled();
  });
  it('歌词加载中可进入普通歌词；关闭歌词功能后只有带歌名的歌曲进入', async () => {
    const input = options({ syncedLyrics: null, lyricsLoading: true }); await mount(input); expect(input.setLyrics).toHaveBeenCalled();
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-enabled', value: false } }));
    expect(useLyricsDisplayStore.getState().lyricsEnabled).toBe(false);
    vi.mocked(input.setLyrics).mockClear(); commit(input); expect(input.setLyrics).toHaveBeenCalled();
    useIslandStore.setState({ mediaInfo: { title: '', artist: '', album: '', duration_ms: 0 } });
    vi.mocked(input.setLyrics).mockClear(); commit(input); expect(input.setLyrics).not.toHaveBeenCalled();
  });
  it.each([
    null, { status: 'unsupported', lines: null }, { status: 'available', lines: null }, { status: 'available', lines: [] },
  ] satisfies Options['translationLyrics'][])('无有效翻译时进入普通歌词：%s', async (translationLyrics) => {
    const input = options({ translationLyrics }); await mount(input); expect(input.setLyrics).toHaveBeenCalled(); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it.each(['Original', 'Translated'])('通过真实当前歌词比对决定翻译目标：%s', async (text) => {
    const input = options({ translationLyrics: { status: 'available', lines: [{ text, time_ms: 0 }] } }); await mount(input);
    expect(input.setLyrics).toHaveBeenCalledTimes(text === 'Original' ? 1 : 0);
    expect(input.setLyricsTranslation).toHaveBeenCalledTimes(text === 'Translated' ? 1 : 0);
  });
  it('翻译开关关闭时有翻译也使用普通歌词', async () => {
    const input = options({ state: 'hover', translationLyrics: { status: 'available', lines: [{ time_ms: 0, text: 'Translated' }] } });
    translationEnabled.mockResolvedValue(false); await mount(input); commit({ ...input, state: 'idle' });
    expect(input.setLyrics).toHaveBeenCalledOnce(); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it.each(['Original', 'Translated'])('歌词页收到翻译后升级或保留：%s', async (text) => {
    const input = options({ state: 'lyrics', translationLyrics: { status: 'available', lines: [{ text, time_ms: 0 }] } }); await mount(input);
    expect(input.setLyricsTranslation).toHaveBeenCalledTimes(text === 'Translated' ? 1 : 0);
  });
  it('歌词页翻译设置关闭与缺少翻译均不升级', async () => {
    const input = options({ state: 'lyrics' }); await mount(input); expect(input.setLyricsTranslation).not.toHaveBeenCalled();
    settings?.('music:lyrics-translation-enabled', false); commit({ ...input, translationLyrics: { status: 'available', lines: [{ time_ms: 0, text: 'Translated' }] } });
    expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it('本地设置事件关闭翻译页回退，恢复开关后不重复回退', async () => {
    const input = options({ state: 'lyricsTranslation' }); await mount(input);
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-translation-enabled', value: false } })); commit(input);
    expect(input.setLyrics).toHaveBeenCalledOnce();
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-translation-enabled', value: true } })); commit(input);
    expect(input.setLyrics).toHaveBeenCalledOnce();
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-enabled', value: false } })); commit({ ...input, state: 'idle' });
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'other', value: true } })); settings?.('other', true); commit(input);
    expect(input.setLyricsTranslation).not.toHaveBeenCalled();
  });
  it('初始两个设置读取拒绝仍保持默认设置', async () => {
    enabled.mockRejectedValueOnce(new Error('offline')); translationEnabled.mockRejectedValueOnce(new Error('offline'));
    const input = options(); await mount(input); expect(input.setLyrics).toHaveBeenCalledOnce();
  });
  it.each(['idle', 'expanded', 'maxExpand', 'agentVoiceInput'] as const)('语音输入事件使用当前 %s 状态决定进入或退出', async (state) => {
    const input = options({ state, isPlaying: false }); await mount(input); voice?.(true); voice?.(false);
    expect(input.setAgentVoiceInput).toHaveBeenCalledTimes(state === 'expanded' || state === 'maxExpand' ? 0 : 1);
    expect(input.setIdle).toHaveBeenCalledTimes(state === 'agentVoiceInput' ? 1 : 0);
    if (state === 'agentVoiceInput') expect(input.setIdle).toHaveBeenCalledWith(true);
  });
  it('状态改变重订阅语音且卸载移除原生与本地事件监听', async () => {
    const input = options({ state: 'hover', isPlaying: false }); await mount(input); commit({ ...input, state: 'idle' });
    expect(unsubscribeVoice).toHaveBeenCalledOnce(); unmountHooks(); expect(unsubscribeVoice).toHaveBeenCalledTimes(2); expect(unsubscribeSettings).toHaveBeenCalledTimes(2);
    expect(settings).toBeNull(); expect(voice).toBeNull();
    browser.dispatchEvent(new CustomEvent('island:setting-changed', { detail: { channel: 'music:lyrics-enabled', value: false } }));
    commit(input); expect(input.setLyrics).not.toHaveBeenCalled();
  });
  it('可选语音 IPC 缺失时设置订阅仍正常且可清理', async () => {
    vi.stubGlobal('window', Object.assign(browser, { api: { ...browser.api, onAgentVoiceInputState: undefined } }));
    const input = options({ state: 'hover' }); await mount(input); expect(voice).toBeNull(); unmountHooks(); expect(unsubscribeSettings).toHaveBeenCalledTimes(2);
  });
});
