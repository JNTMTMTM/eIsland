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
 * @file pendingQueueBoundaries.test.ts
 * @description 小游戏成绩待提交队列损坏存储、容量限制与并发刷新边界测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { requestMock, resolveClientVersionMock, readLocalTokenMock, randomUUIDMock } = vi.hoisted(() => {
  const requestMock = vi.fn();
  const resolveClientVersionMock = vi.fn();
  const readLocalTokenMock = vi.fn();
  const randomUUIDMock = vi.fn();
  return { requestMock, resolveClientVersionMock, readLocalTokenMock, randomUUIDMock };
});

vi.mock('../../user/userAccountApi.client', () => ({
  request: requestMock,
  resolveClientVersion: resolveClientVersionMock,
}));

vi.mock('../../../utils/userAccount', () => ({
  readLocalToken: readLocalTokenMock,
}));

const key = 'island_mini_game_pending_submissions';
const payload = { score: 1, durationMs: 0, moves: 0, achievedAt: 0 };
let store: Map<string, string>;
beforeEach(() => {
  vi.resetModules();
  requestMock.mockReset().mockResolvedValue({ ok: true, code: 200, data: null });
  resolveClientVersionMock.mockReset().mockResolvedValue('1.0');
  readLocalTokenMock.mockReset().mockReturnValue('token');
  randomUUIDMock.mockReset().mockReturnValue('new-id');
  vi.spyOn(crypto, 'randomUUID').mockImplementation(randomUUIDMock);
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => store.get(name) ?? null,
    setItem: (name: string, value: string) => { store.set(name, value); },
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('pending score queue boundaries', () => {
  it.each(['invalid json', '{}', 'null'])('treats non-array persisted value %s as an empty queue', async (raw) => {
    store.set(key, raw);
    const api = await import('../miniGameScoreApi');
    await api.flushPendingSubmissions();
    expect(requestMock).not.toHaveBeenCalled();
  });
  it('keeps only the latest fifty entries after enqueueing', async () => {
    readLocalTokenMock.mockReturnValue(null);
    store.set(key, JSON.stringify([...Array.from({ length: 50 }).keys()].map((index) => ({ payload, submitId: String(index), gameId: 'game', clientVersion: null, createdAt: Date.now() }))));
    const api = await import('../miniGameScoreApi');
    expect(await api.reportNewBest('game', payload)).toBe(false);
    const queue = JSON.parse(store.get(key)!) as Array<{ submitId: string; payload: typeof payload; clientVersion: string | null }>;
    expect(queue).toHaveLength(50);
    expect(queue[0].submitId).toBe('1');
    expect(queue[49]).toMatchObject({ payload, submitId: 'new-id', clientVersion: '1.0' });
  });
  it('ignores a concurrent flush until the active submission finishes', async () => {
    let complete!: (value: { ok: boolean; code: number }) => void;
    requestMock.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    store.set(key, JSON.stringify([{ payload, submitId: 'one', gameId: 'game', clientVersion: null, createdAt: Date.now() }]));
    const api = await import('../miniGameScoreApi');
    const active = api.flushPendingSubmissions();
    await api.flushPendingSubmissions();
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(store.get(key)!)).toHaveLength(1);
    complete({ ok: true, code: 200 });
    await active;
    expect(store.get(key)).toBe('[]');
    await api.flushPendingSubmissions();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});
