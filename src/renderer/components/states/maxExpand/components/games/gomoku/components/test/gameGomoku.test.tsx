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
 * @description 五子棋主组件的引擎配置、展示参数和重开句柄测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../../../test/componentHarness';
import { GameGomoku } from '../GameGomoku';
import { GameGomokuBoard } from '../GameGomokuBoard';
import type { ReactElement } from 'react';
import type { GameGomokuHandle, GameGomokuProps } from '../../config/types';
import type { useGameGomokuEngine } from '../../hooks/useGameGomokuEngine';

const engine = vi.hoisted(() => vi.fn<typeof useGameGomokuEngine>());
vi.mock('../../hooks/useGameGomokuEngine', () => ({ useGameGomokuEngine: engine }));

describe('GameGomoku component', () => {
  const state: ReturnType<typeof useGameGomokuEngine> = {
    board: [[0, 1, 2]], winner: 0, scale: 1.25, onCellClick: vi.fn(), onBoardWheel: vi.fn(), restart: vi.fn(),
  };
  const getCellAriaLabel = (row: number, col: number): string => `${row}:${col}`;

  beforeEach(() => { engine.mockReturnValue(state); });

  it('引擎只接收存储与难度配置，棋盘接收展示与交互参数', () => {
    const onStateChange = vi.fn();
    const highlightMove = [0, 1];
    const { type, props } = render(GameGomoku, { onStateChange, getCellAriaLabel, highlightMove, storageKey: 'test-key', aiDifficulty: 'hard', highlightPulse: 2, resultOverlayText: 'result', boardAriaLabel: 'board' }) as ReactElement<Parameters<typeof GameGomokuBoard>[0]>;
    expect(type).toBe(GameGomokuBoard);
    expect(engine).toHaveBeenCalledWith({ onStateChange, storageKey: 'test-key', aiDifficulty: 'hard' });
    expect(props).toEqual({ highlightMove, getCellAriaLabel, board: state.board, winner: 0, scale: 1.25, highlightPulse: 2, resultOverlayText: 'result', onRestart: state.restart, boardAriaLabel: 'board', onCellClick: state.onCellClick, onBoardWheel: state.onBoardWheel });
  });

  it('重开句柄暴露引擎函数，结束状态保持透传', () => {
    engine.mockReturnValue({ ...state, winner: 2 });
    const ref = { current: null as GameGomokuHandle | null };
    const { render: renderForwarded } = GameGomoku as unknown as { render: (props: GameGomokuProps, ref: { current: GameGomokuHandle | null }) => ReactElement<Parameters<typeof GameGomokuBoard>[0]> };
    const { props } = renderForwarded({ getCellAriaLabel, boardAriaLabel: 'board' }, ref);
    expect(ref.current).toEqual({ restart: state.restart });
    ref.current?.restart();
    expect(state.restart).toHaveBeenCalledOnce();
    expect(props.winner).toBe(2);
    expect(props.highlightMove).toBeUndefined();
    expect(props.resultOverlayText).toBeUndefined();
  });
});
