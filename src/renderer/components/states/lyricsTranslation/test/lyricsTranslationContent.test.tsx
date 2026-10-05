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
 * @file lyricsTranslationContent.test.tsx
 * @description LyricsTranslationContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LyricsTranslationContent } from '../LyricsTranslationContent';

import { LyricsTranslationContentView } from '../components/LyricsTranslationContentView';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
const model = vi.hoisted(() => ({
  store: { isMusicPlaying: true, isPlaying: true, coverImage: 'cover.jpg', dominantColor: [10, 20, 30], syncedLyrics: [], lyricsLoading: false, currentPositionMs: 1500, mediaInfo: { title: 'Song', artist: 'Artist' }, setIdle: vi.fn(), translationLyrics: null as null | { status: string; lines: unknown[] } },
  settings: { karaokeEnabled: false, clockEnabled: true, musicOuterGlowEffectEnabled: true },
  lyric: { currentIdx: 1, hasLyrics: true, isIntro: false, currentLine: { time_ms: 1000, text: 'Original', syllables: [{ text: 'Original', start_offset_ms: 0, duration_ms: 1000 }] }, currentText: 'Original', hasSyllables: false },
}));
vi.mock('../../../../store/slices', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
const translation = vi.hoisted(() => ({ useTranslationLyric: vi.fn(() => 'Translated') }));
vi.mock('../../lyrics/hooks/useLyricsSettings', () => ({ useLyricsSettings: () => model.settings }));
vi.mock('../../lyrics/hooks/useBeijingClock', () => ({ useBeijingClock: () => '12:34' }));
vi.mock('../../lyrics/hooks/useAutoIdle', () => ({ useAutoIdle: vi.fn() }));
vi.mock('../../lyrics/hooks/useCurrentLyric', () => ({ useCurrentLyric: () => model.lyric }));
vi.mock('../hooks/useTranslationLyric', () => ({ useTranslationLyric: translation.useTranslationLyric }));
vi.mock('../hooks/useTranslationFallback', () => ({ useTranslationFallback: vi.fn() }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('LyricsTranslationContent', () => {
  it('forwards combined music, current lyric and translated text to view', () => { model.store.translationLyrics = { status: 'available', lines: [{ text: 'Translated' }] }; const root = ((LyricsTranslationContent() as TreeElement)); expect(root.type).toBe(LyricsTranslationContentView); expect(root.props).toMatchObject({ currentPositionMs: 1500, coverImage: 'cover.jpg', glowEnabled: true, clockEnabled: true, clockText: '12:34', mediaTitle: 'Song', currentText: 'Original', translationText: 'Translated' }); expect(translation.useTranslationLyric).toHaveBeenCalledWith(model.store.translationLyrics.lines, 1, 1500); });
  it('passes null translation lines when unavailable', () => { model.store.translationLyrics = null; ((LyricsTranslationContent() as TreeElement)); expect(translation.useTranslationLyric).toHaveBeenCalledWith(null, 1, 1500); });
});
