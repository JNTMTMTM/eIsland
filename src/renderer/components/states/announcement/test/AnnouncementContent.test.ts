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
  selectAnnouncement: vi.fn(),
  useAnnouncementData: vi.fn(),
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => [true, mocks.setShowVideo],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock('../../../../store/slices', () => ({
  default: () => ({ setHover: vi.fn() }),
}));
vi.mock('../hooks/useAnnouncementData', () => ({
  useAnnouncementData: mocks.useAnnouncementData,
}));

import { AnnouncementContent } from '../AnnouncementContent';

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
      selectAnnouncement: mocks.selectAnnouncement,
    });

    const root = AnnouncementContent() as ReactElement<{ children: ReactElement }>;
    const panel = root.props.children as ReactElement<{ children: ReactElement }>;
    const detail = panel.props.children as ReactElement<{ children: ReactElement[] }>;
    const body = detail.props.children[2] as ReactElement<{ announcementList: ReactElement }>;
    const list = body.props.announcementList as ReactElement<{ children: ReactElement<{ onClick: () => void }>[] }>;
    const buttons = list.props.children;
    buttons[1].props.onClick();

    expect(buttons).toHaveLength(2);
    expect((buttons[1].props.children as ReactElement<{ children: string }>).props.children).toBe('系统公告');
    expect(mocks.selectAnnouncement).toHaveBeenCalledWith(announcements[1]);
    expect(mocks.setShowVideo).toHaveBeenCalledWith(false);
  });
});