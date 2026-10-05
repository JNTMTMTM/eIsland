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
 * @file lyricsWithTranslation.test.tsx
 * @description LyricsWithTranslation 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, find, text } from '../../../test/tree';
import { LyricsWithTranslation } from '../LyricsWithTranslation';

import { KaraokeSyllableLine } from '../../../lyrics/components/KaraokeSyllableLine';
import { ScrollingText } from '../../../lyrics/components/ScrollingText';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
vi.mock('../../../lyrics/hooks/useKaraokeScrollProgress', () => ({ useKaraokeScrollProgress: () => 0.5 }));
function fixture() { return { currentPositionMs: 1500, lyricsLoading: false, isIntro: false, mediaTitle: 'Song', currentIdx: 1, currentText: 'Original', currentLine: { time_ms: 1000, text: 'Original', syllables: [{ text: 'Original', start_offset_ms: 0, duration_ms: 1000 }] }, hasSyllables: false, karaokeEnabled: false, translationText: 'Translation' }; }
describe('LyricsWithTranslation', () => {
  it('prioritizes loading above intro and current lyrics', () => { const props = fixture(); props.lyricsLoading = true; props.isIntro = true; const root = ((LyricsWithTranslation(props) as TreeElement)); expect(text(root)).toContain('songTab.lyrics.loading'); expect(text(root)).not.toContain('Original'); });
  it('renders intro title without translation', () => { const props = fixture(); props.isIntro = true; const root = ((LyricsWithTranslation(props) as TreeElement)); expect(text(root)).toContain('Song'); expect(text(root)).not.toContain('Translation'); });
  it('renders original and optional translation', () => { const props = fixture(); let root = ((LyricsWithTranslation(props) as TreeElement)); expect(text(root)).toContain('OriginalTranslation'); expect(find(root, (node) => node.type === ScrollingText).props.scrollProgress).toBe(0.5); props.translationText = ''; root = ((LyricsWithTranslation(props) as TreeElement)); expect(elements(root).some((node) => node.props.className === 'lyrics-translation-line')).toBe(false); });
  it('delegates syllable timing only when karaoke is enabled', () => { const props = fixture(); props.karaokeEnabled = true; props.hasSyllables = true; const root = ((LyricsWithTranslation(props) as TreeElement)); expect(find(root, (node) => node.type === KaraokeSyllableLine).props).toEqual({ syllables: props.currentLine.syllables, lineStartMs: 1000, posMs: 1500 }); });
  it('renders empty lyric fallback', () => { const props = fixture(); props.currentText = ''; expect(text(((LyricsWithTranslation(props) as TreeElement)))).toContain('songTab.lyrics.empty'); });
});
