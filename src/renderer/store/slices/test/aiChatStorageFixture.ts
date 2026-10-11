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
 * @file aiChatStorageFixture.ts
 * @description 聊天仓储的异步叶边界，保留真实切片的迁移和生命周期逻辑。
 * @author 鸡哥
 */
import { vi } from 'vitest';
import { aiChatStorage, toAiChatIndex } from '../../utils/aiChatStorage';
import type { AiChatSession } from '../../types';

/**
 * 安装可观察的异步仓储替身。
 * @returns 会话正文存储及请求探针。
 */
export function installAiChatStorage() {
  const records = new Map<string, AiChatSession>();
  let initialized = false;
  const initialize = vi.spyOn(aiChatStorage, 'initialize').mockImplementation(async (legacy) => {
    if (initialized) return false;
    legacy().forEach((session) => records.set(session.id, structuredClone(session)));
    initialized = true;
    return true;
  });
  const list = vi.spyOn(aiChatStorage, 'list').mockImplementation(async () => [...records.values()].map(toAiChatIndex));
  const read = vi.spyOn(aiChatStorage, 'read').mockImplementation(async (id) => structuredClone(records.get(id)?.messages));
  const save = vi.spyOn(aiChatStorage, 'save').mockImplementation(async (session) => { records.set(session.id, structuredClone(session)); });
  const remove = vi.spyOn(aiChatStorage, 'remove').mockImplementation(async (id) => { records.delete(id); });
  return { records, initialize, list, read, save, remove };
}
