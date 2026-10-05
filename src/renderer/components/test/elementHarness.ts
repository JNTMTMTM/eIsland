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
 * @file elementHarness.ts
 * @description 组件局部元素树与回调测试工具；不模拟浏览器布局或完整 React 生命周期。
 * @author 鸡哥
 */

import { vi } from 'vitest';
import type { EffectCallback, ReactElement, ReactNode, SetStateAction } from 'react';
export interface TestElement extends ReactElement<Record<string, unknown>> {
  props: Record<string, unknown> & {
    children?: ReactNode;
  };
}
const state: unknown[] = [];
let cursor = 0;
/**
 * 清理局部 Hook 值，保证场景互不污染。
 * @param values - 显式覆盖的 useState 值，按目标组件调用顺序排列。
 * @returns 无返回值。
 */
export function resetState(values: unknown[] = []): void {
  state.splice(0, state.length, ...values);
  cursor = 0;
}
/**
 * 在同一个组件重新求值前重置 Hook 游标。
 * @returns 无返回值。
 */
export function rewindState(): void {
  cursor = 0;
}
export const hookMocks = {
  useState<T>(initial: T | (() => T)): [
    T,
    (next: SetStateAction<T>) => void
  ] {
    const index = cursor++;
    if (!(index in state))
    {state[index] = typeof initial === 'function' ? (initial as () => T)() : initial;}
    return [state[index] as T, (next) => {
      state[index] = typeof next === 'function' ? (next as (previous: T) => T)(state[index] as T) : next;
    }];
  },
  useEffect: vi.fn<(effect: EffectCallback, dependencies?: readonly unknown[]) => void>(),
  useLayoutEffect: vi.fn<(effect: EffectCallback, dependencies?: readonly unknown[]) => void>(),
  useMemo: <T>(factory: () => T): T => factory(),
  useCallback: <T>(callback: T): T => callback,
  useRef: <T>(current: T): {
    current: T;
  } => ({ current }),
};
/**
 * 遍历目标组件实际返回的元素树，不执行其子组件。
 * @param value - 目标组件返回值。
 * @returns 按深度优先顺序排列的元素。
 */
export function elements(value: ReactNode): TestElement[] {
  if (Array.isArray(value))
  {return value.flatMap(elements);}
  if (value === null || typeof value !== 'object' || !('props' in value))
  {return [];}
  const element = value as TestElement;
  return [element, ...elements(element.props.children)];
}
/**
 * 获取实际元素树中的文本，供渲染分支断言使用。
 * @param value - 目标组件返回值。
 * @returns 合并后的可见文本。
 */
export function textContent(value: ReactNode): string {
  if (Array.isArray(value))
  {return value.map(textContent).join('');}
  if (typeof value === 'string' || typeof value === 'number')
  {return String(value);}
  if (value === null || typeof value !== 'object' || !('props' in value))
  {return '';}
  return textContent((value as TestElement).props.children);
}
/**
 * 从目标元素树定位一个节点，缺失时明确失败。
 * @param value - 目标组件返回值。
 * @param predicate - 节点匹配条件。
 * @returns 匹配节点。
 */
export function findElement(value: ReactNode, predicate: (element: TestElement) => boolean): TestElement {
  const found = elements(value).find(predicate);
  if (!found)
  {throw new Error('目标组件没有渲染预期的节点');}
  return found;
}
/**
 * 读取实际根元素属性，以保持局部元素树断言的明确类型。
 * @param value - 组件返回的元素树。
 * @returns 根元素属性。
 */
export function elementProps(value: ReactNode): TestElement['props'] {
  return findElement(value, () => true).props;
}
/**
 * 调用目标组件实际生成的事件回调。
 * @param element - 元素节点。
 * @param eventName - 回调属性名称。
 * @param argument - 回调事件或参数。
 * @returns 回调结果。
 */
export function invoke(element: TestElement, eventName: string, argument?: unknown): unknown {
  const callback = element.props[eventName];
  if (typeof callback !== 'function')
  {throw new Error(`缺少事件回调：${eventName}`);}
  return (callback as (event?: unknown) => unknown)(argument);
}
/**
 * 返回翻译键以避免测试受到当前语言影响。
 * @param key - 翻译键。
 * @returns 翻译键本身。
 */
export const translate = (key: string): string => key;
