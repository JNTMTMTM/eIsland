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
 * @file announcementLifecycle.test.tsx
 * @description 公告真实目录导航、原生链接点击、媒体参数及头部空状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../hooks/test/announcementHookHarness';
import { byClass, find, invoke, text } from '../../../test/tree';
import { AnnouncementBody } from '../AnnouncementBody';
import { AnnouncementHeader } from '../AnnouncementHeader';
import { AnnouncementVideo } from '../AnnouncementVideo';

vi.mock('dompurify', () => ({ default: { sanitize: (html: string) => html } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const rows = [200, 5].map((top, index) => ({
  tagName: 'H2',
  textContent: index === 0 ? 'First' : 'Second',
  getBoundingClientRect: () => ({ top, height: 20 }),
  scrollIntoView: vi.fn(),
}));
const open = vi.fn().mockResolvedValue(undefined);
const bodyProps: Parameters<typeof AnnouncementBody>[0] = {
  loading: false,
  announcement: { title: 'Title', content: '', contentHtml: '<h2>First</h2><h2>Second</h2>' },
  showVideo: false,
  showQr: false,
  qrImageUrl: '',
};

beforeEach(() => {
  resetHook();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal('document', { createElement: () => ({ innerHTML: '', querySelectorAll: () => rows }) });
  vi.stubGlobal('window', { api: { clipboardOpenUrl: open } });
});
afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('公告原生交互与真实目录生命周期', () => {
  it('挂载目录ref后按正文位置选中标题，点击后平滑定位并忽略非链接点击', () => {
    let tree = renderHook(AnnouncementBody, bodyProps);
    expect(byClass(tree, 'announcement-toc-indicator').props.style).toMatchObject({ opacity: 0 });
    const body = byClass(tree, 'announcement-body');
    const bodyRef = body.props.ref as { current: HTMLDivElement | null };
    bodyRef.current = {
      querySelectorAll: () => rows,
      getBoundingClientRect: () => ({ top: 0 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLDivElement;
    const tocRef = byClass(tree, 'announcement-toc').props.ref as { current: HTMLDivElement | null };
    tocRef.current = { scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) } as HTMLDivElement;
    const first = byClass(tree, 'announcement-toc-item');
    (first.props.ref as (el: HTMLDivElement | null) => void)({ getBoundingClientRect: () => ({ top: 10, height: 20 }) } as HTMLDivElement);
    flushHookEffects();
    tree = renderHook(AnnouncementBody, bodyProps);
    expect(byClass(tree, 'announcement-toc-item').props.className).not.toContain(' active');
    invoke(byClass(tree, 'announcement-toc-item'), 'onClick');
    expect(rows[0].scrollIntoView).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'start' });
    tree = renderHook(AnnouncementBody, bodyProps);
    expect(byClass(tree, 'announcement-toc-item').props.className).toContain(' active');
    const preventDefault = vi.fn();
    invoke(byClass(tree, 'announcement-body'), 'onClick', { preventDefault, target: { closest: () => null } });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    (first.props.ref as (el: HTMLDivElement | null) => void)(null);
  });

  it('视频和二维码可见时隐藏目录，空正文保持空文本', () => {
    const tree = renderHook(AnnouncementBody, {
      ...bodyProps,
      announcement: { title: 'Title', content: '', bvid: 'BV1' },
      showVideo: true,
      showQr: true,
      qrImageUrl: 'qr.png',
    });
    expect(byClass(tree, 'announcement-content-row').props.className).toContain(' video-visible');
    expect(byClass(tree, 'announcement-qr-image').props.src).toBe('qr.png');
    expect(find(tree, (node) => node.type === AnnouncementVideo).props.bvid).toBe('BV1');
    expect(text(byClass(tree, 'announcement-body'))).toBe('');
  });

  it('更新时间、折叠列表和已显示视频正确渲染，只有邀请链接时不切换二维码', () => {
    const onToggleQr = vi.fn();
    const onToggleList = vi.fn();
    const tree = AnnouncementHeader({
      onToggleQr,
      onToggleList,
      announcement: { title: 'Title', content: '', bvid: 'BV1', updatedAt: '2026-10-06T08:00:00Z' },
      socialConfig: { githubUrl: '', bilibiliUrl: '', qqInviteUrl: 'https://qq.test', qqQrImageUrl: '' },
      showVideo: true,
      showQr: false,
      canToggleList: true,
      listExpanded: false,
      onToggleVideo: vi.fn(),
      onClose: vi.fn(),
    });
    expect(text(tree)).toContain('announcement.updatedAt');
    expect(byClass(tree, 'announcement-list-toggle-btn').props['aria-expanded']).toBe(false);
    invoke(byClass(tree, 'announcement-list-toggle-btn'), 'onClick');
    expect(onToggleList).toHaveBeenCalledOnce();
    expect(byClass(tree, 'announcement-video-btn').props.className).toContain(' active');
    invoke(byClass(tree, 'announcement-qq-btn'), 'onClick');
    expect(open).toHaveBeenCalledExactlyOnceWith('https://qq.test');
    expect(onToggleQr).not.toHaveBeenCalled();
  });

  it('显式启用弹幕时播放器查询参数为1', () => {
    const tree = AnnouncementVideo({ bvid: 'BV1', showDanmaku: true });
    const params = new URL(String(find(tree, (node) => node.type === 'iframe').props.src)).searchParams;
    expect(params.get('danmaku')).toBe('1');
  });
});
