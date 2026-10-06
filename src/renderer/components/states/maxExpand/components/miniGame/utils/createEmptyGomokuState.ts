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
 * @file createEmptyGomokuState.ts
 * @description 创建独立的空五子棋状态快照。
 * @author 鸡哥
 */

import { GOMOKU_SIZE, type GameGomokuState } from '../../games/GameGomoku';

/**
 * 创建用于页面初始展示的五子棋状态。
 * @returns 棋盘数组互不共享的空状态。
 */
export function createEmptyGomokuState(): GameGomokuState {
  return {
    board: Array.from({ length: GOMOKU_SIZE }, () => Array.from({ length: GOMOKU_SIZE }, () => 0)),
    turn: 1,
    winner: 0,
    moves: 0,
    scale: 1,
    lastMove: null,
    aiThinking: false,
  };
}
