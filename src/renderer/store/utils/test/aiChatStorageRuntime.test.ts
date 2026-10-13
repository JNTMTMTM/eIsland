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
 * @file aiChatStorageRuntime.test.ts
 * @description 直接执行聊天存储源码，验证索引摘要、数据库生命周期、事务提交和迁移失败。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { aiChatStorage, toAiChatIndex } from '../aiChatStorage';
import type { AiChatIndex } from '../aiChatStorage';
import type { AiChatMessage, AiChatSession } from '../../types';

/**
 * 创建完整会话夹具，检查索引字段与正文的分离。
 * @param messages - 本次测试的会话消息。
 * @returns 已加载正文的会话。
 */
function session(messages: AiChatMessage[] = []): AiChatSession {
  return { messages, id: 'chat-a', title: 'Conversation', updatedAt: 123, messagesLoaded: true };
}

describe('chat index reply status', () => {
  it.each([
    { messages: [], status: 'idle' },
    { messages: [{ role: 'user', content: 'Question' }], status: 'idle' },
    { messages: [{ role: 'assistant', content: '   ' }], status: 'idle' },
    { messages: [{ role: 'assistant', content: '', finalized: true }], status: 'success' },
    { messages: [{ role: 'assistant', content: ' Answer ' }], status: 'success' },
    { messages: [{ role: 'assistant', content: '  ❌ Request failed', finalized: true }], status: 'failed' },
    { messages: [{ role: 'assistant', content: '❌ Earlier failure' }, { role: 'assistant', content: 'Recovered' }, { role: 'user', content: 'Next question' }], status: 'success' },
  ] satisfies { messages: AiChatMessage[]; status: AiChatIndex['replyStatus'] }[])('derives $status from $messages', ({ messages, status }) => {
    expect(toAiChatIndex(session(messages))).toEqual({ id: 'chat-a', title: 'Conversation', updatedAt: 123, replyStatus: status });
  });
});

/**
 * 提供可手动推进的 IndexedDB 事件边界，不模拟持久化或事务回滚算法。
 * @returns 数据库、事务、请求和对象存储的可控夹具。
 */
function databaseFixture() {
  const markerRequest = { result: undefined as unknown, onsuccess: null as (() => void) | null };
  const indexRequest = { result: [] as AiChatIndex[] };
  const bodyRequest = { result: undefined as AiChatMessage[] | undefined };
  const stores = {
    index: { put: vi.fn(), delete: vi.fn(), getAll: vi.fn(() => indexRequest) },
    messages: { put: vi.fn(), delete: vi.fn(), get: vi.fn(() => bodyRequest) },
    metadata: { put: vi.fn(), get: vi.fn(() => markerRequest) },
  };
  const transaction = {
    error: null as DOMException | null,
    oncomplete: null as (() => void) | null,
    onabort: null as (() => void) | null,
    onerror: null as (() => void) | null,
    abort: vi.fn(),
    objectStore: vi.fn((name: keyof typeof stores) => stores[name]),
  };
  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    transaction: vi.fn(() => transaction),
    onversionchange: null as (() => void) | null,
  };
  const request = {
    result: database,
    error: null as DOMException | null,
    onupgradeneeded: null as (() => void) | null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onblocked: null as (() => void) | null,
  };
  const open = vi.fn(() => request);
  return { markerRequest, indexRequest, bodyRequest, stores, transaction, database, request, open };
}

