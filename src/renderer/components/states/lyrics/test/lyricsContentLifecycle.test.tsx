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
 * @file lyricsContentLifecycle.test.tsx
 * @description 普通歌词内容组件保留真实设置、北京时间、当前行、自动闲置与逐字进度Hooks的组合分支测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, textContent } from '../../../test/elementHarness';
import useIslandStore from '../../../../store/slices';
import { settleBackground } from '../../../hooks/test/standaloneIpcHarness';
import { ScrollingText } from '../components/ScrollingText';
import { KaraokeSyllableLine } from '../components/KaraokeSyllableLine';
import { LyricsContent } from '../LyricsContent';
import { contentApi, contentSetting, resetContent, settings } from './lyricsContentHarness';
import type { ReactElement } from 'react';
vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' } }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...(await load<typeof import('react-i18next')>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../store/slices')>();
  return { ...actual, default: Object.assign(<T,>(selector: (state: ReturnType<typeof actual.default.getState>) => T): T => selector(actual.default.getState()), actual.default) };
});
beforeEach(() => resetContent());
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 提交所有真实歌词Hooks并等原生设置返回。
 * @returns 真实内容树。
 */
async function commit(): Promise<ReactElement> {
  renderWithHooks(LyricsContent); runEffects(); await settleBackground();
  const root = renderWithHooks(LyricsContent); runEffects(); return root;
}
describe('真实普通歌词内容组合', () => {
  it('真实设置加载后显示北京时间、歌词与媒体光晕，分钟变化实时重绘', async () => {
    let root = await commit(); expect(textContent(root)).toContain('08:00');
    expect(findElement(root, (element) => element.type === ScrollingText).props.children).toBe('original');
    expect(findElement(root, (element) => element.props.className === 'idle-glow active').props.style).toEqual({ background: 'radial-gradient(ellipse at 10% 50%, rgba(10, 20, 30, 0.35) 0%, transparent 60%)' });
    vi.advanceTimersByTime(60000); root = renderWithHooks(LyricsContent); expect(textContent(root)).toContain('08:01');
  });
  it('加载中显示三点，不自动闲置；无可用歌词停止加载才真实切idle', async () => {
    useIslandStore.setState({ syncedLyrics: null, lyricsLoading: true }); let root = await commit();
    expect(elements(root).filter((element) => element.props.className === 'lyrics-loading-dot')).toHaveLength(3);
    expect(useIslandStore.getState().state).toBe('lyrics'); expect(contentApi.collapseWindow).not.toHaveBeenCalled();
    useIslandStore.setState({ lyricsLoading: false }); root = renderWithHooks(LyricsContent); runEffects();
    expect(textContent(root)).toContain('songTab.lyrics.empty'); expect(useIslandStore.getState().state).toBe('idle');
    expect(contentApi.collapseWindow).toHaveBeenCalledOnce(); expect(contentApi.enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('真实前奏只显示歌曲标题，空歌词行显示空态而非逐字组件', async () => {
    useIslandStore.setState({ currentPositionMs: 999 }); let root = await commit();
    expect(findElement(root, (element) => element.props.className === 'lyrics-intro-title-center').props.children).toBe('Album title');
    expect(elements(root).some((element) => element.type === ScrollingText)).toBe(false);
    useIslandStore.setState({ currentPositionMs: 1000, syncedLyrics: [{ time_ms: 1000, text: '' }] });
    root = renderWithHooks(LyricsContent); expect(textContent(root)).toContain('songTab.lyrics.empty');
  });
  it('暂停保留光晕，失去封面或音乐关闭则不发光并真实闲置', async () => {
    useIslandStore.setState({ isPlaying: false }); let root = await commit();
    expect(findElement(root, (element) => element.props.className === 'idle-glow active paused')).toBeDefined();
    expect(findElement(root, (element) => String(element.props.className).includes('idle-album-cover paused glowing')).props.style).toMatchObject({ boxShadow: '0 0 12px 4px rgba(10, 20, 30, 0.5)' });
    useIslandStore.setState({ coverImage: null }); root = renderWithHooks(LyricsContent); expect(findElement(root, (element) => element.props.className === 'idle-glow').props.style).toBeUndefined();
    useIslandStore.setState({ isMusicPlaying: false }); root = renderWithHooks(LyricsContent); runEffects();
    expect(useIslandStore.getState().state).toBe('idle'); expect(contentApi.collapseWindow).toHaveBeenCalledOnce();
  });
  it('配置原生clock=false与外发光事件关闭真实显示及计时器', async () => {
    settings.clock = false; const root = await commit();
    expect(elements(root).some((element) => element.props.className === 'lyrics-time')).toBe(false); expect(vi.getTimerCount()).toBe(0);
    contentSetting('music-outer-glow-effect-changed', false);
    const updated = renderWithHooks(LyricsContent);
    expect(findElement(updated, (element) => element.props.className === 'idle-glow').props.style).toBeUndefined();
  });
  it('逐字设置加载后真实进度与音节子组件一致，配置关闭恢复普通文本', async () => {
    settings.karaoke = true; useIslandStore.setState({ currentPositionMs: 1850, syncedLyrics: [{ time_ms: 1000, text: 'original', syllables: [{ start_offset_ms: 0, duration_ms: 2000, text: 'original' }] }] });
    let root = await commit(); let scrolling = findElement(root, (element) => element.type === ScrollingText);
    expect(scrolling.props).toMatchObject({ className: 'lyrics-current-line lyrics-karaoke', scrollProgress: 0.5 });
    const syllableElement = findElement(scrolling.props.children, (element) => element.type === KaraokeSyllableLine);
    const syllable = KaraokeSyllableLine(syllableElement.props as unknown as Parameters<typeof KaraokeSyllableLine>[0]);
    expect(textContent(syllable)).toBe('original'); expect(findElement(syllable, (element) => element.type === 'span').props.style).toEqual({ '--syl-prog': '42.50%' });
    contentSetting('island:setting-changed', { channel: 'music:lyrics-karaoke', value: false });
    root = renderWithHooks(LyricsContent); scrolling = findElement(root, (element) => element.type === ScrollingText);
    expect(scrolling.props).toMatchObject({ className: 'lyrics-current-line', children: 'original' }); expect(scrolling.props.scrollProgress).toBeUndefined();
  });
});
