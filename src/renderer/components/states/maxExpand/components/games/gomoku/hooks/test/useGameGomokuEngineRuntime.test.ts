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
 * @file useGameGomokuEngineRuntime.test.ts
 * @description 真实五子棋 Hook、存档恢复、人机落子、胜负/满盘、缩放、音频降级及生命周期测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../2048/hooks/test/gameHookHarness';
import { createGomokuBoard } from '../../utils/board';
import { GOMOKU_SIZE } from '../../config/types';
import type { GameGomokuState } from '../../config/types';
import type { WheelEvent } from 'react';
const {
  useGameGomokuEngine
} = await import('../useGameGomokuEngine');
const io = {
  read: vi.fn<(key: string) => Promise<unknown>>(),
  write: vi.fn<(key: string, state: GameGomokuState) => Promise<boolean>>(),
  report: vi.fn<(state: GameGomokuState) => void>()
};
const audio = {
  instances: [] as TestAudio[],
  play: vi.fn<(source: string) => void>(),
  failures: 0,
  seekThrows: false
};
/** 模拟浏览器音频叶元素，不播放用户声音。 */
class TestAudio {
  preload = '';

  loop = false;

  src: string;

  /** 创建音频叶元素。
   * @param source - 音频资源路径
   */
  constructor(source: string) {
    this.src = source;
    audio.instances.push(this);
  }

  /** 模拟浏览器尚未允许 seek 的边界。
   * @param value - 播放时间
   */
  set currentTime(value: number) {
    void value;
    if (audio.seekThrows) throw new Error('not ready');
  }

  /** 返回真实 Promise 叶结果以验证重试和降级。
   * @returns 播放结果
   */
  play(): Promise<void> {
    audio.play(this.src);
    return audio.play.mock.calls.length <= audio.failures ? Promise.reject(new Error('blocked')) : Promise.resolve();
  }
}
let params: Parameters<typeof useGameGomokuEngine>[0];
/** 执行真实五子棋 Hook。
 * @returns 当前引擎结果
 */
function view() {
  return renderHook(useGameGomokuEngine, params);
}
/** 提交真实 Hook effect 和异步存储回调。
 * @returns 当前引擎结果
 */
async function commit() {
  view();
  flushHookEffects();
  await settleHook();
  view();
  flushHookEffects();
  await settleHook();
  return view();
}
/** 设置合法存档供真实归一化函数读取。
 * @param fields - 存档字段差异
 */
function saved(fields: Partial<GameGomokuState> = {}): void {
  params.storageKey = 'game';
  io.read.mockResolvedValue({
    board: createGomokuBoard(),
    turn: 1,
    winner: 0,
    moves: 0,
    scale: 1,
    lastMove: null,
    ...fields
  });
}
/** 制造无五连的满盘，仅保留最后一个空格。
 * @returns 用于实际落子的棋盘
 */
