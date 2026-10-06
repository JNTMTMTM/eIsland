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
 * @file calculatorTabRuntime.test.tsx
 * @description 计算器真实编辑 Hook、全部按钮键盘、模式与字号交互组合测试
 * @author 鸡哥
 */

import { Children, isValidElement, type ReactNode, type ReactElement } from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { renderHook, resetHook, unmountHook } from '../../../calendar/hooks/test/calendarHookHarness';
import { CalculatorTab } from '../CalculatorTab';
import { CalculatorSidebar } from '../CalculatorSidebar';
import { CalcDisplay } from '../CalcDisplay';
import { BUTTON_LAYOUT, SCIENTIFIC_FN_LAYOUT } from '../../config/calculatorConfig';
import type { CalcMode } from '../../types/calculatorTypes';

let tree: ReactElement;

/** 展开真实按钮布局子组件，其余业务子组件保持公开 JSX 标识。
 * @param node - 真实 React 返回树
 * @returns 实际元素与按钮
 */
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  if (typeof node.type === 'function' && node.type.name === 'ButtonGrid') {
    return elements((node.type as (props: Record<string, unknown>) => ReactElement)(node.props));
  }
  return [node, ...Children.toArray(node.props.children as ReactNode).flatMap(elements)];
}
/** 当前实际组件公开属性。
 * @param type - 子组件类型
 * @returns 实际属性
 */
function props(type: unknown): Record<string, unknown> {
  const value = elements(tree).find((node) => node.type === type);
  if (!value) throw new Error('Missing public component'); return value.props;
}
/** 执行真实状态编辑组件。
 */
function render(): void { tree = renderHook(CalculatorTab); }
/** 切换公开侧栏模式。
 * @param mode - 计算器模式
 */
function mode(mode: CalcMode): void { (props(CalculatorSidebar).onSwitchMode as (value: CalcMode) => void)(mode); render(); }
/** 派发公开编辑区原生键盘回调。
 * @param key - 浏览器键名
 * @returns preventDefault 断言叶
 */
function key(key: string): ReturnType<typeof vi.fn> {
  const preventDefault = vi.fn(); (props(CalcDisplay).onKeyDown as (event: unknown) => void)({ key, preventDefault }); render(); return preventDefault;
}

beforeEach(() => { resetHook(); render(); });
afterEach(() => unmountHook());

it.each(['1', '.', '+', '-', '*', 'x', 'X', '/', '^', '(', ')', ',', '%', 'Enter', '=', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])('executes the real keyboard editing branch for %s', (value) => {
  expect(key(value)).toHaveBeenCalledOnce(); expect(props(CalcDisplay).document).toHaveProperty('segments');
});

it('ignores unsupported keys and evaluates actual keyboard input', () => {
  expect(key('Tab')).not.toHaveBeenCalled(); key('2'); key('+'); key('3'); key('Enter'); expect(props(CalcDisplay).result).toBe('5');
  (props(CalcDisplay).onMoveEnd as () => void)(); render(); expect(props(CalcDisplay).cursor).toMatchObject({ offset: 3 });
});

it.each(BUTTON_LAYOUT.flat())('dispatches the actual arithmetic button $alt through the real Hook', (definition) => {
  const button = elements(tree).find((node) => node.type === 'button' && node.props['aria-label'] === (definition.labelKey ?? definition.alt));
  if (!button) throw new Error('Missing arithmetic button'); const preventDefault = vi.fn();
  (button.props.onMouseDown as (event: unknown) => void)({ preventDefault }); (button.props.onClick as () => void)(); render();
  expect(preventDefault).toHaveBeenCalledOnce(); expect(props(CalcDisplay).document).toHaveProperty('segments');
});

it.each(SCIENTIFIC_FN_LAYOUT.flat())('dispatches the actual scientific button $alt through the real Hook', (definition) => {
  mode('scientific'); const button = elements(tree).find((node) => node.type === 'button' && node.props['aria-label'] === (definition.labelKey ?? definition.alt));
  if (!button) throw new Error('Missing scientific button'); (button.props.onClick as () => void)(); render();
  expect(props(CalcDisplay).document).toHaveProperty('segments');
});

it.each([{ length: 10, size: '34px' }, { length: 20, size: '26px' }, { length: 30, size: '20px' }])('resizes the real edited formula at $length characters', ({ length, size }) => {
  Array.from({ length }).forEach(() => key('1')); expect(props(CalcDisplay).fontSize).toBe(size);
});

it('switches modes and coordinate input panels while preserving the real formula and collapse state', () => {
  (props(CalculatorSidebar).onToggleCollapse as () => void)(); render(); expect(props(CalculatorSidebar).collapsed).toBe(false);
  mode('coordinate'); key('2'); expect(props(CalcDisplay).showValue).toBe(false); expect(props(CalcDisplay).hasResult).toBe(false);
  let toggle = elements(tree).find((node) => node.props.className === 'calc-btn calc-btn--toggle');
  if (!toggle) throw new Error('Missing key toggle'); (toggle.props.onClick as () => void)(); render();
  expect(elements(tree).some((node) => node.props.className === 'calc-buttons calc-buttons--arith-inner')).toBe(true);
  toggle = elements(tree).find((node) => node.props.className === 'calc-btn calc-btn--toggle');
  if (!toggle) throw new Error('Missing key toggle'); (toggle.props.onClick as () => void)(); render();
  expect(elements(tree).some((node) => node.props.className === 'calc-buttons calc-buttons--sci-inner')).toBe(true);
  (props(CalcDisplay).onMoveEnd as () => void)(); render(); mode('arithmetic'); expect(props(CalcDisplay).document).toMatchObject({ segments: [{ value: '2' }] });
});
