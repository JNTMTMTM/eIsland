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
 * @file adSlides.ts
 * @description 广告位轮播图配置
 * @author 鸡哥
 */

/** 广告位轮播项 */
export interface AdSlide {
  imageUrl: string;
  linkUrl: string;
}

/** 轮播间隔时间（毫秒） */
export const AD_SLIDE_INTERVAL_MS = 5000;

/** 广告位轮播数据 */
export const AD_SLIDES: AdSlide[] = [
  {
    imageUrl: 'https://eisland-server-download-cdn.pyisland.com/eisland-update/t1.jpg',
    linkUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
  },
  {
    imageUrl: 'https://eisland-server-download-cdn.pyisland.com/eisland-update/t1.jpg',
    linkUrl: 'https://www.bilibili.com/video/BV1GJ411x7h7',
  },
];
