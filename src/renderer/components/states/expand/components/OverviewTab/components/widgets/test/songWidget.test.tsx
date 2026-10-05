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
 * @file songWidget.test.tsx
 * @description SongWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, find, invoke, text } from '../../../../../../test/tree';

import { SongWidget } from '../SongWidget';
import type { TreeElement } from '../../../../../../test/tree';
const api = { mediaPrev: vi.fn(), mediaPlayPause: vi.fn(), mediaNext: vi.fn(), mediaToggleMuted: vi.fn().mockResolvedValue(true) };

const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { mediaInfo: { title: 'Song', artist: 'Artist', album: 'Album' }, coverImage: 'cover.jpg', isPlaying: true, isMusicPlaying: true, dominantColor: [1, 2, 3], syncedLyrics: [{ text: 'Original' }, { text: 'Next lyric' }], lyricsLoading: false, currentPositionMs: 1500, setExpandTab: vi.fn() }, settings: { lyricsEnabled: true, karaokeEnabled: false }, lyric: { currentIdx: 0, hasLyrics: true, isIntro: false, currentLine: null, currentText: 'Original', hasSyllables: false } }));
vi.mock('../../../../../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../../../../../../lyrics/hooks/useLyricsSettings', () => ({ useLyricsSettings: () => model.settings }));
vi.mock('../../../../../../lyrics/hooks/useCurrentLyric', () => ({ useCurrentLyric: () => model.lyric }));
vi.mock('../../../../../../lyrics/hooks/useKaraokeScrollProgress', () => ({ useKaraokeScrollProgress: () => 0.5 }));
function render() { slots.cursor = 0; return ((SongWidget() as TreeElement)); }
beforeEach(() => { model.store.isMusicPlaying = true; model.store.lyricsLoading = false; model.settings.lyricsEnabled = true; model.lyric.hasLyrics = true; vi.stubGlobal('window', { api }); });
describe('SongWidget', () => {
  it('renders track metadata and forwards transport controls', () => { const root = render(); expect(text(root)).toContain('SongArtistAlbum'); ['prev', 'pause', 'next'].forEach((key) => { invoke(find(root, (node) => node.type === 'button' && node.props.title === `overview.song.${key}`), 'onClick'); }); expect(api.mediaPrev).toHaveBeenCalledOnce(); expect(api.mediaPlayPause).toHaveBeenCalledOnce(); expect(api.mediaNext).toHaveBeenCalledOnce(); });
  it('toggles lyrics to show current/next lines and loading/empty branches', () => { const root = render(); invoke(find(root, (node) => node.type === 'button' && node.props.title === 'overview.song.lyric'), 'onClick'); expect(text(render())).toContain('OriginalNext lyric'); model.store.lyricsLoading = true; expect(text(render())).toContain('songTab.lyrics.loading'); model.store.lyricsLoading = false; model.lyric.hasLyrics = false; expect(text(render())).toContain('songTab.lyrics.empty'); });
  it('disables lyrics and unknown mute controls, then toggles known mute state', async () => { model.settings.lyricsEnabled = false; let root = render(); expect(find(root, (node) => node.props.title === 'overview.song.lyric').props.disabled).toBe(true); expect(find(root, (node) => node.props.title === 'overview.song.mute').props.disabled).toBe(true); slots.values[1] = false; root = render(); await invoke(find(root, (node) => node.props.title === 'overview.song.mute'), 'onClick'); expect(api.mediaToggleMuted).toHaveBeenCalledOnce(); expect(slots.values[1]).toBe(true); });
  it('renders missing music state and opens full song page', () => { model.store.isMusicPlaying = false; const root = render(); expect(text(root)).toContain('overview.song.empty'); invoke(byClass(root, 'ov-dash-widget-title'), 'onClick'); expect(model.store.setExpandTab).toHaveBeenCalledWith('song'); });
});
