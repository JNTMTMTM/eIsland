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
 * @file useGame2048KeyboardRuntime.test.ts
 * @description 真实 2048 键盘监听、方向映射、焦点和 effect 清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, unmountHook } from './gameHookHarness';
import type { Dir } from '../../config/types';
const {
  useGame2048Keyboard
} = await import('../useGame2048Keyboard');
beforeEach(resetHook);
afterEach(unmountHook);
describe('2048 keyboard lifecycle', () => {
  it('does not register a listener before the board ref is mounted', () => {
    const move = vi.fn<(direction: Dir) => void>();
    renderHook(useGame2048Keyboard, {
      current: null
    }, move);
    flushHookEffects();
    expect(move).not.toHaveBeenCalled();
  });
  it.each([['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowDown', 'down'], ['a', 'left'], ['d', 'right'], ['w', 'up'], ['s', 'down']] as const)('maps key %s to %s and removes the exact listener on unmount', (key, direction) => {
    let handler: ((event: KeyboardEvent) => void) | undefined;
    const add = vi.fn<(name: string, listener: (event: KeyboardEvent) => void) => void>().mockImplementation((name, listener) => {
      void name;
      handler = listener;
    });
    const remove = vi.fn<(name: string, listener: (event: KeyboardEvent) => void) => void>();
    const focus = vi.fn<() => void>();
    const board = {
      focus,
      addEventListener: add,
      removeEventListener: remove
    } as unknown as HTMLDivElement;
    const move = vi.fn<(dir: Dir) => void>();
    const ref = {
      current: board
    };
    renderHook(useGame2048Keyboard, ref, move);
    flushHookEffects();
    const preventDefault = vi.fn<() => void>();
    handler?.({
      key,
      preventDefault
    } as unknown as KeyboardEvent);
    expect(move).toHaveBeenCalledWith(direction);
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(focus).toHaveBeenCalledOnce();
    unmountHook();
    expect(remove).toHaveBeenCalledWith('keydown', handler);
  });
  it('ignores other keys and replaces the listener when the move callback changes', () => {
    let handler: ((event: KeyboardEvent) => void) | undefined;
    const add = vi.fn<(name: string, listener: (event: KeyboardEvent) => void) => void>().mockImplementation((name, listener) => {
      void name;
      handler = listener;
    });
    const remove = vi.fn();
    const ref = {
      current: {
        addEventListener: add,
        removeEventListener: remove,
        focus: vi.fn()
      } as unknown as HTMLDivElement
    };
    const first = vi.fn<(dir: Dir) => void>();
    renderHook(useGame2048Keyboard, ref, first);
    flushHookEffects();
    const original = handler;
    const preventDefault = vi.fn();
    handler?.({
      preventDefault,
      key: 'Enter'
    } as unknown as KeyboardEvent);
    expect(first).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
    const second = vi.fn<(dir: Dir) => void>();
    renderHook(useGame2048Keyboard, ref, second);
    flushHookEffects();
    expect(remove).toHaveBeenCalledWith('keydown', original);
    handler?.({
      preventDefault,
      key: 'a'
    } as unknown as KeyboardEvent);
    expect(second).toHaveBeenCalledWith('left');
  });
});
