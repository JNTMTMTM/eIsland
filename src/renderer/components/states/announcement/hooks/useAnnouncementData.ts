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
 * @file useAnnouncementData.ts
 * @description 公告数据拉取 Hook
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import {
  fetchCurrentAnnouncement,
  type AnnouncementData,
} from '../../../../api/announcement/announcementApi';
import type { UseAnnouncementDataResult } from '../types/useAnnouncementData.types';

/**
 * 拉取并维护公告数据状态。
 * @returns 公告加载状态与数据。
 */
export function useAnnouncementData(): UseAnnouncementDataResult {
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = await fetchCurrentAnnouncement();
      if (cancelled) return;
      setAnnouncement(result);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, announcement };
}
