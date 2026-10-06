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
 * @file smtcStep.test.ts
 * @description SmtcStep 实际渲染分支、事件与边界输入测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SmtcStep } from '../SmtcStep';
import { elementProps, elements, findElement, invoke, resetState, textContent } from '../../../../../test/elementHarness';
const hooks = vi.hoisted(() => ({ status: 'loading', meta: null as null | {
  title: string;
  artist: string;
  album: string;
  sourceAppId: string;
  coverImage: string;
  isPlaying: boolean;
  dominantColor: [
    number,
    number,
    number
  ];
} }));
const api = vi.hoisted(() => ({ mediaPrev: vi.fn(), mediaPlayPause: vi.fn(), mediaNext: vi.fn() }));
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { resolvedLanguage: 'en-US', language: 'en-US', changeLanguage: vi.fn(() => Promise.resolve()) } }) }));
vi.mock('../../hooks/useSmtcTest', () => ({ useSmtcTest: () => hooks }));
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  hooks.status = 'loading';
  hooks.meta = null;
  vi.stubGlobal('window', { api });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('SmtcStep', () => {
  it.each(['loading', 'no-media'])('renders the media hint for %s without playback controls', (status) => {
    hooks.status = status;
    const tree = SmtcStep({ onNext: vi.fn(), onPrev: vi.fn() });
    expect(textContent(tree)).toContain('guide.smtc.hint');
    expect(elements(tree).filter((node) => elementProps(node).title === 'guide.smtc.pause')).toHaveLength(0);
  });
  it.each([false, true])('renders successful playback playing=%s and routes controls', (isPlaying) => {
    hooks.status = 'success';
    hooks.meta = { isPlaying, title: 'Song', artist: 'Artist', album: '', sourceAppId: 'Unknown', coverImage: '', dominantColor: [10, 20, 30] };
    const tree = SmtcStep({ onNext: vi.fn(), onPrev: vi.fn() });
    expect(textContent(tree)).toContain('Song');
    expect(elements(tree).filter((node) => elementProps(node).className === 'guide-smtc-album')).toHaveLength(0);
    invoke(findElement(tree, (node) => elementProps(node).title === (isPlaying ? 'guide.smtc.pause' : 'guide.smtc.play')), 'onClick');
    expect(api.mediaPlayPause).toHaveBeenCalledOnce();
    invoke(findElement(tree, (node) => elementProps(node).title === 'guide.smtc.next'), 'onClick');
    expect(api.mediaNext).toHaveBeenCalledOnce();
  });
});

it.each(['Spotify.exe', ''])('renders covers and album and controls source %s', (sourceAppId) => {
  hooks.status = 'success';
  hooks.meta = { sourceAppId, title: 'Song', artist: 'Singer', album: 'Album', coverImage: 'cover.png', isPlaying: false, dominantColor: [1, 2, 3] };
  const tree = SmtcStep({ onNext: vi.fn(), onPrev: vi.fn() });
  expect(elements(tree).find((node) => elementProps(node).className === 'guide-smtc-album')).toBeDefined();
  expect(elements(tree).find((node) => elementProps(node).className === 'guide-smtc-player-icon')).toEqual(sourceAppId ? expect.anything() : undefined);
  expect(textContent(tree)).toContain(sourceAppId ? 'Spotify' : 'guide.smtc.unknownPlayer');
  invoke(findElement(tree, (node) => elementProps(node).title === 'guide.smtc.prev'), 'onClick');
  expect(api.mediaPrev).toHaveBeenCalledOnce();
  vi.stubGlobal('window', {});
  ['guide.smtc.prev', 'guide.smtc.play', 'guide.smtc.next'].forEach((title) => {
    expect(() => invoke(findElement(tree, (node) => elementProps(node).title === title), 'onClick')).not.toThrow();
  });
});
it('renders no successful panel until metadata arrives', () => {
  hooks.status = 'success';
  hooks.meta = null;
  expect(elements(SmtcStep({ onNext: vi.fn(), onPrev: vi.fn() })).some((node) => elementProps(node).className === 'guide-smtc-result')).toBe(false);
});
