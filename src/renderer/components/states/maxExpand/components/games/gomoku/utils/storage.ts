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
 * @file storage.ts
 * @description 五子棋本地存档校验工具。
 * @author 鸡哥
 */

import type { GameGomokuState } from '../config/types';
import { GOMOKU_SIZE } from '../config/types';

/**
 * 标准化并校验五子棋存档状态。
 */
export function normalizeGomokuStoredState(raw: unknown): GameGomokuState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const candidate = raw as Partial<GameGomokuState>;
  if (!Array.isArray(candidate.board) || candidate.board.length !== GOMOKU_SIZE) {
    return null;
  }
  const board = candidate.board.map((row) => {
    if (!Array.isArray(row) || row.length !== GOMOKU_SIZE) {
      return null;
    }
    const normalizedRow = row.map((cell) => {
      if (cell === 1 || cell === 2) return cell;
      if (cell === 0) return 0;
      return null;
    });
    if (normalizedRow.some((cell) => cell === null)) {
      return null;
    }
    return normalizedRow as number[];
  });
  if (board.some((row) => row === null)) {
    return null;
  }

  const turn = candidate.turn === 2 ? 2 : 1;
  const winner = candidate.winner === 1 || candidate.winner === 2 ? candidate.winner : 0;
  const moves = Number.isInteger(candidate.moves)
    ? Math.min(GOMOKU_SIZE * GOMOKU_SIZE, Math.max(0, Number(candidate.moves)))
    : 0;
  const scaleRaw = typeof candidate.scale === 'number' && !Number.isNaN(candidate.scale) ? candidate.scale : 1;
  const scale = Math.min(1.8, Math.max(1, Number(scaleRaw.toFixed(2))));
  const rawLastMove = candidate.lastMove;
  const lastMove = Array.isArray(rawLastMove)
    && rawLastMove.length === 2
    && Number.isInteger(rawLastMove[0])
    && Number.isInteger(rawLastMove[1])
    && Number(rawLastMove[0]) >= 0
    && Number(rawLastMove[0]) < GOMOKU_SIZE
    && Number(rawLastMove[1]) >= 0
    && Number(rawLastMove[1]) < GOMOKU_SIZE
    ? [Number(rawLastMove[0]), Number(rawLastMove[1])] as [number, number]
    : null;

  return {
    board: board as number[][],
    turn,
    winner,
    moves,
    scale,
    lastMove,
  };
}
