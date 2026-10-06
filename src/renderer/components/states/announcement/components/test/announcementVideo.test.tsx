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
 * @file announcementVideo.test.tsx
 * @description AnnouncementVideo 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, find } from '../../../test/tree';

import { AnnouncementVideo } from '../AnnouncementVideo';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

describe('AnnouncementVideo', () => {
  it('builds encoded embed URL with default playback controls', () => { const root = (AnnouncementVideo({ bvid: 'BV test&x' }) as TreeElement); const iframe = find(root, (node) => node.type === 'iframe'); const params = new URL(String(iframe.props.src)).searchParams; expect(params.get('bvid')).toBe('BV test&x'); expect(params.get('page')).toBe('1'); expect(params.has('cid')).toBe(false); expect(params.has('t')).toBe(false); expect(iframe.props.allowFullScreen).toBe(true); expect(iframe.props.loading).toBe('lazy'); });
  it('applies explicit playback controls and aspect ratio', () => { const root = (AnnouncementVideo({ bvid: 'BV1', cid: '123', page: 2, className: 'custom', autoplay: true, showDanmaku: false, startTime: 12, aspectRatio: 9 / 16 }) as TreeElement); const params = new URL(String(find(root, (node) => node.type === 'iframe').props.src)).searchParams; expect(Object.fromEntries(params)).toMatchObject({ cid: '123', page: '2', autoplay: '1', danmaku: '0', t: '12' }); expect(root.props.className).toContain('custom'); expect(byClass(root, 'announcement-video-container').props.style).toMatchObject({ paddingTop: '56.25%' }); });
});
