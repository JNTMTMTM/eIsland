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
 * @file tree.ts
 * @description 遍历真实 React 元素树、定位渲染分支并触发元素事件的测试工具。
 * @author 鸡哥
 */

import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect } from 'vitest';

export interface TreeProps extends Record<string, unknown> { className?: string; title?: string; src?: string; children?: ReactNode; }
export type TreeElement = ReactElement<TreeProps>;
/**
 * 遍历真实组件返回的元素树，保留子组件边界。
 * @param tree - 元素树。
 * @returns 所有元素。
 */
export function elements(tree: ReactNode): TreeElement[] {
  if (!isValidElement<TreeProps>(tree)) return [];
  return [tree, ...Children.toArray(tree.props.children).flatMap(elements)];
}
/**
 * 读取元素树的可见文本。
 * @param tree - 元素树。
 * @returns 文本。
 */
export function text(tree: ReactNode): string {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree);
  if (!isValidElement<TreeProps>(tree)) return Children.toArray(tree).map(text).join('');
  return Children.toArray(tree.props.children).map(text).join('');
}
/**
 * 查找元素。
 * @param tree - 元素树。
 * @param predicate - 匹配规则。
 * @returns 匹配元素。
 */
export function find(tree: ReactNode, predicate: (node: TreeElement) => boolean): TreeElement {
  const found = elements(tree).find(predicate);
  expect(found, 'expected component element').toBeDefined();
  return found!;
}
/**
 * 按样式类查找元素。
 * @param tree - 元素树。
 * @param value - 类名。
 * @returns 匹配元素。
 */
export function byClass(tree: ReactNode, value: string): TreeElement {
  return find(tree, (node) => String(node.props.className ?? '').split(' ').includes(value));
}
/**
 * 调用实际元素的事件。
 * @param node - 元素。
 * @param event - 事件名称。
 * @param args - 参数。
 * @returns 事件结果。
 */
export function invoke(node: TreeElement, event: string, ...args: unknown[]): unknown {
  const callback = node.props[event];
  expect(callback).toBeTypeOf('function');
  return (callback as (...values: unknown[]) => unknown)(...args);
}
/**
 * 测试翻译返回键，保证可定位分支。
 * @param key - 翻译键。
 * @returns 键。
 */
export function translate(key: string): string { return key; }
