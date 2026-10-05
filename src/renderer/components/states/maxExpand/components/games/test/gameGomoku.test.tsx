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
 * @file gameGomoku.test.tsx
 * @description 验证五子棋门面保留组件和棋盘大小的导出契约。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { GameGomoku, GOMOKU_SIZE } from '../GameGomoku';
import { GameGomoku as Implementation } from '../gomoku/components/GameGomoku';
import { GOMOKU_SIZE as BOARD_SIZE } from '../gomoku/config/types';

describe('gomoku facade', () => {
  it('导出真实游戏组件及相同棋盘大小', () => {
    expect(GameGomoku).toBe(Implementation);
    expect(GOMOKU_SIZE).toBe(BOARD_SIZE);
    expect(GOMOKU_SIZE).toBe(15);
  });
});
