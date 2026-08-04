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
 * @file AnnouncementContent.test.ts
 * @description 公告列表选择交互单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  setShowVideo: vi.fn(),
  setListExpanded: vi.fn(),
  selectAnnouncement: vi.fn(),
  useAnnouncementData: vi.fn(),
}));

/**
 * 本测试以纯函数方式调用组件（不经 React reconciler），因此 useEffect / useCallback / useRef
 * 需要桩函数。若后续需要验证定时器或淡入淡出逻辑，应改用 @testing-library/react 的 render()。
 */
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initialValue: unknown) => initialValue === true
      ? [true, mocks.setListExpanded]
      : [true, mocks.setShowVideo],
    useCallback: (fn: unknown) => fn,
    useEffect: () => {},
    useRef: (initialValue: unknown) => ({ current: initialValue }),
  };
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options: string | { defaultValue: string }) =>
      typeof options === 'string' ? options : options.defaultValue,
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));
vi.mock('../../../../store/slices', () => ({
  default: () => ({ setHover: vi.fn() }),
}));
vi.mock('../hooks/useAnnouncementData', () => ({
  useAnnouncementData: mocks.useAnnouncementData,
}));
vi.mock('../hooks/useAdSlides', () => ({
  useAdSlides: () => [],
}));

import { AnnouncementContent } from '../AnnouncementContent';
import { AnnouncementHeader } from '../components/AnnouncementHeader';
import { SvgIcon } from '../../../../utils/SvgIcon';

describe('AnnouncementContent', () => {
  beforeEach(() => {
    mocks.setShowVideo.mockReset();
    mocks.selectAnnouncement.mockReset();
    mocks.useAnnouncementData.mockReset();
  });

  it('renders the announcement list and resets video when selection changes', () => {
    const announcements = [
      { id: 1, title: 'First', content: 'A' },
      { id: 2, title: '', content: 'B' },
    ];
    mocks.useAnnouncementData.mockReturnValue({
      loading: false,
      announcements,
      selectedAnnouncement: announcements[0],
      socialConfig: {
        githubUrl: 'https://github.com/example/project',
        bilibiliUrl: 'https://space.bilibili.com/1',
        qqInviteUrl: 'https://qm.qq.com/example',
        qqQrImageUrl: 'https://cdn.example.com/qr.jpg',
      },
      selectAnnouncement: mocks.selectAnnouncement,
    });

    const root = AnnouncementContent() as ReactElement<{ children: ReactElement }>;
    const panel = root.props.children as ReactElement<{ children: ReactElement }>;
    const detail = panel.props.children as ReactElement<{ children: ReactElement[] }>;
    const body = detail.props.children[2] as ReactElement<{ announcementList: ReactElement }>;
    const list = body.props.announcementList as ReactElement<{ children: ReactElement[]; className: string }>;
    const nav = list.props.children[0] as ReactElement<{ children: ReactElement<{ onClick: () => void }>[] }>;
    const buttons = nav.props.children;

    // 断言列表容器结构
    expect(list.props.className).toContain('announcement-list-container');

    // 断言广告位是容器的第二个子元素
    const adSpace = list.props.children[1] as ReactElement<{ className: string; style?: { cursor?: string } }>;
    expect(adSpace.props.className).toContain('announcement-ad-space');

    // 当 useAdSlides 返回空数组时，广告位应渲染占位符且光标为 default
    expect(adSpace.props.style?.cursor).toBe('default');

    // 现有行为：点击第二个公告按钮仍然有效
    buttons[1].props.onClick();

    expect(buttons).toHaveLength(2);
    expect((buttons[1].props.children as ReactElement<{ children: string }>).props.children).toBe('系统公告');
    expect(mocks.selectAnnouncement).toHaveBeenCalledWith(announcements[1]);
    expect(mocks.setShowVideo).toHaveBeenCalledWith(false);
  });

  it('passes sidebar toggle state to the header', () => {
    const announcements = [{ id: 1, title: 'First', content: 'A' }];
    mocks.useAnnouncementData.mockReturnValue({
      loading: false,
      announcements,
      selectedAnnouncement: announcements[0],
      socialConfig: {
        githubUrl: 'https://github.com/example/project',
        bilibiliUrl: 'https://space.bilibili.com/1',
        qqInviteUrl: 'https://qm.qq.com/example',
        qqQrImageUrl: 'https://cdn.example.com/qr.jpg',
      },
      selectAnnouncement: mocks.selectAnnouncement,
    });

    const root = AnnouncementContent() as ReactElement<{ children: ReactElement }>;
    const panel = root.props.children as ReactElement<{ children: ReactElement }>;
    const detail = panel.props.children as ReactElement<{ children: ReactElement[] }>;
    const header = detail.props.children[0] as ReactElement<{
      canToggleList: boolean;
      listExpanded: boolean;
      onToggleList: () => void;
    }>;

    expect(header.props.canToggleList).toBe(true);
    expect(header.props.listExpanded).toBe(true);
    header.props.onToggleList();

    expect(mocks.setListExpanded).toHaveBeenCalledTimes(1);
    expect(mocks.setListExpanded.mock.calls[0][0](true)).toBe(false);
  });

  it('renders the collapse icon immediately before the Bilibili button', () => {
    const header = AnnouncementHeader({
      announcement: { id: 1, title: 'First', content: 'A' },
      socialConfig: {
        githubUrl: 'https://github.com/example/project',
        bilibiliUrl: 'https://space.bilibili.com/1',
        qqInviteUrl: 'https://qm.qq.com/example',
        qqQrImageUrl: 'https://cdn.example.com/qr.jpg',
      },
      showVideo: false,
      showQr: false,
      canToggleList: true,
      listExpanded: true,
      onToggleList: vi.fn(),
      onToggleVideo: vi.fn(),
      onToggleQr: vi.fn(),
      onClose: vi.fn(),
    }) as ReactElement<{ children: ReactElement[] }>;
    const actions = header.props.children[1] as ReactElement<{ children: ReactElement[] }>;
    const [toggleButton, bilibiliButton] = actions.props.children;

    expect(toggleButton.props.className).toContain('announcement-list-toggle-btn');
    expect(toggleButton.props.children.props.src).toBe(SvgIcon.COLLAPSE);
    expect(bilibiliButton.props.className).toBe('announcement-bilibili-btn');
  });
});