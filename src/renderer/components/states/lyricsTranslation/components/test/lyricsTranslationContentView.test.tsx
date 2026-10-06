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
 * @file lyricsTranslationContentView.test.tsx
 * @description LyricsTranslationContentView 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { find } from '../../../test/tree';

import { LyricsTranslationContentView } from '../LyricsTranslationContentView';

import { GlowBackground } from '../GlowBackground';
import { AlbumCover } from '../AlbumCover';
import { BeijingClock } from '../BeijingClock';
import { LyricsWithTranslation } from '../LyricsWithTranslation';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
describe('LyricsTranslationContentView', () => {
  it('forwards visual, clock and lyric state to its four component boundaries', () => { const props = { currentPositionMs: 10, lyricsLoading: true, isMusicPlaying: true, isPlaying: false, coverImage: 'cover', dominantColor: [1, 2, 3] as [number, number, number], glowEnabled: true, clockText: '10:00', clockEnabled: true, isIntro: false, mediaTitle: 'Song', currentIdx: 1, currentText: 'Original', currentLine: null, hasSyllables: false, karaokeEnabled: false, translationText: 'Translated' }; const root = ((LyricsTranslationContentView(props) as TreeElement)); expect(root.props.className).toBe('lyrics-content'); const visual = { isMusicPlaying: true, isPlaying: false, coverImage: 'cover', glowEnabled: true, dominantColor: props.dominantColor }; expect(find(root, (node) => node.type === GlowBackground).props).toEqual(visual); expect(find(root, (node) => node.type === AlbumCover).props).toEqual(visual); expect(find(root, (node) => node.type === BeijingClock).props).toEqual({ clockText: '10:00', clockEnabled: true }); expect(find(root, (node) => node.type === LyricsWithTranslation).props).toMatchObject({ currentPositionMs: 10, lyricsLoading: true, translationText: 'Translated', currentLine: null }); });
});
