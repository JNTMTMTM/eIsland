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
 * @file announcementHeader.test.tsx
 * @description AnnouncementHeader 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, invoke, text } from '../../../test/tree';

import { AnnouncementHeader } from '../AnnouncementHeader';
import type { TreeElement } from '../../../test/tree';
const api = { clipboardOpenUrl: vi.fn() };

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

function fixture() { return { announcement: { id: 1, title: 'Announcement', content: '', bvid: 'BV1' }, socialConfig: { githubUrl: 'https://github.com/e', bilibiliUrl: 'https://bilibili.com/e', qqInviteUrl: 'https://qq.com/e', qqQrImageUrl: 'qr.jpg' }, showVideo: false, showQr: false, canToggleList: true, listExpanded: true, onToggleList: vi.fn(), onToggleVideo: vi.fn(), onToggleQr: vi.fn(), onClose: vi.fn() }; }
beforeEach(() => { vi.stubGlobal('window', { api }); });
afterEach(() => vi.unstubAllGlobals());
describe('AnnouncementHeader', () => {
  it('renders title, expanded list state and forwards header controls', () => { const props = fixture(); const root = (AnnouncementHeader(props) as TreeElement); expect(text(root)).toContain('Announcement'); expect(byClass(root, 'announcement-list-toggle-btn').props['aria-expanded']).toBe(true); ([['announcement-list-toggle-btn', props.onToggleList], ['announcement-video-btn', props.onToggleVideo], ['announcement-close-btn', props.onClose]] as const).forEach(([className, callback]) => { invoke(byClass(root, className), 'onClick'); expect(callback).toHaveBeenCalledOnce(); }); });
  it('opens social URLs and only opens QQ invite before QR is shown', () => { const props = fixture(); let root = (AnnouncementHeader(props) as TreeElement); invoke(byClass(root, 'announcement-github-btn'), 'onClick'); invoke(byClass(root, 'announcement-bilibili-btn'), 'onClick'); invoke(byClass(root, 'announcement-qq-btn'), 'onClick'); expect(api.clipboardOpenUrl).toHaveBeenCalledTimes(3); expect(props.onToggleQr).toHaveBeenCalledOnce(); props.showQr = true; root = (AnnouncementHeader(props) as TreeElement); invoke(byClass(root, 'announcement-qq-btn'), 'onClick'); expect(api.clipboardOpenUrl).toHaveBeenCalledTimes(3); expect(props.onToggleQr).toHaveBeenCalledTimes(2); });
  it('omits unavailable controls and falls back to default title', () => { const props = fixture(); props.announcement.title = ''; props.announcement.bvid = ''; props.canToggleList = false; props.socialConfig = { githubUrl: '', bilibiliUrl: '', qqInviteUrl: '', qqQrImageUrl: '' }; const root = (AnnouncementHeader(props) as TreeElement); expect(elements(root).filter((node) => node.type === 'button')).toHaveLength(1); expect(text(root)).not.toContain('Announcement'); });
});
