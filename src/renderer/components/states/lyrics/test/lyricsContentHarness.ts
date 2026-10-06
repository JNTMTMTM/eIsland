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
 * @file lyricsContentHarness.ts
 * @description 歌词内容集成测试私有浏览器设置与窗口边界；保持真实歌词Hooks、会话状态及查询工具。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import useIslandStore from '../../../../store/slices';
import { resetLifecycle } from '../../../components/test/contentLifecycleHarness';
import { MUSIC_OUTER_GLOW_EFFECT_STORE_KEY } from '../config/lyricsConstants';
export const settings = { karaoke: false, clock: true, glow: true };
export const contentApi = {
  musicLyricsEnabledGet: vi.fn(() => Promise.resolve(true)),
  musicLyricsKaraokeGet: vi.fn(() => Promise.resolve(settings.karaoke)),
  musicLyricsClockGet: vi.fn(() => Promise.resolve(settings.clock)),
  musicLyricsCalibrateEnabledGet: vi.fn(() => Promise.resolve(true)),
  musicLyricsCalibrateDelayGet: vi.fn(() => Promise.resolve(20)),
  storeRead: vi.fn((key: string) => Promise.resolve<unknown>(key === MUSIC_OUTER_GLOW_EFFECT_STORE_KEY ? settings.glow : undefined)),
  collapseWindow: vi.fn(), enableMousePassthrough: vi.fn(), expandWindowLyrics: vi.fn(),
};
export let contentWindow: EventTarget;
/**
 * 为真实内容组件准备合法媒体状态与原生设置叶边界。
 * @param state - 当前歌词页面状态。
 */
export function resetContent(state: 'lyrics' | 'lyricsTranslation' = 'lyrics'): void {
  resetLifecycle(); vi.clearAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  Object.assign(settings, { karaoke: false, clock: true, glow: true });
  contentWindow = Object.assign(new EventTarget(), { api: contentApi, location: { hostname: 'localhost' } });
  vi.stubGlobal('window', contentWindow);
  useIslandStore.setState({ state, uiStateLocked: false, isMusicPlaying: true, isPlaying: true, coverImage: 'cover://album',
    dominantColor: [10, 20, 30], lyricsLoading: false, currentPositionMs: 1500,
    syncedLyrics: [{ time_ms: 1000, text: 'original' }, { time_ms: 2000, text: 'second' }],
    mediaInfo: { title: 'Album title', artist: 'Artist', album: '', duration_ms: 3000 },
    translationLyrics: { status: 'available', lines: [{ time_ms: 1000, text: '翻译' }, { time_ms: 2000, text: '第二行' }] } });
}
/**
 * 通过实际EventTarget广播配置更新，不直接写入Hook内部状态。
 * @param type - 真实设置事件名称。
 * @param detail - 配置值。
 */
export function contentSetting(type: string, detail: unknown): void {
  contentWindow.dispatchEvent(new CustomEvent(type, { detail }));
}