function drawBoard(): number[][] {
  const board: number[][] = Array.from({
    length: GOMOKU_SIZE
  }, (unusedRow, row) => {
    void unusedRow;
    return Array.from({
      length: GOMOKU_SIZE
    }, (unusedCell, col) => {
      void unusedCell;
      return (row + 2 * col) % 4 < 2 ? 1 : 2;
    });
  });
  board[14][14] = 0;
  return board;
}
beforeEach(() => {
  vi.useFakeTimers();
  resetHook();
  io.read.mockReset();
  io.read.mockResolvedValue(null);
  io.write.mockReset();
  io.write.mockResolvedValue(true);
  io.report.mockReset();
  audio.instances = [];
  audio.play.mockReset();
  audio.failures = 0;
  audio.seekThrows = false;
  params = {
    onStateChange: io.report
  };
  vi.stubGlobal('Audio', TestAudio);
  vi.stubGlobal('window', {
    api: {
      storeRead: io.read,
      storeWrite: io.write
    },
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  });
});
afterEach(() => {
  unmountHook();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('Gomoku hydration and lifecycle', () => {
  it('runs locally without storage or optional state callback', async () => {
    params = {};
    const game = await commit();
    expect(game.board).toHaveLength(15);
    expect(io.read).not.toHaveBeenCalled();
    game.onCellClick(7, 7);
    await commit();
    expect(view().board[7][7]).toBe(1);
    expect(io.report).not.toHaveBeenCalled();
  });
  it('loads a real normalized board, persists state and does not repeat identical snapshots', async () => {
    saved();
    await commit();
    expect(io.read).toHaveBeenCalledWith('game');
    expect(io.write).toHaveBeenCalledWith('game', {
      board: createGomokuBoard(),
      turn: 1,
      winner: 0,
      moves: 0,
      scale: 1,
      lastMove: null
    });
    expect(io.report).toHaveBeenCalledOnce();
    view().onCellClick(7, 7);
    await commit();
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      moves: 1,
      turn: 2,
      lastMove: [7, 7]
    }));
  });
  it('recovers invalid stored data and handles storage write rejection', async () => {
    params.storageKey = 'game';
    io.read.mockResolvedValue({
      board: 'invalid'
    });
    io.write.mockRejectedValue(new Error('offline'));
    await commit();
    expect(view().board).toEqual(createGomokuBoard());
    expect(io.write).toHaveBeenCalledOnce();
  });
  it('continues after a store read rejects and ignores resolved or rejected reads after unmount', async () => {
    params.storageKey = 'game';
    io.read.mockRejectedValue(new Error('offline'));
    await commit();
    expect(io.write).toHaveBeenCalledOnce();
    resetHook();
    const task = deferred<unknown>();
    io.read.mockReturnValue(task.promise);
    view();
    flushHookEffects();
    unmountHook();
    task.resolve({
      board: createGomokuBoard(),
      turn: 2,
      moves: 8
    });
    await settleHook();
    expect(io.write).toHaveBeenCalledOnce();
    resetHook();
    const rejected = deferred<unknown>();
    io.read.mockReturnValue(rejected.promise);
    view();
    flushHookEffects();
    unmountHook();
    rejected.reject(new Error('offline'));
    await settleHook();
    expect(io.write).toHaveBeenCalledOnce();
  });
  it('restores last move, turn, winner and zoom and clears round state on restart', async () => {
    const board = createGomokuBoard();
    board[7][7] = 2;
    saved({
      board,
      turn: 2,
      winner: 2,
      moves: 5,
      scale: 1.5,
      lastMove: [7, 7]
    });
    await commit();
    expect(view()).toMatchObject({
      winner: 2,
      scale: 1.5
    });
    expect(view().board[7][7]).toBe(2);
    view().restart();
    await commit();
    expect(view()).toMatchObject({
      winner: 0,
      scale: 1.5
    });
    expect(view().board).toEqual(createGomokuBoard());
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      turn: 1,
      moves: 0,
      lastMove: null,
      aiThinking: false
    }));
  });
});
describe('Gomoku human moves, sound and zoom', () => {
  it('alternates human pieces, rejects occupied and out-of-board positions and reuses the audio element', async () => {
    await commit();
    view().onCellClick(7, 7);
    await commit();
    view().onCellClick(7, 7);
    view().onCellClick(-1, 0);
    view().onCellClick(0, 15);
    expect(audio.play).toHaveBeenCalledOnce();
    view().onCellClick(7, 8);
    await commit();
    expect(view().board[7].slice(7, 9)).toEqual([1, 2]);
    expect(audio.instances).toHaveLength(1);
    expect(audio.instances[0]).toMatchObject({
      preload: 'auto',
      loop: false
    });
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      turn: 1,
      moves: 2
    }));
  });
  it.each([1, 2] as const)('detects a human player %s win and blocks later moves', async (piece) => {
    const board = createGomokuBoard();
    board[0].splice(0, 4, piece, piece, piece, piece);
    saved({
      board,
      turn: piece,
      moves: 4
    });
    await commit();
    view().onCellClick(0, 4);
    await commit();
    expect(view().winner).toBe(piece);
    const calls = audio.play.mock.calls.length;
    view().onCellClick(1, 1);
    expect(view().board[1][1]).toBe(0);
    expect(audio.play).toHaveBeenCalledTimes(calls);
  });
  it('stops turn progression at a real full-board draw', async () => {
    saved({
      board: drawBoard(),
      turn: 2,
      moves: 224
    });
    await commit();
    view().onCellClick(14, 14);
    await commit();
    expect(view().winner).toBe(0);
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      moves: 225,
      turn: 2
    }));
  });
  it('retries failed audio playback and tolerates both initial and retry seek failures', async () => {
    audio.failures = 2;
    audio.seekThrows = true;
    await commit();
    view().onCellClick(7, 7);
    await settleHook();
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.instances[0].src).toBe('../audio/GOMOKU.wav');
    await commit();
    expect(view().board[7][7]).toBe(1);
  });
  it('prevents page scrolling and clamps board zoom at both limits', async () => {
    await commit();
    const preventDefault = vi.fn();
    const event = (deltaY: number) => ({
      deltaY,
      preventDefault
    }) as unknown as WheelEvent<HTMLDivElement>;
    Array.from({
      length: 20
    }).forEach(() => {
      view().onBoardWheel(event(-1));
    });
    expect(view().scale).toBe(1.8);
    Array.from({
      length: 20
    }).forEach(() => {
      view().onBoardWheel(event(1));
    });
    expect(view().scale).toBe(1);
    expect(preventDefault).toHaveBeenCalledTimes(40);
  });
});
describe('Gomoku real AI scheduling and board decisions', () => {
  it('makes a real AI response, guards human input on the AI turn and returns control to the human', async () => {
    params.aiDifficulty = 'novice';
    await commit();
    view().onCellClick(7, 7);
    await commit();
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      aiThinking: true,
      turn: 2
    }));
    view().onCellClick(0, 0);
    expect(view().board[0][0]).toBe(0);
    await vi.advanceTimersByTimeAsync(180);
    await commit();
    expect(view().board.flat().filter((piece) => piece === 2)).toHaveLength(1);
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      turn: 1,
      moves: 2,
      aiThinking: false
    }));
  });
  it('uses the real AI winning move and stops after victory', async () => {
    const board = createGomokuBoard();
    board[0].splice(0, 4, 2, 2, 2, 2);
    saved({
      board,
      turn: 2,
      moves: 4
    });
    params.aiDifficulty = 'expert';
    await commit();
    await vi.advanceTimersByTimeAsync(180);
    await commit();
    expect(view().winner).toBe(2);
    expect(view().board[0][4]).toBe(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('finishes a real AI draw without switching turns', async () => {
    saved({
      board: drawBoard(),
      turn: 2,
      moves: 224
    });
    params.aiDifficulty = 'novice';
    await commit();
    await vi.advanceTimersByTimeAsync(180);
    await commit();
    expect(view().winner).toBe(0);
    expect(view().board[14][14]).toBe(2);
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      moves: 225,
      turn: 2,
      aiThinking: false
    }));
  });
  it('handles an externally saved full board with a stale move count and no AI candidate', async () => {
    const board = drawBoard();
    board[14][14] = 2;
    saved({
      board,
      turn: 2,
      moves: 5
    });
    params.aiDifficulty = 'novice';
    await commit();
    await vi.advanceTimersByTimeAsync(180);
    await commit();
    expect(view().board).toEqual(board);
    expect(io.report).toHaveBeenLastCalledWith(expect.objectContaining({
      aiThinking: false,
      moves: 5,
      turn: 2
    }));
  });
  it('does not schedule AI after an existing winner or maximum move count', async () => {
    params.aiDifficulty = 'novice';
    saved({
      winner: 1,
      turn: 2,
      moves: 4
    });
    await commit();
    expect(vi.getTimerCount()).toBe(0);
    resetHook();
    saved({
      winner: 0,
      turn: 2,
      moves: 225
    });
    await commit();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels AI timers when restarting, changing mode or unmounting', async () => {
    params.aiDifficulty = 'novice';
    await commit();
    view().onCellClick(7, 7);
    await commit();
    expect(vi.getTimerCount()).toBe(1);
    view().restart();
    await commit();
    expect(vi.getTimerCount()).toBe(0);
    view().onCellClick(7, 7);
    await commit();
    params.aiDifficulty = undefined;
    await commit();
    expect(vi.getTimerCount()).toBe(0);
    params.aiDifficulty = 'novice';
    await commit();
    expect(vi.getTimerCount()).toBe(1);
    const calls = io.report.mock.calls.length;
    unmountHook();
    await vi.advanceTimersByTimeAsync(180);
    expect(io.report).toHaveBeenCalledTimes(calls);
    expect(vi.getTimerCount()).toBe(0);
  });
});
