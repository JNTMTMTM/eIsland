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
 * @file useCountdownForm.ts
 * @description 新建与编辑共用草稿，保存成功后才关闭编辑器。
 * @author 鸡哥
 */

import { useState } from 'react';
import { defaultRules, toLocalDateStr } from '../utils/countdownUtils';
import type { CountdownDraft, CountdownItem } from '../types/countdownTypes';

function newDraft(): CountdownDraft {
  return { name: '', date: toLocalDateStr(new Date()), color: '#69c0ff', type: 'countdown',
    ...defaultRules('countdown'), backgroundOpacity: 0.35 };
}

/**
 * 管理可取消的事件草稿。
 * @param updateItems - 持久化更新方法
 * @returns 草稿、编辑器状态及操作
 */
export function useCountdownForm(updateItems: (update: (items: CountdownItem[]) => CountdownItem[]) => Promise<boolean>) {
  const [draft, setDraft] = useState<CountdownDraft>(newDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const startNew = (): void => { setDraft(newDraft()); setEditingId(null); setOpen(true); };
  const startEdit = (item: CountdownItem): void => { setDraft({ ...item }); setEditingId(item.id); setOpen(true); };
  const save = async (): Promise<void> => {
    if (!draft.name.trim() || !draft.date) return;
    const item = { ...draft, name: draft.name.trim(), id: editingId ?? Date.now() + Math.random() };
    const saved = await updateItems((items) => editingId === null ? [...items, item]
      : items.map((existing) => existing.id === editingId ? item : existing));
    if (saved) setOpen(false);
  };
  return { draft, setDraft, editingId, open, setOpen, startNew, startEdit, save };
}
