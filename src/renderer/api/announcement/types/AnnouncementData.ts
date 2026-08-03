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
 * @file AnnouncementData.ts
 * @description 公告数据结构定义
 * @author 鸡哥
 */

/** 公告数据 */
export interface AnnouncementData {
  /** 公告标识；v1 响应可能不提供 */
  id?: number;
  /** 公告排序值；v1 响应可能不提供 */
  sortOrder?: number;
  /** 公告标题 */
  title: string;
  /** 公告内容 */
  content: string;
  /** HTML格式内容 */
  contentHtml?: string;
  /** 内容格式 */
  contentFormat?: string;
  /** 开始时间 */
  startAt?: string;
  /** 结束时间 */
  endAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** B站视频BV号 */
  bvid?: string;
}
