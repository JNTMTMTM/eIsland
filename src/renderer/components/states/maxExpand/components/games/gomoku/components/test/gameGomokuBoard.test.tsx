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
 * @file gameGomokuBoard.test.tsx
 * @description 五子棋边缘、棋子、高亮、缩放和结束状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { nodes, render, text, trigger, value } from '../../../../../test/componentHarness';
import { GOMOKU_SIZE } from '../../config/types';
import { createGomokuBoard } from '../../utils/board';
import { GameGomokuBoard } from '../GameGomokuBoard';

const cellLabel = (row: number, col: number): string => `${row}:${col}`;

describe('GameGomokuBoard', () => {
  it('渲染完整棋盘、四边和星位，并使用一基坐标朗读标签', () => {
    const tree = render(GameGomokuBoard, { board: createGomokuBoard(), winner: 0, scale: 1.5, boardAriaLabel: 'board', getCellAriaLabel: cellLabel, onCellClick: vi.fn(), onBoardWheel: vi.fn() });
    expect(nodes(tree, '.gomoku-cell')).toHaveLength(GOMOKU_SIZE * GOMOKU_SIZE);
    expect(nodes(tree, '.star')).toHaveLength(9);
    expect(value(tree, '.gomoku-cell', 'className', 0)).toContain('edge-top edge-left');
    expect(value(tree, '.gomoku-cell', 'className', GOMOKU_SIZE * GOMOKU_SIZE - 1)).toContain('edge-bottom');
    expect(value(tree, '.gomoku-cell', 'className', GOMOKU_SIZE * GOMOKU_SIZE - 1)).toContain('edge-right');
    expect(value(tree, '.gomoku-cell', 'aria-label', 0)).toBe('1:1');
    expect(value(tree, '.gomoku-board', 'style')).toEqual({ transform: 'scale(1.5)', transformOrigin: 'top left' });
    expect(value(tree, '.gomoku-board', 'role')).toBe('grid');
    expect(value(tree, '.gomoku-board', 'aria-label')).toBe('board');
  });

  it.each([1, 2])('高亮脉冲 %s 保留棋子颜色并禁用已落子格', (highlightPulse) => {
    const board = createGomokuBoard();
    board[0][0] = 1;
    board[0][1] = 2;
    const tree = render(GameGomokuBoard, { board, highlightPulse, highlightMove: [0, 1], winner: 0, scale: 1, boardAriaLabel: 'board', getCellAriaLabel: cellLabel, onCellClick: vi.fn(), onBoardWheel: vi.fn() });
    expect(value(tree, '.gomoku-cell', 'className', 0)).toContain('black');
    expect(value(tree, '.gomoku-cell', 'className', 1)).toContain(`white gomoku-last-move-highlight-${highlightPulse % 2}`);
    expect(value(tree, '.gomoku-cell', 'disabled', 0)).toBe(true);
    expect(value(tree, '.gomoku-cell', 'disabled', 2)).toBe(false);
  });

  it('空格点击传递零基坐标且滚轮转发原始事件', () => {
    const onCellClick = vi.fn();
    const onBoardWheel = vi.fn();
    const tree = render(GameGomokuBoard, { onCellClick, onBoardWheel, board: createGomokuBoard(), winner: 0, scale: 1, highlightMove: [0, 0], highlightPulse: 0, boardAriaLabel: 'board', getCellAriaLabel: cellLabel });
    const { props } = nodes(tree, '.gomoku-cell')[GOMOKU_SIZE + 2];
    const { onClick } = props;
    (onClick as () => void)();
    expect(onCellClick).toHaveBeenCalledWith(1, 2);
    const event = { deltaY: 10 };
    trigger(tree, '.gomoku-board-scroll', 'onWheel', event);
    expect(onBoardWheel).toHaveBeenCalledWith(event);
    expect(nodes(tree, '.gomoku-last-move-highlight-0')).toHaveLength(0);
    expect(nodes(tree, '.gomoku-result-overlay')).toHaveLength(0);
  });

  it.each([1, 2])('获胜方 %s 使所有格子禁用并提供重开操作', (winner) => {
    const onRestart = vi.fn();
    const tree = render(GameGomokuBoard, { onRestart, winner, board: createGomokuBoard(), scale: 1, resultOverlayText: 'winner', boardAriaLabel: 'board', getCellAriaLabel: cellLabel, onCellClick: vi.fn(), onBoardWheel: vi.fn() });
    expect(nodes(tree, '.gomoku-cell').every(({ props }) => props.disabled === true)).toBe(true);
    expect(text(tree)).toContain('winner');
    trigger(tree, '.settings-lyrics-source-btn', 'onClick');
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('平局遮罩可以独立于 winner 展示，空结果文本不展示', () => {
    const input = { board: createGomokuBoard(), winner: 0, scale: 1, boardAriaLabel: 'board', getCellAriaLabel: cellLabel, onCellClick: vi.fn(), onBoardWheel: vi.fn() };
    expect(nodes(render(GameGomokuBoard, { ...input, resultOverlayText: 'draw' }), '.gomoku-result-overlay')).toHaveLength(1);
    expect(nodes(render(GameGomokuBoard, { ...input, resultOverlayText: '' }), '.gomoku-result-overlay')).toHaveLength(0);
  });
});
