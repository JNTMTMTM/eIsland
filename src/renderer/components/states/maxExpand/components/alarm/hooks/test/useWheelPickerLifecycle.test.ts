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
 * @file useWheelPickerLifecycle.test.ts
 * @description 验证闹钟滚轮的原生单位输入、拖拽边界、动画重定位与卸载清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../../../../components/test/contentLifecycleHarness';
import { useWheelPicker } from '../useWheelPicker';
import type { MouseEvent as ReactMouseEvent } from 'react';

vi.mock('react', async (load) => ({
  ...await load<typeof import('react')>(), ...lifecycleHooks,
}));

const items = [10, 11, 12, 13, 14];
const onChange = vi.fn<(value: number) => void>();
const classList = { add: vi.fn(), remove: vi.fn() };
let element: EventTarget & { scrollTop: number; clientHeight: number; classList: typeof classList };
let containerRef: { current: HTMLDivElement | null };
let frames: Map<number, FrameRequestCallback>;
let now: number;
let frameId: number;
let reduced: boolean;

/** 执行真实 Hook 及事件订阅。
 * @param value - 父组件当前选中值。
 * @param change - 父组件最新回调。
 * @returns 实际鼠标按下回调。
 */
function render(value = 12, change = onChange) {
  const result = renderWithHooks(() => useWheelPicker({ containerRef, items, value, onChange: change }));
  runEffects();
  return result;
}
/** 派发真实浏览器滚轮事件边界。
 * @param deltaY - 输入位移。
 * @param deltaMode - 像素、行或页单位。
 * @returns 可验证阻止默认行为的事件。
 */
function wheel(deltaY: number, deltaMode = 0): Event {
  const input = Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode });
  element.dispatchEvent(input);
  return input;
}
/** 传入公开 React 鼠标事件边界。
 * @param button - 原生鼠标按钮。
 * @param clientY - 屏幕纵坐标。
 * @returns 合法处理器输入。
 */
function mouse(button = 0, clientY = 100): ReactMouseEvent {
  return { button, clientY, preventDefault: vi.fn() } as unknown as ReactMouseEvent;
}
/** 推进真实动画回调直至吸附。
 * @param count - 帧数量。
 * @param elapsed - 每帧间隔。
 * @returns 无返回值。
 */
function advance(count = 40, elapsed = 16): void {
  for (let index = 0; index < count; index++) {
    now += elapsed;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
  }
}
/** 更新拖拽的原生鼠标位置。
 * @param clientY - 当前纵坐标。
 * @returns 无返回值。
 */
function move(clientY: number): void {
  document.dispatchEvent(Object.assign(new Event('mousemove'), { clientY }));
}

