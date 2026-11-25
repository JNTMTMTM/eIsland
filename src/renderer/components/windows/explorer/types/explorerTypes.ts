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
 * @file explorerTypes.ts
 * @description 文件浏览、位置和交互状态的类型。
 * @author 鸡哥
 */
export type PlaceKind = 'home' | 'desktop' | 'documents' | 'downloads' | 'drive';

export interface ExplorerPlace {
  kind: PlaceKind;
  path: string;
}

export interface ExplorerEntry {
  name: string;
  path: string;
  directory: boolean;
  size: number | null;
  modified: number | null;
}

export interface ExplorerDirectory {
  path: string;
  parent: string | null;
  entries: ExplorerEntry[];
}

export type DialogAction = 'create' | 'rename' | 'trash';
export type TransferAction = 'copy' | 'move';
export interface ExplorerTransfer {
  action: TransferAction;
  entry: ExplorerEntry;
}

export interface UseExplorerReturn {
  places: ExplorerPlace[];
  directory: ExplorerDirectory | null;
  address: string;
  setAddress: (address: string) => void;
  navigate: (path: string) => void;
  travel: (offset: number) => void;
  back: boolean;
  forward: boolean;
  refresh: () => void;
  busy: boolean;
  error: string;
  selection: ExplorerEntry | null;
  select: (entry: ExplorerEntry) => void;
  open: (entry: ExplorerEntry) => void;
  query: string;
  setQuery: (query: string) => void;
  entries: ExplorerEntry[];
  dialog: DialogAction | null;
  showDialog: (dialog: DialogAction | null) => void;
  name: string;
  setName: (name: string) => void;
  confirm: () => void;
  transfer: ExplorerTransfer | null;
  prepare: (action: TransferAction) => void;
  paste: () => void;
  page: number;
  pages: number;
  changePage: (page: number) => void;
  total: number;
}

export interface ExplorerViewProps {
  explorer: UseExplorerReturn;
}
