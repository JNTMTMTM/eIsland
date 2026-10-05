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
 * @file lyricsContent.test.tsx
 * @description LyricsContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, find, text } from '../../test/tree';
import { LyricsContent } from '../LyricsContent';

import { ScrollingText } from '../components/ScrollingText';
import { KaraokeSyllableLine } from '../components/KaraokeSyllableLine';
import type { TreeElement } from '../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
const model = vi.hoisted(() => ({
  store: { isMusicPlaying: true, isPlaying: true, coverImage: 'cover.jpg', dominantColor: [10, 20, 30], syncedLyrics: [], lyricsLoading: false, currentPositionMs: 1500, mediaInfo: { title: 'Song', artist: 'Artist' }, setIdle: vi.fn(), translationLyrics: null as null | { status: string; lines: unknown[] } },
  settings: { karaokeEnabled: false, clockEnabled: true, musicOuterGlowEffectEnabled: true },
  lyric: { currentIdx: 1, hasLyrics: true, isIntro: false, currentLine: { time_ms: 1000, text: 'Original', syllables: [{ text: 'Original', start_offset_ms: 0, duration_ms: 1000 }] }, currentText: 'Original', hasSyllables: false },
}));
vi.mock('../../../../store/slices', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
vi.mock('../hooks/useLyricsSettings', () => ({ useLyricsSettings: () => model.settings }));
vi.mock('../hooks/useBeijingClock', () => ({ useBeijingClock: () => '12:34' }));
vi.mock('../hooks/useAutoIdle', () => ({ useAutoIdle: vi.fn() }));
vi.mock('../hooks/useCurrentLyric', () => ({ useCurrentLyric: () => model.lyric }));
vi.mock('../hooks/useKaraokeScrollProgress', () => ({ useKaraokeScrollProgress: () => 0.5 }));
beforeEach(() => { model.store.lyricsLoading = false; model.lyric.isIntro = false; model.lyric.currentText = 'Original'; model.settings.karaokeEnabled = false; model.lyric.hasSyllables = false; model.settings.clockEnabled = true; model.store.isPlaying = true; });
describe('LyricsContent', () => {
  it('renders clock, cover and plain lyric', () => { const root = ((LyricsContent() as TreeElement)); expect(text(root)).toContain('12:34'); expect(text(root)).toContain('Original'); expect(find(root, (node) => node.type === ScrollingText).props.scrollProgress).toBe(0.5); expect(byClass(root, 'idle-album-cover').props.className).toContain('glowing'); });
  it('prioritizes loading and intro over current text', () => { model.store.lyricsLoading = true; expect(text(((LyricsContent() as TreeElement)))).toContain('songTab.lyrics.loading'); model.store.lyricsLoading = false; model.lyric.isIntro = true; expect(text(((LyricsContent() as TreeElement)))).toContain('Song'); expect(text(((LyricsContent() as TreeElement)))).not.toContain('Original'); });
  it('renders empty fallback and omits disabled clock', () => { model.lyric.currentText = ''; model.settings.clockEnabled = false; const root = ((LyricsContent() as TreeElement)); expect(text(root)).toContain('songTab.lyrics.empty'); expect(text(root)).not.toContain('12:34'); });
  it('forwards karaoke timing and marks paused glow', () => { model.settings.karaokeEnabled = true; model.lyric.hasSyllables = true; model.store.isPlaying = false; const root = ((LyricsContent() as TreeElement)); expect(find(root, (node) => node.type === KaraokeSyllableLine).props).toMatchObject({ lineStartMs: 1000, posMs: 1500 }); expect(byClass(root, 'idle-glow').props.className).toContain('paused'); });
});
