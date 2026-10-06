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
 * @file miniToolIslandLifecycle.test.tsx
 * @description 验证工具岛原生定时驱动的待办、倒数日、番茄钟演示及卸载清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../components/test/contentLifecycleHarness';
import { elements, hookMocks, textContent } from '../../../../test/elementHarness';
import { MiniToolIsland } from '../MiniToolIsland';
import type { MiniToolDemo } from '../../config/guideContentConfig';

vi.hoisted(() => {
  vi.stubGlobal('window', { api: {} });
  vi.stubGlobal('navigator', { language: 'zh-CN' });
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));

/** 执行演示组件真实定时effect与状态。
 * @param demo - 实际配置支持的演示。
 * @returns 实际 JSX 元素树。
 */
function render(demo: MiniToolDemo) {
  const tree = renderWithHooks(() => MiniToolIsland({ demo }));
  runEffects();
  return tree;
}

describe('工具岛真实定时演示与清理', () => {
  beforeEach(() => { resetLifecycle(); vi.useFakeTimers(); });
  afterEach(() => { unmountHooks(); vi.useRealTimers(); });

  it('待办完成数随原生计时更新并循环，卸载清理interval', () => {
    let tree = render('todo');
    const doneCount = () => elements(tree).filter(({ props }) => String(props.className).startsWith('mt-todo-item') && String(props.className).includes(' done')).length;
    expect(doneCount()).toBe(0);
    vi.advanceTimersByTime(3000);
    tree = render('todo');
    expect(doneCount()).toBe(3);
    vi.advanceTimersByTime(1000);
    tree = render('todo');
    expect(doneCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('倒数日由42天降到13天后循环，不伪造内部tick', () => {
    expect(textContent(render('timer'))).toContain('42');
    vi.advanceTimersByTime(29000);
    expect(textContent(render('timer'))).toContain('13');
    vi.advanceTimersByTime(1000);
    expect(textContent(render('timer'))).toContain('42');
  });

  it('番茄钟真实定时回调逐秒更新并在周期后复原', () => {
    expect(textContent(render('pomodoro'))).toContain('25:00');
    vi.advanceTimersByTime(1000);
    expect(textContent(render('pomodoro'))).toContain('24:59');
    vi.advanceTimersByTime(1499000);
    expect(textContent(render('pomodoro'))).toContain('25:00');
  });

  it('AI演示动画期间保留真实静态消息并在卸载取消定时器', () => {
    const tree = render('ai');
    expect(elements(tree).filter(({ props }) => props.className === 'mt-chat-dot')).toHaveLength(3);
    vi.advanceTimersByTime(2000);
    expect(textContent(render('ai'))).toBe(textContent(tree));
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
  });
});
