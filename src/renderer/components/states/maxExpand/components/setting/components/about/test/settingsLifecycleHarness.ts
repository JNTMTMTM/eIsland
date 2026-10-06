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
 * @file settingsLifecycleHarness.ts
 * @description 设置组件的局部 Hook 生命周期工具：保留状态、依赖与清理，不执行布局或模拟业务逻辑。
 * @author 鸡哥
 */

import { Children, isValidElement, type EffectCallback, type ReactElement, type ReactNode } from 'react';
import { vi } from 'vitest';
interface EffectRecord {
  dependencies?: readonly unknown[];
  effect: EffectCallback;
  cleanup?: () => void;
  pending: boolean;
}
const runtime = vi.hoisted(() => ({
  cursor: 0,
  effectCursor: 0,
  values: [] as unknown[],
  effects: [] as EffectRecord[]
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  useState: (initial: unknown) => {
    const index = runtime.cursor++;
    if (!(index in runtime.values)) runtime.values[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    return [runtime.values[index], (next: unknown) => {
      runtime.values[index] = typeof next === 'function' ? (next as (previous: unknown) => unknown)(runtime.values[index]) : next;
    }];
  },
  useRef: (initial: unknown) => {
    const index = runtime.cursor++;
    if (!(index in runtime.values)) {runtime.values[index] = {
      current: initial
    };}
    return runtime.values[index];
  },
  useMemo: (factory: () => unknown) => factory(),
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: EffectCallback, dependencies?: readonly unknown[]) => {
    const index = runtime.effectCursor++;
    const previous = runtime.effects[index];
    const pending = previous?.pending || !previous || !dependencies || !previous.dependencies || dependencies.some((value, slot) => !Object.is(value, previous.dependencies?.[slot]));
    runtime.effects[index] = {
      dependencies,
      effect,
      pending,
      cleanup: previous?.cleanup
    };
  }
}));
vi.mock('react-i18next', () => {
  const t = (key: string): string => key;
  return {
    useTranslation: () => ({
      t
    })
  };
});
/** 清空组件实例的 Hook 槽位。 */
export function resetLifecycle(): void {
  runtime.cursor = 0;
  runtime.effectCursor = 0;
  runtime.values = [];
  runtime.effects = [];
}
/**
 * 重新调用真实组件，保留当前实例的状态与 effect 依赖。
 * @param component - 真实目标组件
 * @param props - 组件属性
 * @returns 真实元素树
 */
export function render<P extends object>(component: (props: P) => ReactElement, props: P): ReactElement {
  runtime.cursor = 0;
  runtime.effectCursor = 0;
  return component(props);
}
/** 执行依赖已变化的 effect 和其上次清理。 */
export function flushEffects(): void {
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
/** 执行真实组件注册的所有卸载清理。 */
export function unmount(): void {
  runtime.effects.forEach((record) => record.cleanup?.());
  runtime.effects = [];
}
/**
 * 遍历真实元素树，保留子组件边界。
 * @param tree - 真实组件生成的元素
 * @returns 元素节点
 */
export function elements(tree: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(tree)) return Array.isArray(tree) ? tree.flatMap(elements) : [];
  return [tree, ...Children.toArray(tree.props.children as ReactNode).flatMap(elements)];
}
/**
 * 读取元素树可见文本。
 * @param tree - 元素树
 * @returns 拼接文本
 */
export function text(tree: ReactNode): string {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (Array.isArray(tree)) return tree.map(text).join('');
  return isValidElement<{
    children?: ReactNode;
  }>(tree) ? text(tree.props.children) : '';
}
/**
 * 以明确条件查找真实节点。
 * @param tree - 元素树
 * @param predicate - 节点筛选条件
 * @returns 首个匹配节点
 */
export function find(tree: ReactNode, predicate: (node: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> {
  const node = elements(tree).find(predicate);
  if (!node) throw new Error('Missing real component element');
  return node;
}
/**
 * 触发组件真实事件回调。
 * @param node - 真实节点
 * @param name - 事件属性名
 * @param value - 事件载荷
 * @returns 回调结果
 */
export function trigger(node: ReactElement<Record<string, unknown>>, name: string, value?: unknown): unknown {
  const callback = node.props[name];
  if (typeof callback !== 'function') throw new Error(`Missing event ${name}`);
  return (callback as (event?: unknown) => unknown)(value);
}
/** 等待已排队的 Promise 回调，不模拟时间流逝。 */
export async function settle(): Promise<void> {
  await Array.from({
    length: 16
  }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
}
/**
 * 创建由测试显式完成的叶服务请求。
 * @returns 请求及完成方法
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
