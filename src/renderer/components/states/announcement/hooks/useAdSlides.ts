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
 * @file useAdSlides.ts
 * @description 广告轮播图数据拉取 Hook
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { fetchAdSlides, type AdSlideData } from '../../../../api/announcement/announcementApi';
import type { AdSlide } from '../types/AdSlides.types';

/**
 * 拉取并维护广告轮播图数据状态。
 * @returns 广告轮播图数据。
 */
export function useAdSlides(): AdSlide[] {
  const [slides, setSlides] = useState<AdSlide[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const result = await fetchAdSlides();
      if (cancelled) return;
      setSlides(result.map((item) => ({
        title: item.title,
        imageUrl: item.imageUrl,
        linkUrl: item.linkUrl,
      })));
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return slides;
}
