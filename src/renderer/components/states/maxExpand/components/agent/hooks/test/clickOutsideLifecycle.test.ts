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
 * @file clickOutsideLifecycle.test.ts
 * @description 真实外部点击 Hook 的内部元素排除、启停和监听移除测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
let hook: typeof import('../useClickOutside').useClickOutside;
let documentLeaf: EventTarget;
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  documentLeaf = new EventTarget();
  vi.stubGlobal('document', documentLeaf);
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  ({
    useClickOutside: hook
  } = await import('../useClickOutside'));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('click outside native event lifecycle', () => {
  it('inside click is ignored, missing and outside refs trigger once, and disable removes listener', () => {
    const contains = vi.fn<(target: Node) => boolean>().mockReturnValue(true);
    const refs = [{
      current: {
        contains
      } as unknown as HTMLElement
    }, {
      current: null
    }];
    const outside = vi.fn();
    const remove = vi.spyOn(documentLeaf, 'removeEventListener');
    renderHook(() => hook(refs, outside, true));
    flushHookEffects();
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(contains).toHaveBeenCalledOnce();
    expect(outside).not.toHaveBeenCalled();
    contains.mockReturnValue(false);
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(outside).toHaveBeenCalledOnce();
    renderHook(() => hook(refs, outside, false));
    flushHookEffects();
    expect(remove).toHaveBeenCalledWith('mousedown', expect.any(Function));
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(outside).toHaveBeenCalledOnce();
  });
  it('unmount clears the actual registered callback', () => {
    const outside = vi.fn();
    const remove = vi.spyOn(documentLeaf, 'removeEventListener');
    renderHook(() => hook([], outside, true));
    flushHookEffects();
    unmountHook();
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(outside).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
  });
});
