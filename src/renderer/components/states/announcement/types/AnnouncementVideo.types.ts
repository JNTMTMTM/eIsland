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
 * @file AnnouncementVideo.types.ts
 * @description AnnouncementVideo 组件相关类型定义
 * @author 鸡哥
 */

/** AnnouncementVideo 组件入参 */
export interface AnnouncementVideoProps {
  /** B站视频 BV 号 */
  bvid: string;
  /** 多 P 视频指定 cid */
  cid?: string;
  /** 默认第几 P，默认 1 */
  page?: number;
  className?: string;
  autoplay?: boolean;
  showDanmaku?: boolean;
  /** 从指定秒数开始播放 */
  startTime?: number;
  /** 宽高比 (height / width)，默认 9/16 = 0.5625 */
  aspectRatio?: number;
}
