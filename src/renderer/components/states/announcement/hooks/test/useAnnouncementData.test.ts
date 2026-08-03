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
 * @file useAnnouncementData.test.ts
 * @description 公告列表数据 Hook 单元测试
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnnouncementData } from '../../../../../api/announcement/announcementApi';

const reactMocks = vi.hoisted(() => ({
  useState: vi.fn(),
  useEffect: vi.fn(),
}));
const fetchAnnouncements = vi.hoisted(() => vi.fn());

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: reactMocks.useState,
  useEffect: reactMocks.useEffect,
}));
vi.mock('../../../../../api/announcement/announcementApi', () => ({ fetchAnnouncements }));

import { useAnnouncementData } from '../useAnnouncementData';

describe('useAnnouncementData', () => {
  beforeEach(() => {
    reactMocks.useState.mockReset();
    reactMocks.useEffect.mockReset();
    fetchAnnouncements.mockReset();
  });

  it('loads the list, selects the first item, and exposes selection', async () => {
    const announcements: AnnouncementData[] = [
      { id: 1, sortOrder: 10, title: 'First', content: 'A' },
      { id: 2, sortOrder: 5, title: 'Second', content: 'B' },
    ];
    const setLoading = vi.fn();
    const setAnnouncements = vi.fn();
    const setSelectedAnnouncement = vi.fn();
    fetchAnnouncements.mockResolvedValue(announcements);
    reactMocks.useState
      .mockReturnValueOnce([true, setLoading])
      .mockReturnValueOnce([[], setAnnouncements])
      .mockReturnValueOnce([null, setSelectedAnnouncement]);
    reactMocks.useEffect.mockImplementation((effect: () => void) => effect());

    const result = useAnnouncementData();
    result.selectAnnouncement(announcements[1]);

    await vi.waitFor(() => {
      expect(setAnnouncements).toHaveBeenCalledWith(announcements);
      expect(setSelectedAnnouncement).toHaveBeenCalledWith(announcements[0]);
      expect(setLoading).toHaveBeenCalledWith(false);
    });
    expect(setSelectedAnnouncement).toHaveBeenCalledWith(announcements[1]);
  });
});