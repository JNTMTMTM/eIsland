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
 * @file toolTestEvents.ts
 * @description 按序号调用工具组件真实事件回调的测试辅助函数。
 * @author 鸡哥
 */

import { value } from '../../../../test/componentHarness';
import type { ReactNode } from 'react';

/**
 * 调用指定元素的事件。
 * @param tree - 当前元素树。
 * @param selector - 标签或类名选择器。
 * @param name - 事件属性名。
 * @param index - 匹配元素的序号。
 * @param args - 事件回调参数。
 * @returns 回调返回值。
 */
export function fire(tree: ReactNode, selector: string, name: string, index = 0, ...args: unknown[]): unknown {
  const handler = value(tree, selector, name, index) as (...input: unknown[]) => unknown;
  return handler(...args);
}

/**
 * 等待同步或异步事件完成。
 * @param tree - 当前元素树。
 * @param selector - 元素选择器。
 * @param name - 事件属性名。
 * @param index - 匹配元素的序号。
 * @param args - 事件参数。
 * @returns 事件处理结果。
 */
export function fireAsync(tree: ReactNode, selector: string, name: string, index = 0, ...args: unknown[]): Promise<unknown> {
  return Promise.resolve(fire(tree, selector, name, index, ...args));
}
