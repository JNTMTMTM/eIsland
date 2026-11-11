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
import { mergeFileTransferPaths, parseFileTransferItems } from './utils/fileTransferUtils';
import type { FileTransferItem } from './types/fileTransfer';

/** 中转文件列表的持久化存储键 */
export const FILE_TRANSFER_STORE_KEY = 'file-transfer-items';

interface FileTransferState {
  items: FileTransferItem[];
}

/** 基于最新已保存列表计算新列表的变更 */
type FileTransferUpdate = (items: FileTransferItem[]) => FileTransferItem[];

/** 多个窗口同时写入时比较快照的最大重试次数 */
const MAX_SWAP_ATTEMPTS = 5;

export const useFileTransferStore = create<FileTransferState>(() => ({ items: [] }));

/** 最近一次成功读取或写入的已保存列表 */
let persisted: FileTransferItem[] = [];
/** 串行执行读写，使后发起的变更总是基于先前变更的结果 */
let queue: Promise<void> = Promise.resolve();
/** 排队中的读写数量；归零时界面与已保存列表对齐 */
let pending = 0;

/**
 * 读取最新已保存列表并以比较快照方式写入变更；其他窗口抢先写入时基于其结果重算。
 * @param update - 待应用的变更，省略时只读取。
 * @param attempt - 当前尝试次数。
 * @returns 读写完成的 Promise；读取或写入失败时拒绝，且不会写入基于失败读取的数据。
 */
async function sync(update: FileTransferUpdate | undefined, attempt = 1): Promise<void> {
  const raw = await window.api.storeRead(FILE_TRANSFER_STORE_KEY, true);
  const saved = parseFileTransferItems(raw);
  if (!update) {
    persisted = saved;
    return;
  }
  const next = update(saved);
  const result = await window.api.storeCompareAndSwap(FILE_TRANSFER_STORE_KEY, raw, next);
  if (result === 'conflict' && attempt < MAX_SWAP_ATTEMPTS) {
    await sync(update, attempt + 1);
    return;
  }
  if (result !== 'updated') throw new Error(`File transfer save ${result}`);
  persisted = next;
}

/**
 * 等待先前的读写后执行本次读写；队列清空后界面回到实际保存的列表，失败的变更随之撤回。
 * @param previous - 先前排队的读写。
 * @param update - 待应用的变更，省略时只刷新。
 * @returns 本次读写结束的 Promise，始终兑现。
 */
async function drain(previous: Promise<void>, update?: FileTransferUpdate): Promise<void> {
  await previous;
  try {
    await sync(update);
  } catch (error) {
    console.error('[fileTransfer] sync failed:', error);
  } finally {
    pending -= 1;
    if (pending === 0) useFileTransferStore.setState({ items: persisted });
  }
}

/**
 * 将一次读写加入串行队列。
 * @param update - 待应用的变更，省略时只刷新。
 */
function enqueue(update?: FileTransferUpdate): void {
  pending += 1;
  queue = drain(queue, update);
}

/**
 * 立即在界面应用变更，并排队写入持久化存储。
 * @param update - 待应用的变更。
 */
function commit(update: FileTransferUpdate): void {
  useFileTransferStore.setState(({ items }) => ({ items: update(items) }));
  enqueue(update);
}

/**
 * 从持久化存储刷新中转文件列表；在排队中的变更完成后执行。
 * @returns 刷新结束的 Promise，始终兑现。
 */
export function loadFileTransferItems(): Promise<void> {
  enqueue();
  return queue;
}

/**
 * 将拖入的文件路径加入中转站。
 * @param paths - 本机绝对路径列表。
 * @returns 无返回值。
 */
export function addFileTransferPaths(paths: string[]): void {
  if (paths.length === 0) return;
  commit((items) => mergeFileTransferPaths(items, paths, Date.now()));
}

/**
 * 从中转站移除指定文件（不会删除磁盘文件）。
 * @param path - 待移除文件的本机路径。
 * @returns 无返回值。
 */
export function removeFileTransferItem(path: string): void {
  commit((items) => items.filter((item) => item.path !== path));
}

/**
 * 清空中转站列表（不会删除磁盘文件）。
 * @returns 无返回值。
 */
export function clearFileTransferItems(): void {
  commit(() => []);
}