describe('chat database and transaction lifecycle', () => {
  let fixture: ReturnType<typeof databaseFixture>;

  beforeEach(() => {
    fixture = databaseFixture();
    vi.stubGlobal('indexedDB', { open: fixture.open });
  });

  afterEach(() => vi.unstubAllGlobals());

  /**
   * 发出打开成功事件，再等待异步代码创建事务。
   * @returns 事务事件已就绪。
   */
  async function connect(): Promise<void> {
    fixture.request.onsuccess?.();
    await Promise.resolve();
  }

  /**
   * 打开数据库并显式提交事务。
   * @param pending - 尚未完成的公开存储操作。
   * @returns 操作的已提交结果。
   */
  async function commit<T>(pending: Promise<T>): Promise<T> {
    await connect();
    fixture.transaction.oncomplete?.();
    return pending;
  }

  it('creates all stores during upgrade and releases the connection on version changes', async () => {
    const pending = aiChatStorage.list();
    expect(fixture.open).toHaveBeenCalledWith('eIsland-ai-chat', 1);
    fixture.request.onupgradeneeded?.();
    expect(fixture.database.createObjectStore.mock.calls).toEqual([
      ['index', { keyPath: 'id' }], ['messages'], ['metadata'],
    ]);
    await connect();
    fixture.database.onversionchange?.();
    expect(fixture.database.close).toHaveBeenCalledOnce();
    fixture.transaction.oncomplete?.();
    await expect(pending).resolves.toEqual([]);
  });

  it('rejects an open error without starting a transaction', async () => {
    const error = new DOMException('Database unavailable', 'UnknownError');
    fixture.request.error = error;
    const pending = aiChatStorage.list();
    fixture.request.onerror?.();
    await expect(pending).rejects.toBe(error);
    expect(fixture.database.transaction).not.toHaveBeenCalled();
  });

  it('rejects a blocked upgrade and closes a late successful connection', async () => {
    const pending = aiChatStorage.list();
    fixture.request.onblocked?.();
    await expect(pending).rejects.toThrow('Chat database upgrade is blocked');
    fixture.request.onsuccess?.();
    expect(fixture.database.close).toHaveBeenCalledOnce();
    expect(fixture.database.transaction).not.toHaveBeenCalled();
  });

  it('lists only indexes and waits for commit before reporting success', async () => {
    const index = toAiChatIndex(session());
    fixture.indexRequest.result = [index];
    const pending = aiChatStorage.list();
    const completed = vi.fn();
    const observe = async (): Promise<void> => { await pending; completed(); };
    const observation = observe();
    await connect();
    expect(fixture.database.transaction).toHaveBeenCalledWith(['index', 'messages', 'metadata'], 'readonly');
    expect(fixture.stores.index.getAll).toHaveBeenCalledOnce();
    expect(fixture.stores.messages.get).not.toHaveBeenCalled();
    fixture.transaction.onerror?.();
    await Promise.resolve();
    expect(completed).not.toHaveBeenCalled();
    expect(fixture.database.close).not.toHaveBeenCalled();
    fixture.transaction.oncomplete?.();
    await expect(pending).resolves.toEqual([index]);
    await observation;
    expect(completed).toHaveBeenCalledOnce();
    expect(fixture.database.close).toHaveBeenCalledOnce();
  });

  it.each([undefined, [{ role: 'user', content: 'Stored question' }] satisfies AiChatMessage[]])('reads one requested body: %j', async (messages) => {
    fixture.bodyRequest.result = messages;
    await expect(commit(aiChatStorage.read('chat-b'))).resolves.toEqual(messages);
    expect(fixture.stores.messages.get).toHaveBeenCalledWith('chat-b');
    expect(fixture.stores.index.getAll).not.toHaveBeenCalled();
  });

  it('saves index and body together without rewriting other sessions', async () => {
    const value = session([{ role: 'assistant', content: 'Saved answer' }]);
    await commit(aiChatStorage.save(value));
    expect(fixture.database.transaction).toHaveBeenCalledWith(['index', 'messages', 'metadata'], 'readwrite');
    expect(fixture.stores.index.put).toHaveBeenCalledWith(toAiChatIndex(value));
    expect(fixture.stores.messages.put).toHaveBeenCalledWith(value.messages, value.id);
    expect(fixture.stores.index.put).toHaveBeenCalledOnce();
    expect(fixture.stores.messages.put).toHaveBeenCalledOnce();
  });

  it('removes the same session index and body in one transaction', async () => {
    await commit(aiChatStorage.remove('chat-b'));
    expect(fixture.database.transaction).toHaveBeenCalledWith(['index', 'messages', 'metadata'], 'readwrite');
    expect(fixture.stores.index.delete).toHaveBeenCalledWith('chat-b');
    expect(fixture.stores.messages.delete).toHaveBeenCalledWith('chat-b');
    expect(fixture.database.close).toHaveBeenCalledOnce();
  });

  it.each([null, new DOMException('Write rejected', 'QuotaExceededError')])('rejects aborted transactions and releases the connection: %j', async (error) => {
    fixture.transaction.error = error;
    const pending = aiChatStorage.save(session());
    await connect();
    fixture.transaction.onabort?.();
    if (error) await expect(pending).rejects.toBe(error);
    else await expect(pending).rejects.toThrow('Chat transaction aborted');
    expect(fixture.database.close).toHaveBeenCalledOnce();
  });

  it('aborts and closes after a synchronous request failure', async () => {
    const error = new DOMException('Cannot clone body', 'DataCloneError');
    fixture.stores.messages.put.mockImplementation(() => { throw error; });
    const pending = aiChatStorage.save(session());
    await connect();
    await expect(pending).rejects.toBe(error);
    expect(fixture.transaction.abort).toHaveBeenCalledOnce();
    expect(fixture.database.close).toHaveBeenCalledOnce();
  });

  it('migrates the backup, indexes, bodies and marker in the same transaction', async () => {
    const first = session([{ role: 'user', content: 'First' }]);
    const second = { ...session(), id: 'chat-b' };
    const backup = { raw: 'Legacy data' };
    const legacyRead = vi.fn(() => [first, second]);
    const backupRead = vi.fn(() => backup);
    const pending = aiChatStorage.initialize(legacyRead, backupRead);
    await connect();
    expect(fixture.stores.metadata.get).toHaveBeenCalledWith('migrated');
    expect(legacyRead).not.toHaveBeenCalled();
    fixture.markerRequest.onsuccess?.();
    expect(fixture.stores.metadata.put.mock.calls).toEqual([[backup, 'legacyBackup'], [true, 'migrated']]);
    expect(fixture.stores.index.put.mock.calls).toEqual([[toAiChatIndex(first)], [toAiChatIndex(second)]]);
    expect(fixture.stores.messages.put.mock.calls).toEqual([[first.messages, first.id], [second.messages, second.id]]);
    fixture.transaction.oncomplete?.();
    await expect(pending).resolves.toBe(true);
  });

  it('skips legacy reads and writes when migration is already committed', async () => {
    fixture.markerRequest.result = true;
    const legacyRead = vi.fn();
    const backupRead = vi.fn();
    const pending = aiChatStorage.initialize(legacyRead, backupRead);
    await connect();
    fixture.markerRequest.onsuccess?.();
    fixture.transaction.oncomplete?.();
    await expect(pending).resolves.toBe(false);
    expect(legacyRead).not.toHaveBeenCalled();
    expect(backupRead).not.toHaveBeenCalled();
    expect(fixture.stores.metadata.put).not.toHaveBeenCalled();
  });

  it.each(['backup', 'legacy', 'body'] as const)('rejects migration when %s fails without publishing a success marker', async (stage) => {
    const error = new Error('Migration failed');
    const legacyRead = vi.fn(() => [session()]);
    const backupRead = vi.fn(() => 'Backup');
    if (stage === 'backup') backupRead.mockImplementation(() => { throw error; });
    if (stage === 'legacy') legacyRead.mockImplementation(() => { throw error; });
    if (stage === 'body') fixture.stores.messages.put.mockImplementation(() => { throw error; });
    const pending = aiChatStorage.initialize(legacyRead, backupRead);
    await connect();
    fixture.markerRequest.onsuccess?.();
    expect(fixture.transaction.abort).toHaveBeenCalledOnce();
    expect(fixture.stores.metadata.put).not.toHaveBeenCalledWith(true, 'migrated');
    fixture.transaction.onabort?.();
    await expect(pending).rejects.toThrow('Chat transaction aborted');
    expect(fixture.database.close).toHaveBeenCalledOnce();
  });
});
