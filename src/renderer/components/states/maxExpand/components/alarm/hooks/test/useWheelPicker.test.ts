/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 */

/**
 * @file useWheelPicker.test.ts
 * @description 验证时间滚轮的连续动画、值回传、拖动与清理。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MouseEvent as ReactMouseEvent } from 'react';

// Node 环境中保留 Hook 槽位与依赖关系，使用事件目标模拟滚动容器。
const hooks = vi.hoisted(() => ({
  cursor: 0,
  refs: [] as { current: unknown }[],
  memos: [] as { deps: unknown[]; value: unknown }[],
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[],
}));

vi.mock('react', () => ({
  useRef: (value: unknown) => hooks.refs[hooks.cursor++] ??= { current: value },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.memos[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: callback };
    return hooks.memos[index].value;
  },
  useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.effects[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) {
      hooks.pending.push(() => {
        prior?.cleanup?.();
        hooks.effects[index] = { deps, cleanup: effect() };
      });
    }
  },
}));

import { useWheelPicker } from '../useWheelPicker';

describe('useWheelPicker', () => {
  let element: EventTarget & { scrollTop: number; clientHeight: number; classList: { add: () => void; remove: () => void } };
  let frames: Map<number, FrameRequestCallback>;
  let now: number;
  let nextFrame: number;
  let containerRef: { current: HTMLDivElement };
  const items = Array.from({ length: 60 }, (_, index) => index);
  const onChange = vi.fn();

  /** 模拟父组件将选中值回传至滚轮。 */
  const render = (value: number) => {
    hooks.cursor = 0;
    const result = useWheelPicker({ containerRef, items, value, onChange });
    hooks.pending.splice(0).forEach((effect) => effect());
    return result;
  };

  /** 推进浏览器动画帧。 */
  const advance = (count = 1): void => {
    for (let index = 0; index < count; index++) {
      now += 16;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(now));
    }
  };

  /** 发送像素滚轮输入。 */
  const wheel = (deltaY: number): void => {
    element.dispatchEvent(Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode: 0 }));
  };

  beforeEach(() => {
    hooks.cursor = 0;
    hooks.refs = [];
    hooks.memos = [];
    hooks.effects = [];
    hooks.pending = [];
    frames = new Map();
    now = 0;
    nextFrame = 0;
    // 整数 scrollTop 覆盖浏览器像素取整时动画不能停住的边界。
    let top = 0;
    element = Object.assign(new EventTarget(), { clientHeight: 140, classList: { add: vi.fn(), remove: vi.fn() }, scrollTop: 0 });
    Object.defineProperty(element, 'scrollTop', { get: () => top, set: (value: number) => { top = Math.round(value); } });
    containerRef = { current: element as unknown as HTMLDivElement };
    vi.stubGlobal('window', Object.assign(new EventTarget(), { matchMedia: () => ({ matches: false }) }));
    vi.stubGlobal('document', new EventTarget());
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  });

  afterEach(() => {
    hooks.effects.forEach((effect) => effect?.cleanup?.());
    vi.unstubAllGlobals();
  });

  it('父组件回传选中值不打断动画，快速输入沿用同一动画并准确结束', () => {
    render(10);
    wheel(100);
    expect(onChange).toHaveBeenLastCalledWith(11);
    render(11);
    expect(element.scrollTop).toBe(280);
    advance();
    expect(element.scrollTop).toBeGreaterThan(280);
    expect(element.scrollTop).toBeLessThan(308);
    wheel(100);
    render(12);
    expect(frames.size).toBe(1);
    advance(40);
    expect(element.scrollTop).toBe(336);
    expect(frames.size).toBe(0);
  });

  it('累积触控板小幅输入，并约束小时或分钟边界', () => {
    render(58);
    wheel(7);
    wheel(7);
    wheel(7);
    expect(onChange).not.toHaveBeenCalled();
    wheel(7);
    expect(onChange).toHaveBeenLastCalledWith(59);
    wheel(100);
    expect(onChange).toHaveBeenCalledTimes(1);
    advance(40);
    expect(element.scrollTop).toBe(59 * 28);
  });

  it('拖拽按像素移动，松手吸附到最近数值', () => {
    const picker = render(10);
    picker.handleMouseDown({ button: 0, clientY: 100, preventDefault: vi.fn() } as unknown as ReactMouseEvent);
    document.dispatchEvent(Object.assign(new Event('mousemove'), { clientY: 89 }));
    expect(element.scrollTop).toBe(291);
    document.dispatchEvent(Object.assign(new Event('mousemove'), { clientY: 80 }));
    expect(element.scrollTop).toBe(300);
    render(11);
    document.dispatchEvent(new Event('mouseup'));
    advance(40);
    expect(element.scrollTop).toBe(308);
  });

  it('切换到外部闹钟值时取消旧动画，卸载后不再处理拖动', () => {
    const picker = render(10);
    wheel(100);
    render(30);
    expect(element.scrollTop).toBe(840);
    expect(frames.size).toBe(0);
    picker.handleMouseDown({ button: 0, clientY: 100, preventDefault: vi.fn() } as unknown as ReactMouseEvent);
    hooks.effects.forEach((effect) => effect?.cleanup?.());
    document.dispatchEvent(Object.assign(new Event('mousemove'), { clientY: 0 }));
    expect(element.scrollTop).toBe(840);
  });
});
