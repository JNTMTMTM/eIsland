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
 * @file componentHarness.ts
 * @description Node 环境中的 React 元素树、局部状态及事件测试工具。
 * @author 鸡哥
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { beforeEach, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as (() => void | (() => void))[] }));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const mocked = {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [hooks.values[index], (next: unknown) => {
        hooks.values[index] = typeof next === 'function' ? (next as (previous: unknown) => unknown)(hooks.values[index]) : next;
      }];
    },
    useRef: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.values)) hooks.values[index] = { current: initial };
      return hooks.values[index];
    },
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (callback: unknown) => callback,
    useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
    useLayoutEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
    useId: () => 'test-detail',
    useImperativeHandle: (ref: { current: unknown } | null, factory: () => unknown) => {
      if (ref) Object.assign(ref, { current: factory() });
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: { language: 'en-US', resolvedLanguage: 'en-US' },
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

beforeEach(() => { hooks.cursor = 0; hooks.values = []; });

/**
 * 调用真实组件，重渲染时保留局部状态。
 * @param component - 函数组件、memo 或 forwardRef 组件。
 * @param props - 待测输入。
 * @returns 组件产生的真实元素树。
 */
export function render(component: unknown, props: object = {}): ReactNode {
  hooks.cursor = 0;
  hooks.effects = [];
  if (typeof component === 'function') return (component as (input: object) => ReactNode)(props);
  const wrapped = component as { type?: unknown; render?: (input: object, ref: null) => ReactNode };
  if (wrapped.render) return wrapped.render(props, null);
  return render(wrapped.type, props);
}

/**
 * 执行当前渲染记录的 effect，供显式生命周期测试使用。
 * @returns effect 的卸载清理函数。
 */
export function flushEffects(): (() => void)[] {
  return hooks.effects.map((effect) => effect()).filter((cleanup): cleanup is () => void => typeof cleanup === 'function');
}

/**
 * 搜索真实组件返回的元素，保留子组件边界。
 * @param tree - React 元素树。
 * @param selector - 标签名、类名（. 前缀）或组件引用。
 * @returns 匹配元素。
 */
export function nodes(tree: ReactNode, selector: unknown): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(tree)) {
    return Array.isArray(tree) ? tree.flatMap((child: ReactNode) => nodes(child, selector)) : [];
  }
  const matches = tree.type === selector || (typeof selector === 'string' && selector.startsWith('.')
    && typeof tree.props.className === 'string' && tree.props.className.split(' ').includes(selector.slice(1)));
  return [...(matches ? [tree] : []), ...Children.toArray(tree.props.children as ReactNode).flatMap((child) => nodes(child, selector))];
}

/**
 * 读取元素属性。
 * @param tree - 元素树。
 * @param selector - 选择器。
 * @param name - 属性名。
 * @param index - 匹配元素序号。
 * @returns 指定属性。
 */
export function value(tree: ReactNode, selector: unknown, name: string, index = 0): unknown {
  const node = nodes(tree, selector)[index];
  if (!node) throw new Error(`Missing element ${String(selector)} at ${index}`);
  return node.props[name];
}

/**
 * 调用元素的真实事件处理器。
 * @param tree - 元素树。
 * @param selector - 选择器。
 * @param name - 事件属性名。
 * @param args - 事件参数。
 * @returns 事件处理结果。
 */
export function trigger(tree: ReactNode, selector: unknown, name: string, ...args: unknown[]): unknown {
  const handler = value(tree, selector, name) as (...input: unknown[]) => unknown;
  return handler(...args);
}

/**
 * 提取元素树文本，不执行被隔离的子组件。
 * @param tree - 元素树。
 * @returns 文本内容。
 */
export function text(tree: ReactNode): string {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (Array.isArray(tree)) return tree.map((child: ReactNode) => text(child)).join('');
  if (isValidElement<{ children?: ReactNode }>(tree)) return text(tree.props.children);
  return '';
}
