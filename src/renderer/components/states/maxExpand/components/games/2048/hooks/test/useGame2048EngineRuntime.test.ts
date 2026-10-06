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
 * @file useGame2048EngineRuntime.test.ts
 * @description 真实 2048 引擎、棋盘算法、存档恢复、确定性回合、动画锁和游戏结束回调测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SLIDE_MS, STORAGE_KEY } from '../../config/constants';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './gameHookHarness';
import type { Game2048Props, Game2048Session, SavedState, TileData, Dir } from '../../config/types';
const {
  useGame2048Engine
} = await import('../useGame2048Engine');
const values = new Map<string, string>();
const get = vi.fn<(key: string) => string | null>();
const set = vi.fn<(key: string, value: string) => void>();
const remove = vi.fn<(key: string) => void>();
const onState = vi.fn<NonNullable<Game2048Props['onStateChange']>>();
const onEnd = vi.fn<NonNullable<Game2048Props['onGameEnd']>>();
let props: Game2048Props;
/** 保存真实外部缓存，再由真实 createInitial/loadState 读取。
 * @param tiles - 缓存棋盘
 * @param fields - 缓存元数据
 */
function saved(tiles: TileData[], fields: Partial<SavedState> = {}): void {
  values.set(STORAGE_KEY, JSON.stringify({
    tiles,
    score: 0,
    best: 0,
    moveCount: 0,
    startTime: 0,
    tileSeq: 30,
    moveTrace: '',
    randomState: 1,
    ...fields
  }));
}
/** 执行真实游戏 Hook。
 * @returns 当前引擎结果
 */
function view() {
  return renderHook(useGame2048Engine, props);
}
/** 提交真实 Hook effect。
 * @returns 当前引擎结果
 */
function mount() {
  view();
  flushHookEffects();
  return view();
}
/** 执行真实移动并完成两段动画。
 * @param direction - 移动方向
 */
async function move(direction: Dir): Promise<void> {
  view().doMove(direction);
  await vi.advanceTimersByTimeAsync(SLIDE_MS);
  view();
  flushHookEffects();
  await vi.advanceTimersByTimeAsync(150);
  view();
}
/** 创建仅缺一个格子的不可合并棋盘。
 * @returns 棋盘方块
 */