describe('useWheelPicker 原生事件与生命周期边界', () => {
  beforeEach(() => {
    resetLifecycle();
    onChange.mockClear();
    classList.add.mockClear();
    classList.remove.mockClear();
    now = 0;
    frameId = 0;
    reduced = false;
    frames = new Map();
    element = Object.assign(new EventTarget(), { classList, scrollTop: 0, clientHeight: 140 });
    containerRef = { current: element as unknown as HTMLDivElement };
    vi.useFakeTimers();
    vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: () => ({ matches: reduced }) }));
    vi.stubGlobal('document', new EventTarget());
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameId++;
      frames.set(frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => { frames.delete(id); }));
  });
  afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('空 ref 的挂载、外部更新与鼠标事件均安全返回', () => {
    containerRef.current = null;
    const picker = render();
    render(13);
    const input = mouse();
    picker.handleMouseDown(input);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- 此事件方法为本测试提供的无 this mock，仅检查调用次数。
    expect(input.preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(frames.size).toBe(0);
  });

  it.each([1, 2])('非主鼠标按钮 %i 不开始拖动', (button) => {
    render().handleMouseDown(mouse(button));
    move(0);
    expect(classList.add).not.toHaveBeenCalled();
    expect(element.scrollTop).toBe(56);
  });

  it.each([1, 2])('按单位 %i 将行/页输入限制为单项', (mode) => {
    render();
    expect(wheel(1, mode).defaultPrevented).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(13);
    advance();
    expect(element.scrollTop).toBe(84);
    expect(frames.size).toBe(0);
  });

  it('零位移、方向反转和暂停均不会保留错误余量', () => {
    render();
    wheel(0);
    wheel(20);
    wheel(-20);
    wheel(-8);
    expect(onChange).toHaveBeenLastCalledWith(11);
    wheel(20);
    now = 181;
    wheel(8);
    expect(onChange).toHaveBeenCalledTimes(1);
    wheel(20);
    expect(onChange).toHaveBeenLastCalledWith(12);
    advance();
  });

  it('低动态偏好立即吸附并取消已排队动画', () => {
    render();
    wheel(28);
    expect(frames.size).toBe(1);
    reduced = true;
    wheel(28);
    expect(element.scrollTop).toBe(112);
    expect(frames.size).toBe(0);
    expect(cancelAnimationFrame).toHaveBeenCalled();
    wheel(28);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('原生滚动选值并重置吸附计时，动画期间忽略滚动', () => {
    render();
    element.scrollTop = 72;
    element.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenLastCalledWith(13);
    vi.advanceTimersByTime(100);
    element.scrollTop = 74;
    element.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(100);
    expect(frames.size).toBe(0);
    vi.advanceTimersByTime(40);
    expect(frames.size).toBe(1);
    element.dispatchEvent(new Event('scroll'));
    expect(onChange).toHaveBeenCalledTimes(1);
    advance(40, 200);
    expect(element.scrollTop).toBe(84);
  });

  it('拖动期间忽略滚轮和吸附，极端位置约束两端，失焦结束拖动', () => {
    const picker = render();
    element.dispatchEvent(new Event('scroll'));
    picker.handleMouseDown(mouse());
    wheel(28);
    element.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(140);
    expect(frames.size).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
    move(1000);
    expect(element.scrollTop).toBe(0);
    expect(onChange).toHaveBeenLastCalledWith(10);
    move(-1000);
    expect(element.scrollTop).toBe(112);
    expect(onChange).toHaveBeenLastCalledWith(14);
    window.dispatchEvent(new Event('blur'));
    expect(classList.remove).toHaveBeenCalledWith('alarm-wheel-scroll--dragging');
    advance();
    move(1000);
    expect(element.scrollTop).toBe(112);
  });

  it('重复按下先清理旧拖动，外部值切换取消活动拖动', () => {
    const picker = render();
    picker.handleMouseDown(mouse());
    picker.handleMouseDown(mouse(0, 80));
    expect(classList.remove).toHaveBeenCalledTimes(1);
    render(10);
    expect(classList.remove).toHaveBeenCalledTimes(2);
    expect(element.scrollTop).toBe(0);
    move(-500);
    expect(element.scrollTop).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('更新回调身份后使用最新 onChange，连续输入沿用单条动画', () => {
    render();
    const latest = vi.fn<(value: number) => void>();
    render(12, latest);
    wheel(28);
    wheel(28);
    expect(latest.mock.calls.map(([value]) => value)).toEqual([13, 14]);
    expect(onChange).not.toHaveBeenCalled();
    expect(frames.size).toBe(1);
    advance();
    expect(element.scrollTop).toBe(112);
  });

  it('卸载取消吸附计时、动画及 DOM 订阅', () => {
    const picker = render();
    element.dispatchEvent(new Event('scroll'));
    wheel(28);
    picker.handleMouseDown(mouse());
    unmountHooks();
    const calls = onChange.mock.calls.length;
    wheel(28);
    move(0);
    document.dispatchEvent(new Event('mouseup'));
    window.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(calls);
    expect(frames.size).toBe(0);
    expect(classList.remove).toHaveBeenCalled();
  });
});
