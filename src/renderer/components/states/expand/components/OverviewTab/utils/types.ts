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
 * @file types.ts
 * @description Overview 模块共享类型定义（待办、快捷方式、倒数日、相册、番茄钟等）。
 * @author 鸡哥
 */

export type Priority = 'P0' | 'P1' | 'P2';
export type Size = 'S' | 'M' | 'L' | 'XL';

export interface TodoSubItem {
  id: number;
  text: string;
  done: boolean;
  priority?: Priority;
  size?: Size;
}

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
  priority?: Priority;
  size?: Size;
  description?: string;
  subTodos?: TodoSubItem[];
}

export interface AppShortcut {
  id: number;
  name: string;
  path: string;
  iconBase64: string | null;
}

export interface CountdownDateItem {
  id: number;
  name: string;
  date: string;
  color: string;
  type: string;
  description?: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

export interface UrlFavoriteItem {
  id: number;
  url: string;
  title: string;
  note: string;
  createdAt: number;
}

export interface OverviewAlbumItem {
  id: number;
  path: string;
  name: string;
  ext: string;
  mediaType: 'image' | 'video';
  addedAt: number;
}

export type AlbumOrderMode = 'sequential' | 'random';
export type AlbumMediaFilter = 'all' | 'image' | 'video';
export type AlbumCardClickBehavior = 'open-album' | 'none';

export interface OverviewAlbumCardConfig {
  intervalMs: number;
  autoRotate: boolean;
  orderMode: AlbumOrderMode;
  mediaFilter: AlbumMediaFilter;
  clickBehavior: AlbumCardClickBehavior;
  videoAutoPlay: boolean;
  videoMuted: boolean;
}

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface PomodoroData {
  phase: PomodoroPhase;
  remaining: number;
  running: boolean;
  completedCount: number;
}
