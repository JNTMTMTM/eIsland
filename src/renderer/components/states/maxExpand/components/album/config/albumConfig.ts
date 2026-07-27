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
 * @file albumConfig.ts
 * @description 相册模块常量定义：持久化键、扩展名白名单、UI 参数等。
 * @author 鸡哥
 */

/** 持久化键（store） */
export const STORE_KEY = 'photo-album-items';
/** 持久化键（localStorage 兜底） */
export const LOCAL_STORAGE_KEY = 'eIsland_photo_album_items';
/** 总览每行列数持久化键 */
export const COLUMNS_STORE_KEY = 'photo-album-columns';
/** 总览排序模式持久化键 */
export const SORT_STORE_KEY = 'photo-album-sort';
/** 总览浏览模式持久化键 */
export const GROUP_MODE_STORE_KEY = 'photo-album-group-mode';
/** 灵动岛背景本地同步事件名（与设置页保持一致） */
export const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';
/** 灵动岛背景媒体持久化键 */
export const ISLAND_BG_MEDIA_STORE_KEY = 'island-bg-media';
/** 兼容旧逻辑的背景图片键 */
export const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
/** 支持的图片扩展名（小写、不含点） */
export const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
/** 支持的视频扩展名（小写、不含点） */
export const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'm4v'];
/** 支持的媒体扩展名（小写、不含点） */
export const SUPPORTED_EXTS = [...IMAGE_EXTS, ...VIDEO_EXTS];
/** 总览每行最少列数 */
export const MIN_COLUMNS = 3;
/** 总览每行最大列数 */
export const MAX_COLUMNS = 8;
/** 默认每行列数 */
export const DEFAULT_COLUMNS = 5;
/** 单图视图缩放范围（最小 / 最大） */
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 6;
/** 单图滚轮缩放步长 */
export const ZOOM_STEP = 0.15;
/** MaxExpand 切换动画缓冲（ms）：结束后再开始批量媒体加载，避免首帧卡顿 */
export const MEDIA_LOAD_DELAY_MS = 320;
/** 批量缩略图加载最大并发数 */
export const MEDIA_LOAD_CONCURRENCY = 4;
