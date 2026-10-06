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
 * @file lyricsTranslationContentLifecycle.test.tsx
 * @description 双语歌词内容保留真实设置、索引、翻译匹配和回退Hooks，验证换行一致性、缺失翻译及子视图组合。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { findElement, hookMocks, textContent } from '../../../test/elementHarness';
import useIslandStore from '../../../../store/slices';
import { settleBackground } from '../../../hooks/test/standaloneIpcHarness';
import { contentApi, resetContent, settings } from '../../lyrics/test/lyricsContentHarness';
import { LyricsTranslationContent } from '../LyricsTranslationContent';
import { LyricsTranslationContentView } from '../components/LyricsTranslationContentView';
import { LyricsWithTranslation } from '../components/LyricsWithTranslation';
import type { ReactElement } from 'react';
import type { LyricsTranslationContentViewProps } from '../config/types';
import type { TranslationLyricsResult } from '../../../../api/lyrics/lrcApi';
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
beforeEach(() => resetContent('lyricsTranslation'));
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 将目标公开ReactElement返回值约束为真实固定视图属性。
 * @returns 组件实际返回的视图元素。
 */
function renderContent(): ReactElement<LyricsTranslationContentViewProps> {
  return renderWithHooks(LyricsTranslationContent) as ReactElement<LyricsTranslationContentViewProps>;
}
/**
 * 提交真实内容Hooks，按实际异步设置重新求值视图属性。
 * @returns 内容组件实际产生的视图元素。
 */
async function commit(): Promise<ReactElement<LyricsTranslationContentViewProps>> {
  renderContent(); runEffects(); await settleBackground();
  const root = renderContent(); runEffects(); return root;
}
describe('真实双语歌词内容组合与状态回退', () => {
  it('真实时间索引与设置产生双语视图，实际子组件保留原文及翻译', async () => {
    const root = await commit();
    expect(root.type).toBe(LyricsTranslationContentView); expect(root.props).toMatchObject({ clockText: '08:00', currentText: 'original', translationText: '翻译', currentIdx: 0, glowEnabled: true });
    const view = LyricsTranslationContentView(root.props);
    const lines = findElement(view, (element) => element.type === LyricsWithTranslation);
    const actual = LyricsWithTranslation(lines.props as unknown as Parameters<typeof LyricsWithTranslation>[0]);
    expect(textContent(actual)).toContain('original'); expect(textContent(actual)).toContain('翻译');
    expect(useIslandStore.getState().state).toBe('lyricsTranslation'); expect(contentApi.expandWindowLyrics).not.toHaveBeenCalled();
  });
  it.each([null, { status: 'not-fetched', lines: null }, { status: 'available', lines: null }, { status: 'available', lines: [] }] satisfies Array<TranslationLyricsResult | null>)('缺失翻译%j走真实回退并恢复普通歌词窗口', async (translationLyrics) => {
    useIslandStore.setState({ translationLyrics }); const root = await commit();
    expect(root.props.translationText).toBe(''); expect(useIslandStore.getState().state).toBe('lyrics');
    expect(contentApi.expandWindowLyrics).toHaveBeenCalledTimes(2); expect(contentApi.enableMousePassthrough).toHaveBeenCalledOnce();
  });
  it('歌词行变化后原文等于翻译时真实回退，稳定索引重绘不重复窗口副作用', async () => {
    useIslandStore.setState({ translationLyrics: { status: 'available', lines: [{ time_ms: 1000, text: '翻译' }, { time_ms: 2000, text: 'second' }] } });
    await commit(); useIslandStore.setState({ currentPositionMs: 2000 });
    const root = renderContent(); expect(root.props).toMatchObject({ currentIdx: 1, currentText: 'second', translationText: 'second' }); runEffects();
    expect(useIslandStore.getState().state).toBe('lyrics'); expect(contentApi.expandWindowLyrics).toHaveBeenCalledTimes(2);
    renderContent(); runEffects(); expect(contentApi.expandWindowLyrics).toHaveBeenCalledTimes(2);
  });
  it('当前索引未变时一致文本保持双语状态，真实换行且内容不同仍保持双语', async () => {
    useIslandStore.setState({ translationLyrics: { status: 'available', lines: [{ time_ms: 1000, text: 'original' }, { time_ms: 2000, text: '不同翻译' }] } });
    await commit(); expect(useIslandStore.getState().state).toBe('lyricsTranslation');
    useIslandStore.setState({ currentPositionMs: 2000 }); renderContent(); runEffects();
    expect(useIslandStore.getState().state).toBe('lyricsTranslation'); expect(contentApi.expandWindowLyrics).not.toHaveBeenCalled();
  });
  it('换到空原文行或翻译仍在前奏时不按完全一致判定回退', async () => {
    useIslandStore.setState({ syncedLyrics: [{ time_ms: 1000, text: 'original' }, { time_ms: 2000, text: '' }] });
    await commit(); useIslandStore.setState({ currentPositionMs: 2000 }); renderContent(); runEffects();
    expect(contentApi.expandWindowLyrics).not.toHaveBeenCalled();
    useIslandStore.setState({ currentPositionMs: 1500, syncedLyrics: [{ time_ms: 1000, text: 'original' }, { time_ms: 2000, text: 'second' }],
      translationLyrics: { status: 'available', lines: [{ time_ms: 5000, text: '后到翻译' }] } });
    renderContent(); runEffects();
    useIslandStore.setState({ currentPositionMs: 2000 }); const root = renderContent(); runEffects();
    expect(root.props.translationText).toBe(''); expect(contentApi.expandWindowLyrics).not.toHaveBeenCalled();
  });
  it('真实加载、前奏及逐字配置属性均由当前媒体状态导出', async () => {
    settings.karaoke = true; settings.clock = false;
    useIslandStore.setState({ lyricsLoading: true }); let root = await commit(); expect(root.props).toMatchObject({ lyricsLoading: true, currentText: '', clockEnabled: false });
    useIslandStore.setState({ lyricsLoading: false, currentPositionMs: 999 }); root = renderContent(); expect(root.props).toMatchObject({ isIntro: true, currentLine: null });
    useIslandStore.setState({ currentPositionMs: 1500, syncedLyrics: [{ time_ms: 1000, text: 'original', syllables: [{ start_offset_ms: 0, duration_ms: 1000, text: 'original' }] }] });
    root = renderContent(); expect(root.props).toMatchObject({ karaokeEnabled: true, hasSyllables: true, currentText: 'original' });
  });
});
