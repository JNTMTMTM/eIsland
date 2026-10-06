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
 * @file announcementBody.test.tsx
 * @description AnnouncementBody 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { byClass, elements, find, invoke, text } from '../../../test/tree';

import { AnnouncementBody } from '../AnnouncementBody';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

const model = vi.hoisted(() => ({ bodyRef: { current: null }, tocRef: { current: null }, itemRefs: { current: [] as unknown[] }, headings: [] as Array<{ level: number; text: string }>, activeIndex: 0, indicatorTop: 12, handleTocClick: vi.fn(), sanitize: vi.fn((value: string) => value.replace('<script>bad</script>', '')) }));
vi.mock('../../hooks/useAnnouncementToc', () => ({ useAnnouncementToc: () => model }));
vi.mock('dompurify', () => ({ default: { sanitize: model.sanitize } }));
function fixture() { return { loading: false, announcement: { id: 1, title: 'Title', content: 'Plain body', contentHtml: '', bvid: '' }, showVideo: false, showQr: false, qrImageUrl: '', announcementList: createElement('nav'), questionnaireBanner: createElement('aside') }; }
describe('AnnouncementBody', () => {
  it('renders loading and missing announcement fallback', () => { const props = fixture(); props.loading = true; expect(((AnnouncementBody(props) as TreeElement)).props.className).toBe('announcement-empty'); expect(((AnnouncementBody({ ...props, loading: false, announcement: null }) as TreeElement)).props.className).toBe('announcement-empty'); });
  it('renders plain content with announcement list and questionnaire slot', () => { const root = ((AnnouncementBody(fixture()) as TreeElement)); expect(text(root)).toContain('Plain body'); expect(find(root, (node) => node.type === 'nav')).toBeDefined(); expect(find(root, (node) => node.type === 'aside')).toBeDefined(); });
  it('sanitizes rich HTML before forwarding it and opens clicked links externally', () => { const props = fixture(); props.announcement.contentHtml = '<b>Body</b><script>bad</script>'; const root = ((AnnouncementBody(props) as TreeElement)); const body = byClass(root, 'announcement-body'); expect(body.props.dangerouslySetInnerHTML).toEqual({ __html: '<b>Body</b>' }); expect(model.sanitize).toHaveBeenCalledWith(props.announcement.contentHtml); const clipboardOpenUrl = vi.fn(); vi.stubGlobal('window', { api: { clipboardOpenUrl } }); const preventDefault = vi.fn(); invoke(body, 'onClick', { preventDefault, target: { closest: () => ({ href: 'https://example.com' }) } }); expect(preventDefault).toHaveBeenCalledOnce(); expect(clipboardOpenUrl).toHaveBeenCalledWith('https://example.com'); vi.unstubAllGlobals(); });
  it('delegates table of contents clicks and hides it for video/QR views', () => { model.headings = [{ level: 2, text: 'Heading' }]; const props = fixture(); const root = ((AnnouncementBody(props) as TreeElement)); invoke(byClass(root, 'announcement-toc-item'), 'onClick'); expect(model.handleTocClick).toHaveBeenCalledWith('Heading', 0); expect(byClass(root, 'announcement-toc-indicator').props.style).toEqual({ top: '12px', opacity: 1 }); props.showQr = true; expect(elements(((AnnouncementBody(props) as TreeElement))).some((node) => node.props.className === 'announcement-toc')).toBe(false); model.headings = []; });
});
