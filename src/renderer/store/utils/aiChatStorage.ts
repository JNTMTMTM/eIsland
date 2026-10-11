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
 * @file aiChatStorage.ts
 * @description 按会话异步保存聊天索引和正文；旧数据仅在首次打开聊天时事务迁移。
 * @author 鸡哥
 */

import type { AiChatSession } from '../types';

const DATABASE_NAME = 'eIsland-ai-chat';
const INDEX_STORE = 'index';
const BODY_STORE = 'messages';
const META_STORE = 'metadata';
export type AiChatIndex = Omit<AiChatSession, 'messages' | 'messagesLoaded'>;

/**
 * 提取无正文索引，避免浏览历史列表时复制全部消息。
 * @param session - 已加载的完整会话。
 * @returns 轻量会话索引。
 */
export function toAiChatIndex(session: AiChatSession): AiChatIndex {
  const last = session.messages.findLast((message) => message.role === 'assistant');
  const text = last?.content.trim() ?? '';
  return {
    id: session.id, title: session.title, updatedAt: session.updatedAt,
    replyStatus: text.startsWith('❌') ? 'failed' : last?.finalized || text ? 'success' : 'idle',
  };
}

/**
 * 打开聊天数据库；版本切换时主动释放连接，不阻塞迁移。
 * @returns 数据库连接。
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      database.createObjectStore(INDEX_STORE, { keyPath: 'id' });
      database.createObjectStore(BODY_STORE);
      database.createObjectStore(META_STORE);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Chat database upgrade is blocked')); };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

/**
 * 在单个事务中处理聊天数据，只有提交成功才报告完成。
 * @param mode - 事务读写模式。
 * @param execute - 同步提交请求并提供事务结束后的结果。
 * @returns 已提交的操作结果。
 */
async function transaction<T>(mode: IDBTransactionMode, execute: (tx: IDBTransaction) => () => T): Promise<T> {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction([INDEX_STORE, BODY_STORE, META_STORE], mode);
    let result: () => T;
    tx.oncomplete = () => { database.close(); resolve(result()); };
    tx.onabort = () => { database.close(); reject(tx.error ?? new Error('Chat transaction aborted')); };
    tx.onerror = () => { /* onabort 统一处理失败，旧存储不得提前清理。 */ };
    try { result = execute(tx); } catch (error) { tx.abort(); database.close(); reject(error); }
  });
}

export const aiChatStorage = {
  /**
   * 事务迁移旧历史，迁移标记和所有正文原子提交；已迁移时不再读取旧存储。
   * @param legacy - 仅在缺少迁移标记时读取旧历史的回调。
   * @param backup - 原始旧存储备份，与迁移标记一起提交。
   * @returns 是否成功完成本次迁移。
   */
  async initialize(legacy: () => AiChatSession[], backup: () => unknown): Promise<boolean> {
    return transaction('readwrite', (tx) => {
      let migrated = false;
      const marker = tx.objectStore(META_STORE).get('migrated');
      marker.onsuccess = () => {
        if (marker.result) return;
        try {
          tx.objectStore(META_STORE).put(backup(), 'legacyBackup');
          legacy().forEach((session) => {
            tx.objectStore(INDEX_STORE).put(toAiChatIndex(session));
            tx.objectStore(BODY_STORE).put(session.messages, session.id);
          });
          tx.objectStore(META_STORE).put(true, 'migrated');
          migrated = true;
        } catch { tx.abort(); }
      };
      return () => migrated;
    });
  },
  /** @returns 所有轻量会话索引，不读取正文。 */
  async list(): Promise<AiChatIndex[]> {
    return transaction('readonly', (tx) => {
      const request = tx.objectStore(INDEX_STORE).getAll();
      return () => request.result as AiChatIndex[];
    });
  },
  /**
   * 按需读取单个会话正文。
   * @param id - 会话标识。
   * @returns 正文；会话不存在时为 undefined。
   */
  async read(id: string): Promise<AiChatSession['messages'] | undefined> {
    return transaction('readonly', (tx) => {
      const request = tx.objectStore(BODY_STORE).get(id);
      return () => request.result as AiChatSession['messages'] | undefined;
    });
  },
  /**
   * 原子保存一份会话索引和正文，不重写其他会话。
   * @param session - 已加载正文的会话。
   */
  async save(session: AiChatSession): Promise<void> {
    await transaction('readwrite', (tx) => {
      tx.objectStore(INDEX_STORE).put(toAiChatIndex(session));
      tx.objectStore(BODY_STORE).put(session.messages, session.id);
      return () => undefined;
    });
  },
  /**
   * 原子删除索引和正文。
   * @param id - 会话标识。
   */
  async remove(id: string): Promise<void> {
    await transaction('readwrite', (tx) => {
      tx.objectStore(INDEX_STORE).delete(id);
      tx.objectStore(BODY_STORE).delete(id);
      return () => undefined;
    });
  },
};
