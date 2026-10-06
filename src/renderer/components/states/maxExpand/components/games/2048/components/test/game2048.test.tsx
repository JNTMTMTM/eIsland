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
 * @file game2048.test.tsx
 * @description 2048 组件的引擎参数、键盘绑定、棋盘状态及控制句柄测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../../../../../test/componentHarness';
import { Game2048 } from '../Game2048';
import { Game2048Board } from '../Game2048Board';
import type { ReactElement } from 'react';
import type { Game2048Handle, Game2048Props } from '../../config/types';
import type { useGame2048Engine } from '../../hooks/useGame2048Engine';
import type { useGame2048Keyboard } from '../../hooks/useGame2048Keyboard';

const mocks = vi.hoisted(() => ({ engine: vi.fn<typeof useGame2048Engine>(), keyboard: vi.fn<typeof useGame2048Keyboard>() }));
vi.mock('../../hooks/useGame2048Engine', () => ({ useGame2048Engine: mocks.engine }));
vi.mock('../../hooks/useGame2048Keyboard', () => ({ useGame2048Keyboard: mocks.keyboard }));

describe('Game2048 component', () => {
  const state: ReturnType<typeof useGame2048Engine> = {
    boardRef: { current: null }, tiles: [{ id: 1, value: 2, row: 0, col: 0 }], over: false,
    mergedIds: new Set([1]), newId: 1, newGame: vi.fn(), doMove: vi.fn(),
  };

  beforeEach(() => { mocks.engine.mockReturnValue(state); });

  it('透传会话与回调，棋盘和键盘共享引擎引用', () => {
    const activeSession = { sessionId: 's1', seed: 7, startedAt: 10 };
    const onGameEnd = vi.fn();
    const onStateChange = vi.fn();
    const tree = render(Game2048, { activeSession, onGameEnd, onStateChange }) as ReactElement<Parameters<typeof Game2048Board>[0]>;
    const { type, props } = tree;
    expect(type).toBe(Game2048Board);
    expect(mocks.engine).toHaveBeenCalledWith({ activeSession, onGameEnd, onStateChange });
    expect(mocks.keyboard).toHaveBeenCalledWith(state.boardRef, state.doMove);
    expect(props).toMatchObject({ boardRef: state.boardRef, tiles: state.tiles, over: false, mergedIds: state.mergedIds, newId: 1 });
    props.onTryAgain();
    expect(state.newGame).toHaveBeenCalledWith();
  });

  it('控制句柄调用同一引擎重开函数并保留指定会话', () => {
    const ref = { current: null as Game2048Handle | null };
    const { render: renderForwarded } = Game2048 as unknown as { render: (props: Game2048Props, ref: { current: Game2048Handle | null }) => ReactElement };
    renderForwarded({ activeSession: null }, ref);
    expect(ref.current).toEqual({ newGame: state.newGame });
    const session = { sessionId: 's2', seed: 3, startedAt: 20 };
    ref.current?.newGame(session);
    expect(state.newGame).toHaveBeenCalledWith(session);
  });

  it('无可选回调且游戏结束时仍透传空棋盘状态', () => {
    mocks.engine.mockReturnValue({ ...state, tiles: [], over: true, mergedIds: new Set<number>(), newId: null });
    const { props } = render(Game2048) as ReactElement<Parameters<typeof Game2048Board>[0]>;
    expect(mocks.engine).toHaveBeenCalledWith({ activeSession: undefined, onGameEnd: undefined, onStateChange: undefined });
    expect(props.tiles).toEqual([]);
    expect(props.over).toBe(true);
    expect(props.newId).toBeNull();
  });
});
