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
 * @file useStorage.ts
 * @description 本地存储测试的读取、刷新、删除、键名选择与详情翻看
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';
import { useMemo, useState } from 'react';

import { FALLBACK_ROWS } from '../config/uiConfig';
import {
  jsonLines, moveCursor, outputRows, pickerWindowStart, storageLayout,
} from '../utils/uiUtils';
import { deleteStoreEntry, loadStoreSnapshot, resolveStoreDir } from '../../core/storage';

import type { StorageNotice, StorageViewProps, UseStorageReturn } from '../types/uiTypes';

/**
 * 管理本地存储测试
 * @description 进入时读取一次，按 R 重新读取；↑↓ 选择键名，PgUp/PgDn 翻看详情，D 删除选中项（需按 Y 确认），Esc 或 Ctrl+C 返回
 * @param props - 本地存储测试入参
 * @param props.onBack - 返回本机测试列表回调
 * @returns 终端尺寸、存储目录、读取结果、可见键名与详情行
 */
export default function useStorage({ onBack }: StorageViewProps): UseStorageReturn {
  const { columns, rows: windowRows } = useWindowSize();
  const rows = windowRows || FALLBACK_ROWS;
  const dir = useMemo(() => resolveStoreDir(), []);
  const [snapshot, setSnapshot] = useState(() => loadStoreSnapshot(dir));
  const [cursor, setCursor] = useState(0);
  const [offset, setOffset] = useState(0);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<StorageNotice | null>(null);

  const { listRows, detailRows } = storageLayout(rows);
  const { entries } = snapshot;
  const index = Math.min(cursor, Math.max(entries.length - 1, 0));
  const activeEntry = entries.at(index);
  const allLines = useMemo(() => (activeEntry && !activeEntry.error ? jsonLines(activeEntry.value) : []), [activeEntry]);
  const maxOffset = Math.max(0, allLines.length - detailRows);
  const start = pickerWindowStart(index, entries.length, listRows);

  /**
   * 切换光标并回到详情开头
   * @param delta - 移动量
   */
  const select = (delta: number): void => {
    setCursor(moveCursor(index, entries.length, delta));
    setOffset(0);
  };

  /**
   * 删除等待确认的存储项并重新读取
   * @param target - 存储键名
   */
  const remove = (target: string): void => {
    try {
      deleteStoreEntry(dir, target);
      setNotice({ kind: 'deleted', key: target, error: '' });
    } catch (error) {
      setNotice({ kind: 'failed', key: target, error: error instanceof Error ? error.message : String(error) });
    }
    setSnapshot(loadStoreSnapshot(dir));
    setOffset(0);
  };

  useInput((input, key) => {
    // 确认删除时只有 Y 执行，其余任何键（含 Esc）都视为取消，避免误删。
    if (pendingKey !== null) {
      setPendingKey(null);
      if (input.toLowerCase() === 'y' && !key.ctrl) remove(pendingKey);
      return;
    }
    setNotice(null);
    if (key.upArrow) {
      select(-1);
    } else if (key.downArrow) {
      select(1);
    } else if (key.pageUp) {
      setOffset(Math.max(0, offset - detailRows));
    } else if (key.pageDown) {
      setOffset(Math.min(maxOffset, offset + detailRows));
    } else if (input.toLowerCase() === 'r' && !key.ctrl) {
      setSnapshot(loadStoreSnapshot(dir));
      setOffset(0);
    } else if (input.toLowerCase() === 'd' && !key.ctrl && activeEntry) {
      setPendingKey(activeEntry.key);
    } else if (key.escape || (key.ctrl && input === 'c')) {
      onBack();
    }
  });

  const shown = Math.min(offset, maxOffset);
  return {
    columns,
    rows,
    dir,
    snapshot,
    activeEntry,
    pendingKey,
    notice,
    visible: entries.slice(start, start + listRows),
    lines: outputRows(allLines, shown, detailRows),
    remaining: Math.max(0, allLines.length - shown - detailRows),
  };
}
