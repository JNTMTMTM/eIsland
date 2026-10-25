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
 * @file aiChatPersistence.test.ts
 * @description 聊天索引迁移、按需正文、异步切换与失败重试回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { createAiSlice } from '../aiSlice';
import type { AiSlice, AiChatMessage } from '../../types';
import { installAiChatStorage } from './aiChatStorageFixture';
import installStorage from './sliceStorageFixture';

let storage: ReturnType<typeof installStorage>;
let database: ReturnType<typeof installAiChatStorage>;
const legacyKey = 'eIsland_aiChatSessions';
const messages = (content: string): AiChatMessage[] => [{ role: 'user', content }];
const makeStore = () => createStore<AiSlice>()(createAiSlice);
beforeEach(() => {
  storage = installStorage();
  Object.assign(storage.storage, { removeItem: (key: string) => storage.values.delete(key) });
  database = installAiChatStorage();
  storage.values.set(legacyKey, JSON.stringify(['a', 'b', 'c'].map((id) => ({ id, title: id, updatedAt: 1, messages: messages(id) }))));
  storage.values.set('eIsland_aiActiveChatSessionId', 'a');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('asynchronous chat persistence', () => {
  it('does not open the database or read legacy bodies at renderer startup', () => {
    const api = makeStore();
    expect(api.getState().aiChatSessions).toEqual([]);
    expect(database.initialize).not.toHaveBeenCalled();
    expect(storage.get.mock.calls.flat()).not.toContain(legacyKey);
  });
  it('migrates once, reads only the selected body and releases all inactive bodies', async () => {
    const api = makeStore();
    await Promise.all([api.getState().ensureAiChatReady(), api.getState().ensureAiChatReady()]);
    expect(database.initialize).toHaveBeenCalledOnce();
    expect(database.records.size).toBe(3);
    expect(storage.values.has(legacyKey)).toBe(false);
    expect(database.read.mock.calls).toEqual([['a']]);
    expect(api.getState().aiChatSessions.map((item) => item.messages.length)).toEqual([1, 0, 0]);
    await api.getState().switchAiChatSession('b');
    expect(api.getState().aiChatMessages).toEqual(messages('b'));
    expect(api.getState().aiChatSessions[0].messagesLoaded).toBe(false);
    api.getState().releaseAiChatBodies();
    expect(api.getState().aiChatMessages).toEqual([]);
    await api.getState().ensureAiChatReady();
    expect(api.getState().aiChatMessages).toEqual(messages('b'));
  });
  it('keeps the legacy recovery source when the migration transaction fails', async () => {
    database.initialize.mockRejectedValueOnce(new Error('quota'));
    const api = makeStore();
    await expect(api.getState().ensureAiChatReady()).rejects.toThrow('quota');
    expect(storage.values.has(legacyKey)).toBe(true);
    expect(api.getState().aiChatStorageError).toBe(true);
    await api.getState().ensureAiChatReady();
    expect(api.getState().aiChatReady).toBe(true);
  });
  it('ignores late body reads after another session is selected', async () => {
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    let resolveB!: (value: AiChatMessage[]) => void;
    database.read.mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    const b = api.getState().switchAiChatSession('b');
    await api.getState().switchAiChatSession('c');
    resolveB(messages('late b'));
    await b;
    expect(api.getState().activeAiChatSessionId).toBe('c');
    expect(api.getState().aiChatMessages).toEqual(messages('c'));
  });
  it('holds the previously shown messages while a released body is read and clears the hold once the switch settles', async () => {
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    expect(api.getState().aiChatSwitchingView).toBeNull();
    let resolveB!: (value: AiChatMessage[]) => void;
    database.read.mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    const b = api.getState().switchAiChatSession('b');
    expect(api.getState()).toMatchObject({ activeAiChatSessionId: 'b', aiChatMessages: [], aiChatLoading: true,
      aiChatSwitchingView: { sessionId: 'a', messages: messages('a') } });
    const c = api.getState().switchAiChatSession('c');
    expect(api.getState().aiChatSwitchingView).toEqual({ sessionId: 'a', messages: messages('a') });
    resolveB(messages('b'));
    await Promise.all([b, c]);
    expect(api.getState()).toMatchObject({ activeAiChatSessionId: 'c', aiChatMessages: messages('c'), aiChatLoading: false, aiChatSwitchingView: null });
  });
  it('holds nothing on the first load or after the shown body was released, and drops the hold when a read fails', async () => {
    const api = makeStore();
    const deferRead = (): ((value: AiChatMessage[]) => void) => {
      let resolve!: (value: AiChatMessage[]) => void;
      database.read.mockImplementationOnce(() => new Promise((settle) => { resolve = settle; }));
      return (value) => resolve(value);
    };
    let resolveRead = deferRead();
    const firstLoad = api.getState().ensureAiChatReady();
    await vi.waitFor(() => expect(database.read).toHaveBeenCalledTimes(1));
    expect(api.getState()).toMatchObject({ aiChatLoading: true, aiChatSwitchingView: null });
    resolveRead(messages('a'));
    await firstLoad;
    api.getState().releaseAiChatBodies();
    resolveRead = deferRead();
    const reentry = api.getState().ensureAiChatReady();
    await vi.waitFor(() => expect(database.read).toHaveBeenCalledTimes(2));
    expect(api.getState()).toMatchObject({ aiChatLoading: true, aiChatSwitchingView: null });
    resolveRead(messages('a'));
    await reentry;
    database.read.mockRejectedValueOnce(new Error('read failed'));
    const failing = api.getState().switchAiChatSession('b');
    expect(api.getState().aiChatSwitchingView).toEqual({ sessionId: 'a', messages: messages('a') });
    await expect(failing).rejects.toThrow('read failed');
    expect(api.getState()).toMatchObject({ aiChatLoading: false, aiChatStorageError: true, aiChatSwitchingView: null });
  });
  it('never holds a deleted session view while the replacement body is read', async () => {
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    let resolveB!: (value: AiChatMessage[]) => void;
    database.read.mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve; }));
    const deletingActive = api.getState().deleteAiChatSession('a');
    await vi.waitFor(() => expect(api.getState().activeAiChatSessionId).toBe('b'));
    expect(api.getState()).toMatchObject({ aiChatLoading: true, aiChatSwitchingView: null });
    resolveB(messages('b'));
    await deletingActive;
    let resolveC!: (value: AiChatMessage[]) => void;
    database.read.mockImplementationOnce(() => new Promise((resolve) => { resolveC = resolve; }));
    const switching = api.getState().switchAiChatSession('c');
    expect(api.getState().aiChatSwitchingView).toEqual({ sessionId: 'b', messages: messages('b') });
    await api.getState().deleteAiChatSession('b');
    expect(api.getState()).toMatchObject({ activeAiChatSessionId: 'c', aiChatLoading: true, aiChatSwitchingView: null });
    resolveC(messages('c'));
    await switching;
    expect(api.getState()).toMatchObject({ aiChatMessages: messages('c'), aiChatLoading: false, aiChatSwitchingView: null });
  });
  it('never persists an index placeholder as an empty conversation', async () => {
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    database.save.mockClear();
    api.getState().setAiChatSessionMessages('b', []);
    await api.getState().flushAiChatStorage();
    expect(database.save).not.toHaveBeenCalled();
    expect(database.records.get('b')?.messages).toEqual(messages('b'));
  });
  it('pins running bodies while switching and preserves failed writes for retry', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    await api.getState().switchAiChatSession('b');
    database.save.mockRejectedValueOnce(new Error('disk failure'));
    api.getState().setAiChatSessionMessages('a', messages('unsaved'));
    await expect(api.getState().flushAiChatStorage()).rejects.toThrow('disk failure');
    api.getState().retainAiChatSession('a', false);
    expect(api.getState().aiChatSessions[0].messages).toEqual(messages('unsaved'));
    await api.getState().flushAiChatStorage();
    expect(database.records.get('a')?.messages).toEqual(messages('unsaved'));
    expect(api.getState().aiChatSessions[0].messagesLoaded).toBe(false);
  });
  it('serializes competing snapshots and does not lose the last update', async () => {
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    let finish!: () => void;
    database.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    api.getState().setAiChatMessages(messages('first'));
    api.getState().setAiChatMessages(messages('second'));
    finish();
    await api.getState().flushAiChatStorage();
    expect(database.records.get('a')?.messages).toEqual(messages('second'));
    expect(database.save).toHaveBeenCalledTimes(2);
  });
  it('keeps a shared session pinned until every independent generation owner releases it', async () => {
    vi.useFakeTimers();
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    api.getState().retainAiChatSession('a', true);
    await api.getState().switchAiChatSession('b');
    api.getState().retainAiChatSession('a', false);
    api.getState().setAiChatSessionMessages('a', messages('still generating'));
    expect(api.getState().aiChatSessions.find((item) => item.id === 'a')?.messagesLoaded).toBe(true);
    expect(database.save).not.toHaveBeenCalled();
    api.getState().retainAiChatSession('a', false);
    await api.getState().flushAiChatStorage();
    expect(database.records.get('a')?.messages).toEqual(messages('still generating'));
    expect(api.getState().aiChatSessions.find((item) => item.id === 'a')?.messagesLoaded).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('checkpoints each generating session once per second independently of the selected session', async () => {
    vi.useFakeTimers();
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    await api.getState().switchAiChatSession('b');
    api.getState().retainAiChatSession('b', true);
    database.save.mockClear();
    for (let chunk = 0; chunk < 100; chunk += 1) {
      api.getState().setAiChatSessionMessages('a', messages(`a-${chunk}`));
      api.getState().setAiChatSessionMessages('b', messages(`b-${chunk}`));
      await vi.advanceTimersByTimeAsync(5);
    }
    expect(database.save).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(500);
    expect(database.save).toHaveBeenCalledTimes(2);
    expect(database.records.get('a')?.messages).toEqual(messages('a-99'));
    expect(database.records.get('b')?.messages).toEqual(messages('b-99'));
    api.getState().setAiChatSessionMessages('a', messages('a-final'));
    api.getState().setAiChatSessionMessages('b', messages('b-pending'));
    api.getState().markAiChatSessionReplyFinished('a');
    api.getState().retainAiChatSession('a', false);
    await Promise.resolve();
    expect(database.records.get('a')?.messages).toEqual(messages('a-final'));
    expect(vi.getTimerCount()).toBe(1);
    api.getState().retainAiChatSession('b', false);
    await api.getState().flushAiChatStorage();
    expect(database.records.get('b')?.messages).toEqual(messages('b-pending'));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('defers chunks arriving during a checkpoint and forces the final pending snapshot on cancel', async () => {
    vi.useFakeTimers();
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    api.getState().setAiChatMessages(messages('first'));
    let finish!: () => void;
    database.save.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    await vi.advanceTimersByTimeAsync(1000);
    api.getState().setAiChatMessages(messages('second'));
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(database.save).toHaveBeenCalledTimes(1);
    api.getState().retainAiChatSession('a', false);
    await api.getState().flushAiChatStorage();
    expect(database.save).toHaveBeenCalledTimes(2);
    expect(database.records.get('a')?.messages).toEqual(messages('second'));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('recovers the final dirty body when the exit transaction was interrupted', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    api.getState().setAiChatMessages(messages('exit tail'));
    database.save.mockRejectedValueOnce(new Error('exit interrupted'));
    storage.listen.mock.calls.find(([name]) => name === 'beforeunload')?.[1]({key: null});
    expect(JSON.parse(storage.values.get('eIsland_aiChatRecovery')!)).toMatchObject([{id: 'a', messages: messages('exit tail')}]);
    await Promise.resolve();
    await Promise.resolve();
    const restarted = makeStore();
    await restarted.getState().ensureAiChatReady();
    expect(restarted.getState().aiChatMessages).toEqual(messages('exit tail'));
    expect(storage.values.has('eIsland_aiChatRecovery')).toBe(false);
  });
  it('does not clear a newer recovery snapshot when an older in-flight write commits', async () => {
    vi.useFakeTimers();
    const api = makeStore();
    await api.getState().ensureAiChatReady();
    api.getState().retainAiChatSession('a', true);
    let first!: () => void;
    let second!: () => void;
    database.save.mockImplementationOnce(() => new Promise<void>((resolve) => { first = resolve; }))
      .mockImplementationOnce(() => new Promise<void>((resolve) => { second = resolve; }));
    api.getState().setAiChatMessages(messages('old'));
    await vi.advanceTimersByTimeAsync(1000);
    api.getState().setAiChatMessages(messages('new'));
    storage.listen.mock.calls.find(([name]) => name === 'pagehide')?.[1]({key: null});
    first();
    await vi.advanceTimersByTimeAsync(0);
    expect(storage.values.has('eIsland_aiChatRecovery')).toBe(true);
    second();
    await api.getState().flushAiChatStorage();
    expect(storage.values.has('eIsland_aiChatRecovery')).toBe(false);
  });

});
