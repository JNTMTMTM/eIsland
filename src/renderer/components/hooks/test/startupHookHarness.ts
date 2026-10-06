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
 * @file startupHookHarness.ts
 * @description 启动公告 Hook 私有生命周期工具，保留真实回调、状态与布局，仅模拟 React 生命周期。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import type { EffectCallback } from 'react';
interface EffectRecord {
  dependencies?: readonly unknown[];
  effect: EffectCallback;
  cleanup?: () => void;
  pending: boolean;
}
interface MemoRecord {
  value: unknown;
  dependencies?: readonly unknown[];
}
const languageData = vi.hoisted(() => ({
  current: 'zh-CN'
}));
export const language = languageData;
const translation = vi.hoisted(() => ({
  t: vi.fn<(key: string, options?: Record<string, unknown>) => string>((key) => key)
}));
export const translationProbe = translation.t;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translation.t,
    i18n: {
      language: languageData.current
    }
  })
}));
const runtime = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  values: [] as unknown[],
  setters: [] as ((value: unknown) => void)[],
  effects: [] as EffectRecord[]
}));
/** 判断实际 Hook 的依赖是否一致。
 * @param previous - 上次依赖
 * @param next - 本次依赖
 * @returns 两组依赖均存在且逐项一致
 */
function same(previous: readonly unknown[] | undefined, next: readonly unknown[] | undefined): boolean {
  return Boolean(previous && next && previous.length === next.length && previous.every((value, index) => Object.is(value, next[index])));
}
/** 记录待提交的生命周期。
 * @param effect - 生命周期
 * @param dependencies - 依赖
 */
function recordEffect(effect: EffectCallback, dependencies?: readonly unknown[]): void {
  const index = runtime.effectCursor++;
  const previous = runtime.effects[index];
  runtime.effects[index] = {
    effect,
    dependencies,
    cleanup: previous?.cleanup,
    pending: previous?.pending || !previous || !same(previous.dependencies, dependencies)
  };
}
/** 为每个测试文件重新注册同一私有 Hook 生命周期，避免 Vitest 模块缓存跳过 mock 注册。
 * @param actual - 实际 React 导出
 * @returns 保留实际元素 API 的 Hook 模块
 */
export function createHookReactMock(actual: typeof import('react')): Record<string, unknown> {
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = runtime.cursor++;
      if (!(index in runtime.values)) runtime.values[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      if (!(index in runtime.setters)) {
        runtime.setters[index] = (value: unknown) => {
          runtime.values[index] = typeof value === 'function' ? (value as (previous: unknown) => unknown)(runtime.values[index]) : value;
        };
      }
      return [runtime.values[index], runtime.setters[index]];
    },
    useRef: (initial: unknown) => {
      const index = runtime.cursor++;
      if (!(index in runtime.values)) {
        runtime.values[index] = {
          current: initial
        };
      }
      return runtime.values[index];
    },
    useCallback: (callback: unknown, dependencies?: readonly unknown[]) => {
      const index = runtime.cursor++;
      const previous = runtime.values[index] as MemoRecord | undefined;
      if (!previous || !same(previous.dependencies, dependencies)) {
        runtime.values[index] = {
          dependencies,
          value: callback
        };
      }
      return (runtime.values[index] as MemoRecord).value;
    },
    useMemo: (factory: () => unknown, dependencies?: readonly unknown[]) => {
      const index = runtime.cursor++;
      const previous = runtime.values[index] as MemoRecord | undefined;
      if (!previous || !same(previous.dependencies, dependencies)) {
        runtime.values[index] = {
          dependencies,
          value: factory()
        };
      }
      return (runtime.values[index] as MemoRecord).value;
    },
    useLayoutEffect: (effect: EffectCallback, dependencies?: readonly unknown[]) => recordEffect(effect, dependencies),
    useEffect: (effect: EffectCallback, dependencies?: readonly unknown[]) => recordEffect(effect, dependencies)
  };
}
vi.mock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
/** 清除一个 Hook 实例的状态。 */
export function resetHook(): void {
  runtime.cursor = 0;
  runtime.effectCursor = 0;
  runtime.values = [];
  runtime.setters = [];
  runtime.effects = [];
}
/** 执行真实 Hook 并保留实例。
 * @param hook - 被测真实 Hook
 * @param args - 参数
 * @returns Hook 的真实结果
 */
export function renderHook<Args extends unknown[], Result>(hook: (...args: Args) => Result, ...args: Args): Result {
  runtime.cursor = 0;
  runtime.effectCursor = 0;
  return hook(...args);
}
/** 执行待提交 effect 及依赖变化清理。 */
export function flushHookEffects(): void {
  runtime.effects.forEach((record, index) => {
    if (!record.pending) return;
    record.cleanup?.();
    const cleanup = record.effect();
    runtime.effects[index] = {
      ...record,
      pending: false,
      cleanup: typeof cleanup === 'function' ? cleanup : undefined
    };
  });
}
/** 执行卸载清理。 */
export function unmountHook(): void {
  runtime.effects.forEach((record) => record.cleanup?.());
  runtime.effects = [];
}
/** 等待真实 Promise 叶回调完成。 */
export async function settleHook(): Promise<void> {
  await Array.from({
    length: 40
  }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}
/** 创建显式完成的异步叶请求。
 * @returns 请求和完成函数
 */
export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return {
    promise,
    resolve,
    reject
  };
}
