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
 * @file announcementContentBranches.test.tsx
 * @description AnnouncementContent branches 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { byClass, find, invoke } from '../../test/tree';

import { AnnouncementContent } from '../AnnouncementContent';

import { AnnouncementHeader } from '../components/AnnouncementHeader';
import { AnnouncementBody } from '../components/AnnouncementBody';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ store: { setHover: vi.fn(), setQuestionnaire: vi.fn() }, data: { loading: false, announcements: [{ id: 1, title: 'First', content: 'Body', bvid: '' }], selectedAnnouncement: { id: 1, title: 'First', content: 'Body', bvid: '' }, socialConfig: { githubUrl: '', bilibiliUrl: '', qqInviteUrl: '', qqQrImageUrl: '' }, selectAnnouncement: vi.fn() }, slides: [] as Array<{ imageUrl: string; linkUrl: string; title: string }>, reminder: { visible: false, loading: false, questionnaire: null } }));
vi.mock('../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../hooks/useAnnouncementData', () => ({ useAnnouncementData: () => model.data }));
vi.mock('../hooks/useAdSlides', () => ({ useAdSlides: () => model.slides }));
vi.mock('../../../components/DynamicIslandQuestionnaireBanner', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../../components/DynamicIslandQuestionnaireBanner')>()), useAnnouncementQuestionnaire: () => model.reminder }));
function render() { slots.cursor = 0; return ((AnnouncementContent() as TreeElement)); }
function list(root: ReturnType<typeof render>) { return find(root, (node) => node.type === AnnouncementBody).props.announcementList as ReturnType<typeof createElement>; }
beforeEach(() => { model.data.loading = false; model.slides = []; });
describe('AnnouncementContent branches', () => {
  it('passes loading state and omits selectable sidebar', () => { model.data.loading = true; const root = render(); expect(find(root, (node) => node.type === AnnouncementBody).props.loading).toBe(true); expect(find(root, (node) => node.type === AnnouncementHeader).props.canToggleList).toBe(false); expect(find(root, (node) => node.type === AnnouncementBody).props.announcementList).toBeUndefined(); });
  it('resets both media toggles when selecting announcement and supports collapsed sidebar', () => { slots.values = [true, true, true, 0, false, false]; let root = render(); invoke(byClass(list(root), 'announcement-list-item'), 'onClick'); expect(model.data.selectAnnouncement).toHaveBeenCalledWith(model.data.announcements[0]); expect(slots.values.slice(0, 2)).toEqual([false, false]); invoke(find(root, (node) => node.type === AnnouncementHeader), 'onToggleList'); root = render(); expect(byClass(list(root), 'announcement-list').props['aria-hidden']).toBe(true); expect(byClass(list(root), 'announcement-list-item').props.tabIndex).toBe(-1); });
  it('renders advertisement placeholder and opens only HTTP links', () => { expect(byClass(list(render()), 'announcement-ad-placeholder')).toBeDefined(); model.slides = [{ imageUrl: 'image.jpg', linkUrl: 'https://example.com', title: 'Ad' }]; const clipboardOpenUrl = vi.fn(); vi.stubGlobal('window', { api: { clipboardOpenUrl } }); const ad = byClass(list(render()), 'announcement-ad-space'); invoke(ad, 'onClick'); expect(clipboardOpenUrl).toHaveBeenCalledWith('https://example.com'); model.slides[0].linkUrl = 'file:///private'; invoke(byClass(list(render()), 'announcement-ad-space'), 'onClick'); expect(clipboardOpenUrl).toHaveBeenCalledOnce(); });
});
