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
 * @file formulaExpressionRuntime.test.tsx
 * @description 公式真实 KaTeX 编译渲染、原生测量与点击光标边界测试
 * @author 鸡哥
 */

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { FormulaExpression } from '../FormulaExpression';
import type { ReactElement, RefObject, MouseEvent } from 'react';
import type { FormulaDocument, FormulaCursor } from '../../types/calculatorTypes';

const callback = vi.fn();
const observe = vi.fn();
const disconnect = vi.fn();
let observerCallback: (() => void) | undefined;
let documentValue: FormulaDocument;
let cursor: FormulaCursor;
let rect: { left: number; top: number; width: number; height: number };
let missingAnchor: boolean;
let fontReady: Promise<unknown> | undefined;
const nativeRoot = {
  getBoundingClientRect: () => ({ left: 10, top: 20 }),
  querySelector: vi.fn(() => missingAnchor ? null : { getBoundingClientRect: () => rect }),
};

/** 原生 ResizeObserver 叶，仅将回调交给测试可控尺寸通知。 */
class NativeResizeObserver {
  /** 保存浏览器传入的尺寸回调。
   * @param notify - 真实测量闭包
   */
  constructor(notify: () => void) { observerCallback = notify; }

  /** 记录对宿主元素的原生订阅。
   * @param root - 实际宿主 ref
   */
  observe(root: unknown): void { observe(root); }

  /** 清理原生尺寸订阅。 */
  disconnect(): void { disconnect(); }
}

/** 执行真实组件并保留公开宿主属性。
 * @returns 公式宿主 React 元素
 */
function render(): ReactElement<Record<string, unknown>> {
  return renderHook(FormulaExpression, { cursor, document: documentValue, onCursorChange: callback }) as ReactElement<Record<string, unknown>>;
}
/** 以原生宿主 ref 挂载并提交布局效果。
 * @returns 当前真实 JSX 元素
 */
function mount(): ReactElement<Record<string, unknown>> {
  const tree = render(); (tree.props.ref as RefObject<HTMLSpanElement | null>).current = nativeRoot as unknown as HTMLSpanElement;
  flushHookEffects(); return render();
}
/** 从原生点击叶派发组件公开事件。
 * @param tree - 宿主元素
 * @param id - closest 返回的数据锚点
 * @param clientX - 原生指针横坐标
 * @returns 事件传播断言叶
 */
function click(tree: ReactElement<Record<string, unknown>>, id: string | null | undefined, clientX = 102): ReturnType<typeof vi.fn> {
  const stopPropagation = vi.fn();
  const target = { closest: () => id === null ? null : { dataset: { formulaAnchor: id } } };
  (tree.props.onClick as (event: MouseEvent<HTMLSpanElement>) => void)({ target, clientX, stopPropagation } as unknown as MouseEvent<HTMLSpanElement>);
  return stopPropagation;
}

beforeEach(() => {
  resetHook(); callback.mockReset(); observe.mockClear(); disconnect.mockClear(); observerCallback = undefined;
  documentValue = { segments: [{ type: 'text', value: '12' }] }; cursor = { path: [], segmentIndex: 0, offset: 0 };
  rect = { left: 100, top: 22, width: 20, height: 30 }; missingAnchor = false; fontReady = undefined;
  vi.stubGlobal('document', { fonts: { get ready() { return fontReady; } } }); vi.stubGlobal('ResizeObserver', NativeResizeObserver);
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

it('renders real KaTeX anchor HTML, measures caret position and disconnects the native observer', () => {
  const tree = mount();
  const children = tree.props.children as ReactElement<Record<string, unknown>>[];
  expect((children[0].props.dangerouslySetInnerHTML as { __html: string }).__html).toContain('data-formula-anchor="1"');
  expect(children[1].props.style).toEqual({ left: 90, top: 2, height: 30 }); expect(observe).toHaveBeenCalledWith(nativeRoot);
  rect.left = 130; observerCallback?.(); expect((render().props.children as ReactElement<Record<string, unknown>>[])[1].props.style).toEqual({ left: 120, top: 2, height: 30 });
  unmountHook(); expect(disconnect).toHaveBeenCalledOnce();
});

it.each([105, 110, 125])('maps actual pointer position %s to the real compiler start/end cursor', (clientX) => {
  const stop = click(mount(), '1', clientX);
  expect(callback).toHaveBeenCalledWith({ path: [], segmentIndex: 0, offset: clientX < 110 ? 0 : 1 }); expect(stop).toHaveBeenCalledOnce();
});

it.each([null, undefined, 'unknown'])('ignores clicks without a valid current compiler anchor: %s', (id) => {
  const stop = click(mount(), id); expect(callback).not.toHaveBeenCalled(); expect(stop).not.toHaveBeenCalled();
});

it('ignores clicks while the native host ref or its anchor element is detached', () => {
  const tree = mount(); (tree.props.ref as RefObject<HTMLSpanElement | null>).current = null; click(tree, '1'); expect(callback).not.toHaveBeenCalled();
  (tree.props.ref as RefObject<HTMLSpanElement | null>).current = nativeRoot as unknown as HTMLSpanElement; missingAnchor = true; click(tree, '1'); expect(callback).not.toHaveBeenCalled();
});

it('skips an unmounted layout and omits caret when all anchors are absent', () => {
  render(); flushHookEffects(); expect(observe).not.toHaveBeenCalled();
  resetHook(); missingAnchor = true; const tree = mount(); expect((tree.props.children as unknown[])[1]).toBe(null);
});

it('measures when browser fonts finish loading and supports a platform without ResizeObserver', async () => {
  const ready = deferred<unknown>(); fontReady = ready.promise; vi.stubGlobal('ResizeObserver', undefined);
  mount(); rect.top = 50; ready.resolve(undefined); await settleHook();
  expect((render().props.children as ReactElement<Record<string, unknown>>[])[1].props.style).toEqual({ left: 90, top: 30, height: 30 });
  expect(observe).not.toHaveBeenCalled(); unmountHook(); expect(disconnect).not.toHaveBeenCalled();
});

it('supports an empty document on a platform without document fonts', () => {
  vi.stubGlobal('document', undefined); documentValue = { segments: [] };
  expect((mount().props.children as unknown[])[1]).toBe(null);
});
