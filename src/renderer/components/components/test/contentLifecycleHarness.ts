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
 * @file contentLifecycleHarness.ts
 * @description 页面内容过渡测试私有生命周期工具，执行真实 effect、依赖更新和清理。
 * @author 鸡哥
 */

import { hookMocks, resetState, rewindState } from '../../test/elementHarness';
import type { DependencyList, EffectCallback } from 'react';
interface EffectSlot {
  dependencies?: DependencyList;
  callback: EffectCallback;
  cleanup?: () => void;
  pending: boolean;
}
const effects: EffectSlot[] = [];
const refs: {
  current: unknown;
}[] = [];
let effectCursor = 0;
let refCursor = 0;
let memoCursor = 0;
const memoValues: {
  dependencies?: DependencyList;
  value: unknown;
}[] = [];
export const lifecycleHooks = {
  /**
   * 在依赖稳定时复用真实组件的计算结果。
   * @param factory - 真实计算函数。
   * @param dependencies - React 依赖集合。
   * @returns 本轮计算值或上次稳定值。
   */
  useMemo<T>(factory: () => T, dependencies?: DependencyList): T {
    const index = memoCursor++;
    const previous = memoValues[index];
    if (!previous || !dependencies || !previous.dependencies || dependencies.length !== previous.dependencies.length || dependencies.some((value, dependency) => !Object.is(value, previous.dependencies?.[dependency]))) {
      memoValues[index] = {
        dependencies,
        value: factory()
      };
    }
    return memoValues[index].value as T;
  },
  /**
   * 保持依赖未变的实际组件回调身份。
   * @param callback - 真实组件回调。
   * @param dependencies - React 依赖集合。
   * @returns 原始回调或已缓存的回调。
   */
  useCallback<T>(callback: T, dependencies?: DependencyList): T {
    return lifecycleHooks.useMemo(() => callback, dependencies);
  },
  /**
   * 保存真实组件注册的 effect，并按依赖变化标记待执行。
   * @param callback - 真实 effect 回调。
   * @param dependencies - React 依赖集合；缺省时每次执行。
   * @returns 无返回值。
   */
  useEffect(this: void, callback: EffectCallback, dependencies?: DependencyList): void {
    const index = effectCursor++;
    const previous = effects[index];
    const pending = !previous || !dependencies || !previous.dependencies || dependencies.length !== previous.dependencies.length || dependencies.some((value, dependency) => !Object.is(value, previous.dependencies?.[dependency]));
    effects[index] = {
      dependencies,
      callback,
      cleanup: previous?.cleanup,
      pending: pending || Boolean(previous?.pending)
    };
  },
  /**
   * 保持同一组件重复求值时 ref 身份稳定。
   * @param current - 首次初始化 ref 的值。
   * @returns 可绑定实际元素的 ref。
   */
  useRef<T>(current: T): {
    current: T;
  } {
    const index = refCursor++;
    refs[index] ??= {
      current
    };
    return refs[index] as {
      current: T;
    };
  }
};
/**
 * 隔离一次测试的状态、ref 和生命周期。
 * @returns 无返回值。
 */
export function resetLifecycle(): void {
  resetState();
  effects.length = 0;
  refs.length = 0;
  memoValues.length = 0;
  effectCursor = 0;
  refCursor = 0;
  memoCursor = 0;
  hookMocks.useEffect.mockClear();
}
/**
 * 重新求值真实组件，保留 Hook 状态。
 * @param render - 真实组件调用。
 * @returns 组件实际返回值。
 */
export function renderWithHooks<T>(render: () => T): T {
  rewindState();
  effectCursor = 0;
  refCursor = 0;
  memoCursor = 0;
  return render();
}
/**
 * 在 ref 绑定完成后执行实际 effect 和依赖清理。
 * @returns 无返回值。
 */
export function runEffects(): void {
  effects.forEach((slot, index) => {
    if (!slot.pending) return;
    slot.cleanup?.();
    const cleanup = slot.callback();
    effects[index] = {
      ...slot,
      cleanup: typeof cleanup === 'function' ? cleanup : undefined,
      pending: false
    };
  });
}
/**
 * 执行组件已注册的卸载清理。
 * @returns 无返回值。
 */
export function unmountHooks(): void {
  effects.forEach((slot, index) => {
    slot.cleanup?.();
    effects[index] = {
      ...slot,
      cleanup: undefined
    };
  });
}
