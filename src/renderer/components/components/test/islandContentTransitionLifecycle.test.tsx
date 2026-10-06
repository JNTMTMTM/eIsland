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
 * @file islandContentTransitionLifecycle.test.tsx
 * @description 真实页面目标切换、性能模式延迟挂载、离场活跃上下文、动画帧与卸载清理回归。
 * @author 鸡哥
 */

import { createElement, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IslandContentTransition from '../islandContentTransition';
import { elementProps, elements, findElement, textContent } from '../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from './contentLifecycleHarness';

vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../test/elementHarness')).hookMocks,
  ...(await import('./contentLifecycleHarness')).lifecycleHooks,
  useLayoutEffect: (await import('./contentLifecycleHarness')).lifecycleHooks.useEffect,
}));

type Props = ComponentProps<typeof IslandContentTransition>;
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
const requestAnimationFrame = vi.fn((callback: FrameRequestCallback): number => {
  frames.set(++frameId, callback);
  return frameId;
});
const cancelAnimationFrame = vi.fn((id: number): void => { frames.delete(id); });
let props: Props;

/**
 * 通过真实公开 props 更新目标页面并执行实际布局 effect。
 * @param changes - 本轮目标状态与动画配置。
 * @returns 组件实际内容树。
 */
function render(changes: Partial<Props> = {}) {
  props = { ...props, ...changes };
  const tree = renderWithHooks(() => IslandContentTransition(props));
  runEffects();
  return tree;
}
/**
 * 执行真正注册的下一帧回调，模拟外壳动画已提交。
 * @returns 无返回值。
 */
function flushFrames(): void {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => { callback(100); });
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  frameId = 0;
  frames.clear();
  props = { state: 'idle', animationSpeed: 'medium', springAnimation: true, performanceModeEnabled: true, children: createElement('section', {}, 'Idle'), fallback: 'Loading' };
  vi.stubGlobal('window', { setTimeout, clearTimeout, requestAnimationFrame, cancelAnimationFrame });
});
afterEach(() => {
  unmountHooks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('actual content transition lifecycle', () => {
  it('commits light-state transitions immediately without starting a delay', () => {
    expect(textContent(render())).toBe('Idle');
    const next = render({ state: 'hover', children: createElement('section', {}, 'Hover') });
    expect(textContent(next)).toBe('Hover');
    expect(vi.getTimerCount()).toBe(0);
    expect(elementProps(findElement(next, (node) => elementProps(node)['data-island-state'] === 'hover')).hidden).toBe(false);
  });
  it('holds heavy entering content until the full duration and a real animation frame finish', () => {
    render();
    expect(textContent(render({ state: 'maxExpand', children: createElement('section', {}, 'Heavy') }))).toBe('Loading');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(699);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(frames.size).toBe(1);
    expect(textContent(render())).toBe('Loading');
    flushFrames();
    const tree = render();
    expect(textContent(tree)).toBe('Heavy');
    expect(elementProps(findElement(tree, (node) => elementProps(node)['data-island-state'] === 'maxExpand'))).toMatchObject({ hidden: false, inert: false, 'aria-hidden': undefined });
  });
  it('retains an outgoing heavy page hidden and inactive while showing a light target immediately', () => {
    render({ state: 'maxExpand', children: createElement('section', {}, 'Old heavy') });
    const tree = render({ state: 'idle', children: createElement('section', {}, 'New light') });
    const outgoing = findElement(tree, (node) => elementProps(node)['data-island-state'] === 'maxExpand');
    expect(elementProps(outgoing)).toMatchObject({ hidden: true, inert: true, 'aria-hidden': true, style: { display: 'none' } });
    const provider = elements(outgoing).find((node) => elementProps(node).value === false);
    expect(provider).toBeDefined();
    expect(textContent(tree)).toBe('Old heavyNew light');
    vi.advanceTimersByTime(700);
    flushFrames();
    expect(textContent(render())).toBe('New light');
  });
  it('preserves the original outgoing tree through an interrupted heavy transition and replaces its timer', () => {
    render({ state: 'expanded', children: createElement('section', {}, 'Expanded') });
    expect(textContent(render({ state: 'maxExpand', children: createElement('section', {}, 'Max') }))).toBe('ExpandedLoading');
    const interrupted = render({ state: 'login', children: createElement('section', {}, 'Login'), animationSpeed: 'fast', springAnimation: false });
    expect(textContent(interrupted)).toBe('ExpandedLoading');
    expect(vi.getTimerCount()).toBe(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(0);
    vi.advanceTimersByTime(219);
    expect(frames.size).toBe(0);
    vi.advanceTimersByTime(1);
    flushFrames();
    expect(textContent(render())).toBe('Login');
  });
  it('switches heavy pages of the same area immediately and releases the outgoing layer', () => {
    render({ state: 'maxExpand', children: createElement('section', {}, 'Old') });
    const tree = render({ state: 'guide', children: createElement('section', {}, 'Guide') });
    expect(textContent(tree)).toBe('Guide');
    expect(vi.getTimerCount()).toBe(0);
    expect(elements(tree).filter((node) => elementProps(node)['data-island-state'] !== undefined)).toHaveLength(1);
  });
  it('disabling performance mode during a wait cancels scheduling and commits the target immediately', () => {
    render();
    render({ state: 'maxExpand', children: createElement('section', {}, 'Heavy') });
    expect(vi.getTimerCount()).toBe(1);
    expect(textContent(render({ performanceModeEnabled: false }))).toBe('Heavy');
    expect(vi.getTimerCount()).toBe(0);
    expect(textContent(render({ performanceModeEnabled: true }))).toBe('Heavy');
  });
  it('switches ordinary-mode content immediately and refreshes the retained content ref', () => {
    render({ performanceModeEnabled: false });
    expect(textContent(render({ state: 'expanded', children: createElement('section', {}, 'Ordinary') }))).toBe('Ordinary');
    render({ performanceModeEnabled: true });
    expect(textContent(render({ state: 'maxExpand', children: createElement('section', {}, 'Heavy') }))).toBe('OrdinaryLoading');
  });
  it.each([false, true])('unmount cancels the pending timer or queued frame queued=%s', (queued) => {
    render();
    render({ state: 'maxExpand', children: createElement('section', {}, 'Heavy') });
    if (queued) vi.advanceTimersByTime(700);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(frames.size).toBe(0);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(queued ? 1 : 0);
    vi.advanceTimersByTime(1000);
    expect(frames.size).toBe(0);
  });
});
