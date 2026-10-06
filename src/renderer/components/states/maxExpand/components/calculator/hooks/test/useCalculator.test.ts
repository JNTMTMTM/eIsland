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
 * @file useCalculator.test.ts
 * @description 计算器真实公式编辑、光标移动、科学结构、求值失败与结果重置测试
 * @author 鸡哥
 */

import { beforeEach, expect, it, vi } from 'vitest';
import { useCalculator } from '../useCalculator';
import { renderHook, resetHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ScientificFn } from '../../types/calculatorTypes';

vi.mock('react', async (original) => {
  const actual = await original<typeof import('react')>();
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(actual);
});

beforeEach(() => { resetHook(); });

/** 获取同一计算器实例的真实公开状态。
 * @returns 当前公式、结果和操作方法
 */
function render(): ReturnType<typeof useCalculator> { return renderHook(useCalculator); }

it('edits digits, decimal points, operators and raw text before evaluating and clearing', () => {
  let hook = render();
  expect(hook.formula).toBe('0'); expect(hook.currentValue).toBeNaN();
  hook.inputDigit('2'); hook = render(); hook.inputDot(); hook = render(); hook.inputDigit('5');
  hook = render(); hook.inputOperator('+'); hook = render(); hook.inputText('3');
  hook = render(); expect(hook.formula).toBe('2.5+3'); expect(hook.result).toBeNull();
  hook.calculate(); hook = render(); expect(hook.result).toBe('5.5'); expect(hook.currentValue).toBe(5.5);
  hook.inputOperator('+'); hook = render(); expect(hook.result).toBeNull();
  hook.clear(); hook = render(); expect(hook.formula).toBe('0'); expect(hook.result).toBeNull();
});

it('reports real evaluator failures without losing the editable document', () => {
  let hook = render(); hook.inputText('1+'); hook = render(); hook.calculate();
  hook = render(); expect(hook.result).toBe('Error'); expect(hook.formula).toBe('1+'); expect(hook.currentValue).toBeNaN();
  hook.backspace(); hook = render(); expect(hook.result).toBeNull(); hook.calculate();
  expect(render().result).toBe('1');
});

it('inserts sign and percentage using real serialization and numerical evaluation', () => {
  let hook = render(); hook.toggleSign(); hook = render(); hook.inputText('50');
  hook = render(); hook.percentage(); hook = render(); hook.calculate();
  expect(render().currentValue).toBe(-0.5);
});

it('moves public cursors, removes forward and backward content and restores document boundaries', () => {
  let hook = render(); hook.inputText('123'); hook = render();
  hook.moveCursorBoundary('start'); hook = render(); hook.deleteForward();
  hook = render(); expect(hook.formula).toBe('23');
  hook.moveCursorBoundary('end'); hook = render(); hook.moveCursorHorizontal(-1);
  hook = render(); hook.moveCursorHorizontal(1); hook = render();
  hook.moveCursor(hook.cursor); hook = render(); hook.backspace();
  expect(render().formula).toBe('2');
});

it.each(['logn', 'fraction', 'sum', 'integral', 'derivative', 'sqrt', 'nthroot'] as ScientificFn[])('inserts a real nested scientific structure: %s', (fn) => {
  let hook = render(); hook.applyScientific(fn); hook = render();
  expect(hook.document.segments.some((segment) => segment.type === 'structure')).toBe(true);
  expect(hook.result).toBeNull();
});

it.each(['square', 'cube', 'pow', 'factorial', 'sin'] as ScientificFn[])('uses real scientific text and cursor offsets: %s', (fn) => {
  let hook = render(); hook.inputDigit('3'); hook = render(); hook.applyScientific(fn); hook = render();
  expect(hook.formula).not.toBe('3'); expect(hook.result).toBeNull();
});
