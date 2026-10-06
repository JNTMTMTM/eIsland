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
 * @file smtcNativeBoundaries.test.ts
 * @description 真实 SMTC 订阅与封面提色的异步叶边界、状态通知和播放器别名测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NowPlayingInfo } from '../../../../../../../preload/types/media';
const { color } = vi.hoisted(() => ({ color: vi.fn() }));
vi.mock('colorthief', () => ({ getColor: color }));
const current = vi.fn();
const source = vi.fn();
const subscribe = vi.fn();
const unsubscribe = vi.fn();
const images: ImageLeaf[] = [];
class ImageLeaf {
  crossOrigin = '';

  src = '';

  onload: (() => Promise<void>) | null = null;

  onerror: (() => void) | null = null;

  /** 记录原生图片叶，允许测试控制加载或失败。 */
  constructor() { images.push(this); }
}
const song: NowPlayingInfo = { title: 'Song', artist: 'Singer', album: '', isPlaying: true, position_ms: 0, duration_ms: 100, canFastForward: false, canSkip: false, canLike: false, canChangeVolume: false, canSetOutput: false };
/** 等待封面及源检测的真实异步链。 */
async function settle(): Promise<void> {
  await Array.from({ length: 20 }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}
beforeEach(() => {
  vi.resetModules();
  color.mockReset().mockResolvedValue({ rgb: () => ({ r: 10, g: 20, b: 30 }) });
  current.mockReset().mockReturnValue(new Promise(() => {}));
  source.mockReset().mockResolvedValue({ sources: [] });
  subscribe.mockReset().mockReturnValue(unsubscribe);
  unsubscribe.mockReset();
  images.length = 0;
  vi.stubGlobal('Image', ImageLeaf);
  vi.stubGlobal('window', { api: { mediaCurrentInfoGet: current, musicDetectSourceAppId: source, onNowPlayingInfo: subscribe } });
});
afterEach(async () => {
  const actions = await import('../smtcActions');
  actions.dispose();
  vi.unstubAllGlobals();
});

describe('SMTC native boundaries', () => {
  it.each(['color', 'empty', 'reject', 'image-error'])('extracts the real cover path %s', async (outcome) => {
    if (outcome === 'empty') color.mockResolvedValue(null);
    if (outcome === 'reject') color.mockRejectedValue(new Error('canvas denied'));
    const utils = await import('../smtcUtils');
    const pending = utils.extractDominantColor('data:image/png;base64,cover');
    expect(images[0]).toMatchObject({ src: 'data:image/png;base64,cover', crossOrigin: 'Anonymous' });
    if (outcome === 'image-error') images[0].onerror?.();
    else await images[0].onload?.();
    expect(await pending).toEqual(outcome === 'color' ? [10, 20, 30] : [0, 0, 0]);
  });
  it.each([{ app: '', name: '', icon: undefined }, { app: '/path/Spotify.exe', name: 'Spotify', icon: 'SPOTIFY' }, { app: '.exe', name: '.exe', icon: undefined }, { app: 'unknown', name: 'unknown', icon: undefined }])('resolves player name and icon $app', async ({ app, name, icon }) => {
    const utils = await import('../smtcUtils');
    expect(utils.extractPlayerName(app)).toBe(name);
    expect(utils.getPlayerIcon(app)).toBe(icon);
  });
  it('notifies every actual subscriber only after metadata resolves', async () => {
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    const listener = vi.fn();
    store.runtime.listeners.add(listener);
    actions.ensureInitialized();
    const pending = actions.handleNowPlaying({ ...song, thumbnail: 'cover' });
    expect(listener).not.toHaveBeenCalled();
    await images[0].onload?.();
    await pending;
    expect(store.runtime.meta).toMatchObject({ title: 'Song', album: '', coverImage: 'cover', dominantColor: [10, 20, 30], sourceAppId: '' });
    expect(listener).toHaveBeenCalledOnce();
    await actions.handleNowPlaying(null);
    expect(store.runtime.status).toBe('no-media');
    expect(store.runtime.meta).toBeNull();
    expect(store.dominantColorCache.size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });
  it.each([
    { response: null, expected: '' },
    { response: {}, expected: '' },
    { response: { sources: [{ sourceAppId: 'first', isPlaying: false, hasTitle: true }] }, expected: 'first' },
    { response: { sources: [{ sourceAppId: 'first', isPlaying: true, hasTitle: false }, { sourceAppId: 'active', isPlaying: true, hasTitle: true }] }, expected: 'active' },
  ])('resolves source app and caches nonempty identifiers $expected', async ({ response, expected }) => {
    source.mockResolvedValue(response);
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    actions.ensureInitialized();
    await actions.handleNowPlaying(song);
    expect(store.runtime.sourceAppId).toBe(expected);
    await actions.handleNowPlaying({ ...song, title: 'Next', thumbnail: undefined });
    expect(source).toHaveBeenCalledTimes(expected ? 1 : 2);
  });
  it('contains source detection rejection and ignores events after disposal', async () => {
    source.mockRejectedValue(new Error('native unavailable'));
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    await actions.handleNowPlaying(song);
    expect(source).not.toHaveBeenCalled();
    actions.ensureInitialized();
    actions.ensureInitialized();
    expect(subscribe).toHaveBeenCalledOnce();
    await actions.handleNowPlaying(song);
    expect(store.runtime.meta?.sourceAppId).toBe('');
    actions.dispose();
    actions.dispose();
    await actions.handleNowPlaying(song);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(store.runtime.status).toBe('loading');
  });
  it.each(['event', 'dispose'])('ignores stale initial fetch after %s', async (change) => {
    let resolve!: (value: NowPlayingInfo) => void;
    current.mockReturnValue(new Promise<NowPlayingInfo>((accept) => { resolve = accept; }));
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    actions.ensureInitialized();
    if (change === 'event') await actions.handleNowPlaying({ ...song, title: 'Newer' });
    else actions.dispose();
    resolve(song);
    await settle();
    expect(store.runtime.meta?.title).toBe(change === 'event' ? 'Newer' : undefined);
  });
  it('loads initial metadata and contains a rejected initial fetch on restart', async () => {
    current.mockResolvedValue(song);
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    actions.ensureInitialized();
    await settle();
    expect(store.runtime.status).toBe('success');
    actions.dispose();
    current.mockRejectedValue(new Error('initial failed'));
    actions.ensureInitialized();
    await settle();
    expect(store.runtime.status).toBe('loading');
  });
  it.each(['event', 'dispose'])('ignores pending source lookup after %s', async (change) => {
    let resolve!: (value: { sources: Array<{ sourceAppId: string }> }) => void;
    source.mockReturnValue(new Promise((accept) => { resolve = accept; }));
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    actions.ensureInitialized();
    const pending = actions.handleNowPlaying(song);
    await settle();
    if (change === 'event') await actions.handleNowPlaying(null);
    else actions.dispose();
    resolve({ sources: [{ sourceAppId: 'old' }] });
    await pending;
    expect(store.runtime.meta).toBeNull();
    expect(store.runtime.status).toBe(change === 'event' ? 'no-media' : 'loading');
  });
  it('disposes exported state when its unsubscribe callback is absent', async () => {
    const actions = await import('../smtcActions');
    const store = await import('../smtcStore');
    actions.ensureInitialized();
    store.runtime.unsubscribe = null;
    actions.dispose();
    expect(store.runtime.initialized).toBe(false);
  });
});

it('normalizes an absent album in incoming metadata', async () => {
  const actions = await import('../smtcActions');
  const store = await import('../smtcStore');
  actions.ensureInitialized();
  await actions.handleNowPlaying({ ...song, album: undefined } as unknown as NowPlayingInfo);
  expect(store.runtime.meta?.album).toBe('');
});
