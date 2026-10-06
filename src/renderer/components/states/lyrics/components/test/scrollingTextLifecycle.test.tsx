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
 * @file scrollingTextLifecycle.test.tsx
 * @description 滚动文本真实布局effect、ResizeObserver宽度测量、进度CSS、尺寸变化与卸载断开测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { findElement, hookMocks, textContent } from '../../../../test/elementHarness';
import { ScrollingText } from '../ScrollingText';
import type { ReactElement, RefObject } from 'react';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks, useLayoutEffect: lifecycleHooks.useEffect }));
const observe = vi.fn(); const disconnect = vi.fn();
let resize: (() => void) | null = null;
class BrowserResizeObserver {
  /** 保存浏览器尺寸变化回调并保留观察行为。
   * @param callback - 真实组件注册的尺寸更新函数。
   */
  constructor(callback: () => void) { resize = callback; }

  observe = observe;

  disconnect = disconnect;
}
beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); resize = null; vi.stubGlobal('ResizeObserver', BrowserResizeObserver); });
afterEach(() => { unmountHooks(); vi.unstubAllGlobals(); });
/**
 * 将实际DOM测量叶接口绑定到真实ref后执行布局effect。
 * @param width - 容器可用宽度。
 * @param textWidth - 内容真实滚动宽度。
 * @param progress - 可选逐字进度。
 * @returns 节点及可变化的DOM叶尺寸。
 */
function commit(width: number | null, textWidth: number | null, progress?: number) {
  const container = width === null ? null : { clientWidth: width };
  const content = textWidth === null ? null : { scrollWidth: textWidth };
  const initial = renderWithHooks(() => ScrollingText({ children: '歌词', className: 'line', scrollProgress: progress }));
  const span = findElement(initial, (element) => element.type === 'span');
  Object.assign((initial.props as { ref: RefObject<HTMLDivElement | null> }).ref, { current: container });
  Object.assign(span.props.ref as RefObject<HTMLSpanElement | null>, { current: content });
  runEffects();
  return { container, content, root: renderWithHooks(() => ScrollingText({ children: '歌词', className: 'line', scrollProgress: progress })) };
}
/**
 * 获取真实组件生成的CSS变量。
 * @param root - 已提交节点。
 * @returns 文本样式。
 */
function style(root: ReactElement): unknown { return findElement(root, (element) => element.type === 'span').props.style; }
describe('实际滚动文本布局与清理', () => {
  it.each([[null, 200], [100, null], [null, null]])('尚未绑定容器%s或内容%s不创建观察器', (width, textWidth) => {
    const { root } = commit(width, textWidth); expect(style(root)).toBeUndefined(); expect(observe).not.toHaveBeenCalled();
  });
  it.each([80, 100])('内容宽度%s不溢出，保留静态文本与无样式', (width) => {
    const { root, container, content } = commit(100, width);
    expect(root.props).toHaveProperty('className', 'line scroll-text'); expect(style(root)).toBeUndefined(); expect(textContent(root)).toBe('歌词');
    expect(observe).toHaveBeenNthCalledWith(1, container); expect(observe).toHaveBeenNthCalledWith(2, content);
  });
  it.each([[118, '6s'], [280, '14s']])('内容宽%s启用往返滚动，持续时间%s', (width, duration) => {
    const { root } = commit(100, Number(width)); expect(root.props).toHaveProperty('className', 'line scroll-text is-overflowing');
    expect(style(root)).toEqual({ '--scroll-text-distance': `${String(Number(width) - 100)  }px`, '--scroll-text-duration': duration, '--scroll-text-offset': '0px' });
  });
  it.each([[-1, '0px'], [0, '0px'], [0.5, '90px'], [1, '180px'], [2, '180px']])('进度%s驱动溢出偏移%s且限制合法区间', (progress, offset) => {
    const { root } = commit(100, 280, Number(progress)); expect(root.props).toHaveProperty('className', 'line scroll-text is-overflowing is-progress-driven');
    expect(style(root)).toMatchObject({ '--scroll-text-offset': offset });
  });
  it('原生尺寸变化从溢出恢复适配，并卸载断开同一观察器', () => {
    const { container, content } = commit(100, 280, 0.5); expect(container).not.toBeNull(); expect(content).not.toBeNull();
    Object.assign(container!, { clientWidth: 300 }); resize!();
    const root = renderWithHooks(() => ScrollingText({ children: '新歌词', className: 'line', scrollProgress: 0.5 }));
    expect(style(root)).toBeUndefined(); expect(textContent(root)).toBe('新歌词'); runEffects(); expect(observe).toHaveBeenCalledTimes(2);
    unmountHooks(); expect(disconnect).toHaveBeenCalledOnce();
  });
});
