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
 * @file hooks.ts
 * @description 使用状态槽位在 Node 测试环境执行真实 React 组件的 Hook 测试工具。
 * @author 鸡哥
 */

export interface HookSlots { cursor: number; values: unknown[]; effects: Array<() => unknown>; }
/**
 * 以槽位保留状态，供 Node 中直接调用真实组件。
 * @param actual - React 实现。
 * @param slots - 组件 Hook 槽位。
 * @returns React Hook 替身。
 */
export function mockHooks(actual: typeof import('react'), slots: HookSlots) {
  const hookState = slots;
  const overrides = {
    useState: (initial: unknown) => {
      const index = hookState.cursor++;
      if (!(index in hookState.values)) hookState.values[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [hookState.values[index], (next: unknown) => { hookState.values[index] = typeof next === 'function' ? (next as (prev: unknown) => unknown)(hookState.values[index]) : next; }];
    },
    useRef: (initial: unknown) => ({ current: initial }),
    useMemo: (callback: () => unknown) => callback(),
    useCallback: (callback: unknown) => callback,
    useEffect: (callback: () => unknown) => { hookState.effects.push(callback); },
    useLayoutEffect: (callback: () => unknown) => { hookState.effects.push(callback); },
  };
  return { ...actual, ...overrides, default: { ...actual, ...overrides } };
}
