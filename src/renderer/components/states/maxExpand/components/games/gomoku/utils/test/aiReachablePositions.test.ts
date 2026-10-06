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
 * @file aiReachablePositions.test.ts
 * @description 五子棋真实判胜与 AI 搜索在近满盘、延迟威胁和搜索期限下的公开局面测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { selectGomokuAIMove } from '../ai';
import { createGomokuBoard, isGomokuWin } from '../board';
import type { GomokuAIDifficulty } from '../../config/types';
/** 创建不存在五连的交错满盘，供移除合法空位形成残局。
 * @param empty - 未落子位置
 * @returns 实际棋盘
 */
function nearFull(empty: Array<[number, number]>): number[][] {
  const board = Array.from({
    length: 15
  }, (...[, r]) => Array.from({
    length: 15
  }, (...[, c]) => (r + Math.floor(c / 2)) % 2 + 1));
  empty.forEach(([r, c]) => {
    board[r][c] = 0;
  });
  return board;
}
/** 检查正常局面返回合法空位且搜索不改写输入棋盘。
 * @param board - 实际棋盘
 * @param difficulty - 用户可选难度
 * @param piece - 当前棋子
 */
function validMove(board: number[][], difficulty: GomokuAIDifficulty, piece: 1 | 2): void {
  const saved = board.map((row) => [...row]);
  const move = selectGomokuAIMove(board, difficulty, piece);
  expect(move).not.toBeNull();
  expect(board).toEqual(saved);
  expect(board[move![0]][move![1]]).toBe(0);
  expect(move![0]).toBeGreaterThanOrEqual(0);
  expect(move![1]).toBeGreaterThanOrEqual(0);
  expect(move![0]).toBeLessThan(15);
  expect(move![1]).toBeLessThan(15);
}
beforeEach(() => {
  let clock = 0;
  vi.spyOn(Date, 'now').mockImplementation(() => {
    clock += 0.25;
    return Math.floor(clock);
  });
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe('Gomoku public search with actual board rules', () => {
  it.each(['novice', 'easy', 'hard', 'expert', 'master'] as const)('%s fills the sole available draw cell and preserves the board', (difficulty) => {
    const board = nearFull([[7, 7]]);
    expect(board.some((row, r) => row.some((piece, c) => piece !== 0 && isGomokuWin(board, r, c, piece as 1 | 2)))).toBe(false);
    expect(selectGomokuAIMove(board, difficulty, 1)).toEqual([7, 7]);
    expect(board[7][7]).toBe(0);
  });
  it.each(['hard', 'expert', 'master'] as const)('%s resolves a two-cell draw search without mutating the input', (difficulty) => {
    validMove(nearFull([[7, 7], [7, 8]]), difficulty, 2);
  });
  it.each([1, 2] as const)('hard search explores intersecting delayed threats for piece %s', (piece) => {
    const board = createGomokuBoard();
    [[7, 5], [7, 6], [7, 8], [5, 7], [6, 7], [8, 7]].forEach(([r, c]) => {
      board[r][c] = piece;
    });
    [[3, 3], [3, 5], [3, 7], [4, 4], [4, 6], [4, 8]].forEach(([r, c]) => {
      board[r][c] = piece === 1 ? 2 : 1;
    });
    validMove(board, 'hard', piece);
  });
  it.each(['expert', 'master'] as const)('%s explores multi-move endgame threats with actual terminal wins', (difficulty) => {
    const board = nearFull([[7, 5], [7, 7], [6, 5], [6, 7], [8, 5], [8, 7]]);
    board[7][3] = 2;
    board[7][4] = 1;
    board[7][6] = 1;
    board[7][8] = 1;
    board[7][9] = 2;
    expect(board.some((row, r) => row.some((piece, c) => piece !== 0 && isGomokuWin(board, r, c, piece as 1 | 2)))).toBe(false);
    validMove(board, difficulty, 1);
  });
  it.each(['expert', 'master'] as const)('%s searches a crossing double-threat endgame with no initial immediate win', (difficulty) => {
    if (difficulty === 'expert') {
      let clock = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        clock += 0.02;
        return Math.floor(clock);
      });
    }
    const empty = Array.from({
      length: 7
    }, (...[, r]) => Array.from({
      length: 7
    }, (...[, c]) => [r + 4, c + 4] as [number, number])).flat();
    const board = nearFull(empty);
    [[7, 5], [7, 6], [7, 8], [5, 7], [6, 7], [8, 7]].forEach(([r, c]) => {
      board[r][c] = 1;
    });
    board[7][3] = 2;
    const winning = ([1, 2] as const).flatMap((piece) => empty.filter(([r, c]) => {
      if (board[r][c] !== 0) return false;
      board[r][c] = piece;
      const win = isGomokuWin(board, r, c, piece);
      board[r][c] = 0;
      return win;
    }).map((position) => ({
      piece,
      position
    })));
    expect(winning).toEqual([]);
    validMove(board, difficulty, 1);
  });
  it('master searches a future opponent terminal win while restoring the original endgame', () => {
    const empty = Array.from({
      length: 7
    }, (...[, r]) => Array.from({
      length: 7
    }, (...[, c]) => [r + 4, c + 4] as [number, number])).flat();
    const board = nearFull(empty);
    [[7, 5], [7, 6], [7, 8], [5, 7], [6, 7], [8, 7]].forEach(([r, c]) => {
      board[r][c] = 2;
    });
    validMove(board, 'master', 1);
  });
  it.each(['novice', 'easy', 'hard', 'expert', 'master'] as const)('%s chooses the center when no stones are placed and rejects a full legal draw board', (difficulty) => {
    expect(selectGomokuAIMove(createGomokuBoard(), difficulty, 1)).toEqual([7, 7]);
    expect(selectGomokuAIMove(nearFull([]), difficulty, 1)).toBeNull();
  });
  it.each(['novice', 'easy', 'hard', 'expert', 'master'] as const)('%s wins before blocking and uses actual board rules for both tactical positions', (difficulty) => {
    const own = createGomokuBoard();
    [3, 4, 5, 6].forEach((c) => {
      own[7][c] = 1;
    });
    [[1, 1], [2, 4], [5, 5], [8, 10]].forEach(([r, c]) => {
      own[r][c] = 2;
    });
    const win = selectGomokuAIMove(own, difficulty, 1)!;
    own[win[0]][win[1]] = 1;
    expect(isGomokuWin(own, win[0], win[1], 1)).toBe(true);
    const opponent = createGomokuBoard();
    [3, 4, 5, 6].forEach((c) => {
      opponent[7][c] = 2;
    });
    [[1, 1], [2, 4], [5, 5], [8, 10]].forEach(([r, c]) => {
      opponent[r][c] = 1;
    });
    const block = selectGomokuAIMove(opponent, difficulty, 1)!;
    opponent[block[0]][block[1]] = 2;
    expect(isGomokuWin(opponent, block[0], block[1], 2)).toBe(true);
  });
  it.each(['novice', 'easy', 'hard', 'expert', 'master'] as const)('%s chooses a legal move on a balanced ordinary midgame', (difficulty) => {
    const board = createGomokuBoard();
    board[7][7] = 1;
    board[7][8] = 2;
    board[8][7] = 1;
    board[6][8] = 2;
    validMove(board, difficulty, 1);
  });
  it('expert deadline reached before the first rollout returns a legal ranked candidate', () => {
    let clock = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      clock += 1000;
      return clock;
    });
    const board = createGomokuBoard();
    board[7][7] = 1;
    board[7][8] = 2;
    validMove(board, 'expert', 1);
  });
  it('hard resolves a three-cell draw at the depth-zero evaluation boundary', () => {
    validMove(nearFull([[7, 7], [7, 8], [8, 7]]), 'hard', 1);
  });
  it.each(['novice', 'easy'] as const)('%s supports the opposite AI piece with real balanced positions', (difficulty) => {
    const board = createGomokuBoard();
    board[7][7] = 1;
    board[7][8] = 2;
    board[8][7] = 1;
    board[6][8] = 2;
    validMove(board, difficulty, 2);
  });
});
