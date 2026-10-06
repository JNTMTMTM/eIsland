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
 * @file storage.test.ts
 * @description 五子棋存档棋盘结构、单元值、元数据默认值、缩放和最后落子边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { normalizeGomokuStoredState } from '../storage';

/**
 * 构造独立的15×15空棋盘。
 * @returns 可变棋盘数组，用于存档损坏与合法输入场景。
 */
function board(): number[][] {
  return Array.from({ length: 15 }, () => Array<number>(15).fill(0));
}

describe('gomoku storage normalization', () => {
  it.each([null, undefined, false, true, 1, 'board', [], {}, { board: [] }, { board: 'wrong' }, { board: Array(16).fill([]) }].map((raw) => ({ raw })))('拒绝非法存档/棋盘结构$raw', ({ raw }) => {
    expect(normalizeGomokuStoredState(raw)).toBeNull();
  });
  it.each([null, {}, Array<number>(14).fill(0), Array<number>(16).fill(0)].map((row) => ({ row })))('拒绝非法棋盘行$row', ({ row }) => {
    const cells: unknown[] = board();
    cells[3] = row;
    expect(normalizeGomokuStoredState({ board: cells })).toBeNull();
  });
  it.each([null, true, '1', -1, 3, 1.5])('拒绝非法单元%j', (cell) => {
    const cells: unknown[][] = board();
    cells[3][2] = cell;
    expect(normalizeGomokuStoredState({ board: cells })).toBeNull();
  });
  it('复制合法棋盘并默认全部元数据，不修改输入', () => {
    const cells = board();
    cells[0][0] = 1;
    cells[0][1] = 2;
    const normalized = normalizeGomokuStoredState({ board: cells });
    expect(normalized).toEqual({ board: cells, turn: 1, winner: 0, moves: 0, scale: 1, lastMove: null });
    expect(normalized?.board).not.toBe(cells);
    expect(normalized?.board[0]).not.toBe(cells[0]);
  });
  it.each([1, 2, 0, undefined])('标准化胜者%j和当前回合', (winner) => {
    const normalized = normalizeGomokuStoredState({ winner, board: board(), turn: 2 });
    expect(normalized?.turn).toBe(2);
    expect(normalized?.winner).toBe(winner === 1 || winner === 2 ? winner : 0);
  });
  it.each([[-10, 0], [0, 0], [42, 42], [226, 225], [1.5, 0], ['2', 0]])('落子数%j限制到整数%s', (moves, expected) => {
    expect(normalizeGomokuStoredState({ moves, board: board() })?.moves).toBe(expected);
  });
  it.each([[0, 1], [1.234, 1.23], [5, 1.8], [Infinity, 1.8], [-Infinity, 1], ['1.3', 1], [NaN, 1]])('缩放%j标准化到%s', (scale, expected) => {
    expect(normalizeGomokuStoredState({ scale, board: board() })?.scale).toBe(expected);
  });
  it.each([null, [], [1], [1, 1, 1], ['1', 2], [2, '1'], [1.5, 2], [2, 1.5], [-1, 0], [15, 0], [0, -1], [0, 15]].map((lastMove) => ({ lastMove })))('拒绝非法最后落子$lastMove', ({ lastMove }) => {
    expect(normalizeGomokuStoredState({ lastMove, board: board() })?.lastMove).toBeNull();
  });
  it.each([[0, 0], [14, 14], [7, 8]])('保留合法落子坐标%s,%s', (row, col) => {
    expect(normalizeGomokuStoredState({ board: board(), lastMove: [row, col] })?.lastMove).toEqual([row, col]);
  });
});
