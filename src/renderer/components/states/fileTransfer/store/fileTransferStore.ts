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
 * @file fileTransferStore.ts
 * @description 文件中转站列表状态与持久化
 * @author 鸡哥
 */

import { create } from 'zustand';
import { FILE_TRANSFER_STORE_KEY } from '../config/fileTransferConfig';
import { mergeFileTransferPaths, parseFileTransferItems } from '../utils/fileTransferUtils';
import type { FileTransferItem } from '../types';

interface FileTransferState {
  items: FileTransferItem[];
  loaded: boolean;
}

export const useFileTransferStore = create<FileTransferState>(() => ({ items: [], loaded: false }));

/**
 * 将列表写入持久化存储；写入失败只影响重启后的恢复，不回滚界面。
 * @param items - 待保存的中转文件列表。
 */
function persist(items: FileTransferItem[]): void {
  window.api.storeWrite(FILE_TRANSFER_STORE_KEY, items).catch(() => {});
}

/**
 * 应用列表变更；恢复完成前不写入，避免覆盖尚未读取的已保存列表。
 * @param update - 基于当前列表计算新列表。
 */
function commit(update: (items: FileTransferItem[]) => FileTransferItem[]): void {
  const { items, loaded } = useFileTransferStore.getState();
  const next = update(items);
  useFileTransferStore.setState({ items: next });
  if (loaded) persist(next);
}

let loading: Promise<void> | null = null;

/** 读取已保存列表，并把恢复前已拖入的文件保留在最前。 */
async function restore(): Promise<void> {
  let saved: FileTransferItem[] = [];
  try {
    saved = parseFileTransferItems(await window.api.storeRead(FILE_TRANSFER_STORE_KEY));
  } catch {
    // 读取失败时以空列表启动，后续写入会覆盖损坏数据。
  }
  const pending = useFileTransferStore.getState().items;
  const items = mergeFileTransferPaths(saved, pending.map((item) => item.path), Date.now());
  useFileTransferStore.setState({ items, loaded: true });
  if (pending.length > 0) persist(items);
}

/**
 * 从持久化存储恢复中转文件列表；重复调用共享同一次读取。
 * @returns 恢复完成的 Promise。
 */
export function loadFileTransferItems(): Promise<void> {
  loading ??= restore();
  return loading;
}

/**
 * 将拖入的文件路径加入中转站。
 * @param paths - 本机绝对路径列表。
 */
export function addFileTransferPaths(paths: string[]): void {
  if (paths.length === 0) return;
  commit((items) => mergeFileTransferPaths(items, paths, Date.now()));
}

/**
 * 从中转站移除指定文件（不会删除磁盘文件）。
 * @param path - 待移除文件的本机路径。
 */
export function removeFileTransferItem(path: string): void {
  commit((items) => items.filter((item) => item.path !== path));
}

/** 清空中转站列表（不会删除磁盘文件）。 */
export function clearFileTransferItems(): void {
  commit(() => []);
}
