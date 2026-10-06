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
 * @file albumCarouselWidget.test.tsx
 * @description AlbumCarouselWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, find, invoke, text } from '../../../../../../test/tree';

import { AlbumCarouselWidget } from '../AlbumCarouselWidget';
import type { TreeElement } from '../../../../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function config() { return { intervalMs: 5000, autoRotate: true, orderMode: 'sequential', mediaFilter: 'all', clickBehavior: 'open-album', videoAutoPlay: true, videoMuted: true }; }
function values(mediaType = 'image') { return [[{ mediaType, id: 1, path: 'photo.jpg', name: 'First', ext: '.jpg', addedAt: 1 }, { mediaType, id: 2, path: 'next.jpg', name: 'Second', ext: '.jpg', addedAt: 1 }], config(), 0, false, 'next', true, mediaType === 'image' ? 'data:image/png;base64,photo' : null, mediaType === 'video' ? 'video-url' : null, null]; }
function render(openAlbumPage = vi.fn()) { slots.cursor = 0; return ((AlbumCarouselWidget({ openAlbumPage }) as TreeElement)); }
describe('AlbumCarouselWidget', () => {
  it('renders an empty album and forwards its title link', () => { const open = vi.fn(); const root = render(open); expect(text(root)).toContain('overview.album.empty'); invoke(byClass(root, 'ov-dash-widget-title'), 'onClick'); expect(open).toHaveBeenCalledOnce(); });
  it('renders image preview and wraps previous/next navigation', () => { slots.values = values(); let root = render(); expect(byClass(root, 'ov-dash-album-preview').props).toMatchObject({ src: 'data:image/png;base64,photo', alt: 'First' }); const prev = find(root, (node) => node.props.title === 'overview.album.prev'); invoke(prev, 'onClick'); expect(text(render())).toContain('Second'); root = render(); invoke(find(root, (node) => node.props.title === 'overview.album.next'), 'onClick'); expect(text(render())).toContain('First'); });
  it('renders configured video playback and pauses carousel', () => { slots.values = values('video'); const root = render(); expect(find(root, (node) => node.type === 'video').props).toMatchObject({ src: 'video-url', muted: true, autoPlay: true, loop: true }); invoke(byClass(root, 'ov-dash-album-btn-play'), 'onClick'); expect(slots.values[3]).toBe(true); });
  it('filters incompatible media and disables manual pause when auto rotate is off', () => { const state = values(); (state[1] as ReturnType<typeof config>).mediaFilter = 'video'; slots.values = state; expect(text(render())).toContain('overview.album.empty'); slots.values = values(); (slots.values[1] as ReturnType<typeof config>).autoRotate = false; expect(byClass(render(), 'ov-dash-album-btn-play').props.disabled).toBe(true); });
});
