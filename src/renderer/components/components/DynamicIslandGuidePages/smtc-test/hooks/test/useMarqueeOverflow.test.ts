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
 * @file useMarqueeOverflow.test.ts
 * @description 跑马灯溢出 Hook 的挂载测量、内容更新、原生尺寸变化与卸载测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarqueeOverflow } from '../useMarqueeOverflow';
import { flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../hooks/test/startupHookHarness';
vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});
const observe = vi.fn();
const disconnect = vi.fn();
let resize!: () => void;
class ResizeLeaf {
  /** 记录原生尺寸回调，模拟真实尺寸改变。
   * @param callback - Hook 提供的测量回调
   */
  constructor(callback: () => void) { resize = callback; }

  observe = observe;

  disconnect = disconnect;
}
beforeEach(() => {
  resetHook();
  observe.mockReset();
  disconnect.mockReset();
  vi.stubGlobal('ResizeObserver', ResizeLeaf);
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

describe('marquee measurement lifecycle', () => {
  it.each([{ container: false, text: false }, { container: true, text: false }, { container: false, text: true }])('resets missing elements container=$container text=$text', ({ container, text }) => {
    const hook = renderHook(useMarqueeOverflow, 'Song');
    if (container) hook.containerRef.current = { clientWidth: 100 } as HTMLDivElement;
    if (text) hook.textRef.current = { scrollWidth: 200 } as HTMLSpanElement;
    flushHookEffects();
    expect(renderHook(useMarqueeOverflow, 'Song').distance).toBe(0);
    expect(observe).toHaveBeenCalledTimes(container ? 1 : 0);
  });
  it.each([{ width: 50, expected: 0 }, { width: 100, expected: 0 }, { width: 180, expected: 80 }])('measures text $width against the container', ({ width, expected }) => {
    const hook = renderHook(useMarqueeOverflow, 'Song');
    const container = { clientWidth: 100 } as HTMLDivElement;
    const text = { scrollWidth: width } as HTMLSpanElement;
    hook.containerRef.current = container;
    hook.textRef.current = text;
    flushHookEffects();
    expect(observe).toHaveBeenCalledWith(container);
    expect(renderHook(useMarqueeOverflow, 'Song').distance).toBe(expected);
    Object.defineProperty(text, 'scrollWidth', { value: 220 });
    resize();
    expect(renderHook(useMarqueeOverflow, 'Song').distance).toBe(120);
    hook.textRef.current = null;
    resize();
    expect(renderHook(useMarqueeOverflow, 'Song').distance).toBe(0);
  });
  it('disconnects and remeasures after content changes and on unmount', () => {
    const hook = renderHook(useMarqueeOverflow, 'Old');
    hook.containerRef.current = { clientWidth: 50 } as HTMLDivElement;
    hook.textRef.current = { scrollWidth: 150 } as HTMLSpanElement;
    flushHookEffects();
    renderHook(useMarqueeOverflow, 'New');
    flushHookEffects();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledTimes(2);
    expect(renderHook(useMarqueeOverflow, 'New').distance).toBe(100);
    unmountHook();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
