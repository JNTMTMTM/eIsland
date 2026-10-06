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
 * @file game2048Board.test.tsx
 * @description 2048 棋盘布局、方块动画和游戏结束重开测试。
 * @author 鸡哥
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { nodes, render, trigger, value } from '../../../../../test/componentHarness';
import { BOARD, CELL, SIZE, SLIDE_MS } from '../../config/constants';
import { resolveTilePosition } from '../../utils/position';
import { Game2048Board } from '../Game2048Board';

describe('Game2048Board', () => {
  it('渲染完整空棋盘并保留聚焦和棋盘引用', () => {
    const boardRef = { current: null };
    const tree = render(Game2048Board, { boardRef, tiles: [], mergedIds: new Set<number>(), newId: null, over: false, onTryAgain: vi.fn() });
    expect(nodes(tree, '.g2048-cell-bg')).toHaveLength(SIZE * SIZE);
    expect(nodes(tree, '.g2048-tile')).toHaveLength(0);
    expect(nodes(tree, '.g2048-overlay')).toHaveLength(0);
    expect(value(tree, '.g2048-board', 'ref')).toBe(boardRef);
    expect(value(tree, '.g2048-board', 'tabIndex')).toBe(0);
    expect(value(tree, '.g2048-board', 'style')).toEqual({ width: BOARD, height: BOARD });
    expect(value(tree, '.g2048-cell-bg', 'style', SIZE * SIZE - 1)).toEqual({ ...resolveTilePosition(SIZE - 1, SIZE - 1), width: CELL, height: CELL, position: 'absolute' });
  });

  it('按位置渲染方块并分别标识合并、新生及超大数字', () => {
    const tiles = [{ id: 1, value: 4, row: 2, col: 1 }, { id: 2, value: 16384, row: 0, col: 3 }];
    const tree = render(Game2048Board, { tiles, boardRef: { current: null }, mergedIds: new Set([1]), newId: 2, over: false, onTryAgain: vi.fn() });
    expect(value(tree, '.g2048-tile', 'className', 0)).toBe('g2048-tile g2048-v4 g2048-pop');
    expect(value(tree, '.g2048-tile', 'className', 1)).toBe('g2048-tile g2048-v8192 g2048-appear');
    expect(value(tree, '.g2048-tile', 'children', 1)).toBe(16384);
    expect(value(tree, '.g2048-tile', 'style')).toEqual({ ...resolveTilePosition(2, 1), width: CELL, height: CELL, position: 'absolute', transition: `top ${SLIDE_MS}ms ease, left ${SLIDE_MS}ms ease` });
    expect(renderToStaticMarkup(tree)).toContain('16384');
  });

  it('结束时显示翻译提示并将重开事件交给调用方', () => {
    const onTryAgain = vi.fn();
    const tree = render(Game2048Board, { onTryAgain, boardRef: { current: null }, tiles: [], mergedIds: new Set<number>(), newId: null, over: true });
    expect(renderToStaticMarkup(tree)).toContain('miniGameTab.game2048.gameOver');
    trigger(tree, 'button', 'onClick');
    expect(onTryAgain).toHaveBeenCalledOnce();
  });
});