function lastBoard(): TileData[] {
  return Array.from({
    length: 16
  }, (unused, index) => {
    void unused;
    return {
      id: index + 1,
      value: 2 ** (index + 1),
      row: Math.floor(index / 4),
      col: index % 4
    };
  }).slice(1);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10000);
  resetHook();
  values.clear();
  get.mockReset();
  get.mockImplementation((key) => values.get(key) ?? null);
  set.mockReset();
  set.mockImplementation((key, value) => {
    values.set(key, value);
  });
  remove.mockReset();
  remove.mockImplementation((key) => {
    values.delete(key);
  });
  vi.stubGlobal('localStorage', {
    getItem: get,
    setItem: set,
    removeItem: remove
  });
  onState.mockReset();
  onEnd.mockReset();
  props = {
    onStateChange: onState,
    onGameEnd: onEnd
  };
});
afterEach(() => {
  unmountHook();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('2048 real engine lifecycle and movement', () => {
  it('starts two deterministic tiles and ignores a direction that cannot move', () => {
    saved([{
      id: 1,
      value: 2,
      row: 0,
      col: 0
    }]);
    const game = mount();
    game.doMove('left');
    expect(vi.getTimerCount()).toBe(0);
    expect(game.tiles).toHaveLength(1);
    expect(onState).not.toHaveBeenCalled();
  });
  it('restores initial score and moves, resolves merges with unrelated tiles and clears animation locks', async () => {
    saved([{
      id: 1,
      value: 2,
      row: 0,
      col: 1
    }, {
      id: 2,
      value: 2,
      row: 0,
      col: 2
    }, {
      id: 3,
      value: 8,
      row: 1,
      col: 0
    }], {
      score: 10,
      best: 12,
      moveCount: 3
    });
    mount();
    expect(onState).toHaveBeenCalledWith({
      score: 10,
      best: 12,
      over: false,
      moveCount: 3
    });
    view().doMove('left');
    view().doMove('right');
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(SLIDE_MS);
    const game = view();
    expect(game.tiles.find((tile) => tile.id === 1)?.value).toBe(4);
    expect(game.tiles.some((tile) => tile.id === 2)).toBe(false);
    expect(game.tiles.find((tile) => tile.id === 3)?.value).toBe(8);
    expect(game.mergedIds.has(1)).toBe(true);
    expect(game.newId).toBe(30);
    expect(onState).toHaveBeenLastCalledWith({
      score: 14,
      best: 14,
      over: false,
      moveCount: 4
    });
    expect(JSON.parse(values.get(STORAGE_KEY) || '{}')).toMatchObject({
      score: 14,
      best: 14,
      moveCount: 4,
      moveTrace: 'L',
      startTime: 10000
    });
    await vi.advanceTimersByTimeAsync(150);
    expect(view().mergedIds.size).toBe(0);
    expect(view().newId).toBeNull();
    view().doMove('right');
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each(['left', 'right', 'up', 'down'] as const)('records a real %s move in its replay trace and keeps the existing best', async (direction) => {
    saved([{
      id: 1,
      value: 2,
      row: 1,
      col: 1
    }], {
      best: 100,
      startTime: 9000
    });
    mount();
    await move(direction);
    const snapshot = JSON.parse(values.get(STORAGE_KEY) || '{}') as SavedState;
    expect(snapshot.moveTrace).toBe({
      left: 'L',
      right: 'R',
      up: 'U',
      down: 'D'
    }[direction]);
    expect(snapshot.best).toBe(100);
    expect(snapshot.startTime).toBe(9000);
    expect(snapshot.moveCount).toBe(1);
  });
  it('starts and reuses session seeds, ignores the same applied session and focuses the board', () => {
    const session: Game2048Session = {
      sessionId: 'one',
      seed: 5,
      startedAt: 8000
    };
    props.activeSession = session;
    const game = mount();
    const first = game.tiles.map((tile) => ({
      value: tile.value,
      row: tile.row,
      col: tile.col
    }));
    const focus = vi.fn<() => void>();
    game.boardRef.current = {
      focus
    } as unknown as HTMLDivElement;
    props.activeSession = {
      ...session
    };
    mount();
    expect(remove).toHaveBeenCalledOnce();
    view().newGame(null);
    expect(view().tiles.map((tile) => ({
      value: tile.value,
      row: tile.row,
      col: tile.col
    }))).toEqual(first);
    expect(focus).toHaveBeenCalledOnce();
    const other: Game2048Session = {
      sessionId: 'two',
      seed: 19,
      startedAt: 9000
    };
    view().newGame(other);
    expect(view().tiles).toHaveLength(2);
    props.activeSession = other;
    mount();
    expect(remove).toHaveBeenCalledTimes(4);
  });
  it('starts a local round with clock seed and can omit state callbacks', () => {
    props = {};
    const game = mount();
    expect(game.tiles).toHaveLength(2);
    game.newGame();
    expect(view().over).toBe(false);
    expect(remove).toHaveBeenCalledWith(STORAGE_KEY);
  });
  it.each([{
    startTime: 9000,
    expectedDuration: 1000 + SLIDE_MS,
    withSession: true
  }, {
    startTime: -1,
    expectedDuration: 1,
    withSession: false
  }, {
    startTime: 20000,
    expectedDuration: 1,
    withSession: false
  }])('ends a real full board with timestamp $startTime and callback metadata', async ({
    startTime,
    expectedDuration,
    withSession
  }) => {
    saved(lastBoard(), {
      startTime,
      score: 8,
      best: 100,
      moveCount: 10,
      moveTrace: 'R'
    });
    if (withSession) {
      props.activeSession = { sessionId: '', seed: 1, startedAt: 9000 };
    }
    mount();
    await move('left');
    expect(view().over).toBe(true);
    expect(onEnd).toHaveBeenCalledWith({
      score: 8,
      durationMs: expectedDuration,
      moves: 11,
      achievedAt: 10000 + SLIDE_MS,
      sessionId: withSession ? '' : undefined,
      moveTrace: 'RL'
    });
    expect(values.has(STORAGE_KEY)).toBe(false);
    view().doMove('up');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('finishes without optional callbacks and handles a persisted board with no spawn space', async () => {
    props = {};
    saved(lastBoard(), {
      score: 4,
      best: 10
    });
    mount();
    await move('left');
    expect(view().over).toBe(true);
    resetHook();
    saved([...Array.from({
      length: 16
    }, (unused, index) => {
      void unused;
      return {
        id: index + 1,
        value: 2 ** (index + 1),
        row: Math.floor(index / 4),
        col: index % 4
      };
    }), {
      id: 17,
      value: 2 ** 18,
      row: 0,
      col: 5
    }]);
    mount();
    await move('left');
    expect(view().newId).toBeNull();
    expect(view().over).toBe(false);
    const persisted = JSON.parse(values.get(STORAGE_KEY) || '{}') as SavedState;
    expect(persisted.tiles).toContainEqual({ id: 17, value: 2 ** 18, row: 0, col: 4 });
  });
});
