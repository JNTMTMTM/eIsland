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
 * @file lyricsTab.test.tsx
 * @description LyricsTab 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../../../test/tree';

import { LyricsTab } from '../LyricsTab';
import type { TreeElement } from '../../../../../test/tree';
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { isMusicPlaying: true, isPlaying: true, mediaInfo: { title: 'Song', artist: 'Artist' }, coverImage: 'cover.jpg', dominantColor: [1, 2, 3] }, api: { mediaPrev: vi.fn(), mediaPlayPause: vi.fn(), mediaNext: vi.fn() } }));
vi.mock('../../../../../../../store/slices', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
beforeEach(() => { vi.stubGlobal('window', { api: model.api }); model.store.isMusicPlaying = true; model.store.isPlaying = true; });
describe('LyricsTab', () => {
  it('renders track and artist with active playback and dispatches media actions', () => { const root = ((LyricsTab() as TreeElement)); expect(text(root)).toContain('SongArtist'); expect(root.props.className).toContain('playing'); const buttons = elements(root).filter((node) => node.type === 'button'); const stopPropagation = vi.fn(); buttons.forEach((button) => invoke(button, 'onClick', { stopPropagation })); expect(model.api.mediaPrev).toHaveBeenCalledOnce(); expect(model.api.mediaPlayPause).toHaveBeenCalledOnce(); expect(model.api.mediaNext).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledTimes(3); });
  it('disables controls and marks inactive music', () => { model.store.isMusicPlaying = false; model.store.isPlaying = false; const root = ((LyricsTab() as TreeElement)); expect(byClass(root, 'lrc-title').props.className).toContain('inactive'); expect(elements(root).filter((node) => node.type === 'button').every((node) => node.props.disabled)).toBe(true); expect(byClass(root, 'lrc-play-btn').props.title).toBe('hover.music.play'); });
  it('switches to configured wave background', () => { slots.values = ['wave']; const root = ((LyricsTab() as TreeElement)); const background = elements(root).find((node) => node.props.color !== undefined); expect(background?.props).toMatchObject({ color: [1, 2, 3], playing: true }); });
});
