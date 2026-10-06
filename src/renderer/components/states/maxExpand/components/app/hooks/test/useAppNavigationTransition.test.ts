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
 * @file useAppNavigationTransition.test.ts
 * @description 应用缩放过渡的进入、返回、打断、降级与动画资源清理回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_EXPAND_APP_TABS } from '../../config/appLauncherConfig';
import { getAppLauncherHoverOffsets } from '../../utils/appLauncherHover';
import { useAppNavigationTransition } from '../useAppNavigationTransition';
import type { MaxExpandTab } from '../../../../../../../store/types';
import type { UseAppNavigationTransitionOptions, UseAppNavigationTransitionResult } from '../../types/appTransitionTypes';

// 使用真实 Promise 和假计时器驱动 WAAPI，保留 Hook 槽位与 layout cleanup 顺序。
const hooks = vi.hoisted(() => ({
  cursor: 0,
  dirty: false,
  refs: [] as { current: unknown }[],
  states: [] as unknown[],
  memos: [] as { deps: unknown[]; value: unknown }[],
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[],
}));

vi.mock('react', () => ({
  useRef: (value: unknown) => hooks.refs[hooks.cursor++] ??= { current: value },
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [hooks.states[index], (value: unknown) => {
      if (Object.is(hooks.states[index], value)) return;
      hooks.states[index] = value;
      hooks.dirty = true;
    }];
  },
  useCallback: (callback: unknown, deps: unknown[]) => {
    const index = hooks.cursor++;
    const prior = hooks.memos[index];
    if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: callback };
    return hooks.memos[index].value;
  },
  useLayoutEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
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

interface ControlledAnimation {
  animation: Animation;
  complete: () => void;
  cancel: ReturnType<typeof vi.fn>;
}

interface MockLauncherItem {
  tab: MaxExpandTab;
  circle: {
    animate: ReturnType<typeof vi.fn>;
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    transform: string;
  };
  visual: { animate: ReturnType<typeof vi.fn>; transform: string };
  querySelector: ReturnType<typeof vi.fn>;
}

describe('useAppNavigationTransition', () => {
  let options: UseAppNavigationTransitionOptions;
  let result: UseAppNavigationTransitionResult;
  let media: EventTarget & { matches: boolean };
  let animations: ControlledAnimation[];
  let stageBounds: { left: number; top: number; width: number; height: number };
  let circleBounds: { left: number; top: number; width: number; height: number };
  let stage: { getBoundingClientRect: () => typeof stageBounds; querySelector: ReturnType<typeof vi.fn> };
  let launcher: {
    animate: ReturnType<typeof vi.fn>;
    querySelector: ReturnType<typeof vi.fn>;
    querySelectorAll: ReturnType<typeof vi.fn>;
  };
  let application: { animate: ReturnType<typeof vi.fn> };
  let items: MockLauncherItem[];
  let selectedIndex: number;
  let unmounted: boolean;
  const onSelectApp = vi.fn();
  const onBackToLauncher = vi.fn();

  function createAnimation(): Animation {
    let resolve!: (value: Animation) => void;
    let reject!: (reason: Error) => void;
    const finished = new Promise<Animation>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    const cancel = vi.fn(() => reject(new Error('cancelled')));
    const animation = { finished, cancel } as unknown as Animation;
    animations.push({ animation, cancel, complete: () => resolve(animation) });
    return animation;
  }

  function render(): UseAppNavigationTransitionResult {
    let renders = 0;
    do {
      hooks.cursor = 0;
      hooks.dirty = false;
      result = useAppNavigationTransition(options);
      result.stageRef.current = stage as unknown as HTMLDivElement;
      result.launcherRef.current = launcher as unknown as HTMLDivElement;
      // 与实际壳层一致：导航页首次显示时应用层尚未挂载。
      result.applicationRef.current = options.launcherVisible ? null : application as unknown as HTMLDivElement;
      hooks.pending.splice(0).forEach((effect) => effect());
      renders++;
      if (renders > 10) throw new Error('unexpected render loop');
    } while (hooks.dirty);
    return result;
  }

  function unmount(): void {
    hooks.effects.forEach((effect) => effect?.cleanup?.());
    unmounted = true;
  }

  async function completeAnimations(): Promise<void> {
    animations.forEach((animation) => animation.complete());
    await vi.advanceTimersByTimeAsync(0);
    render();
  }

  function setReducedMotion(matches: boolean): void {
    media.matches = matches;
    media.dispatchEvent(Object.assign(new Event('change'), { matches }));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    hooks.cursor = 0;
    hooks.dirty = false;
    hooks.refs = [];
    hooks.states = [];
    hooks.memos = [];
    hooks.effects = [];
    hooks.pending = [];
    animations = [];
    unmounted = false;
    options = {
      onSelectApp, onBackToLauncher,
      activeTab: 'todo', launcherVisible: true, animationEnabled: true, contentActive: true,
    };
    onSelectApp.mockImplementation((tab: MaxExpandTab) => {
      options = { ...options, activeTab: tab, launcherVisible: false };
      hooks.dirty = true;
    });
    onBackToLauncher.mockImplementation(() => {
      options = { ...options, launcherVisible: true };
      hooks.dirty = true;
    });
    stageBounds = { left: 10, top: 20, width: 400, height: 300 };
    circleBounds = { left: 50, top: 90, width: 60, height: 60 };
    selectedIndex = 0;
    const positions = [{ x: 0, y: 0 }, { x: 70, y: 0 }, { x: 0, y: 70 }, { x: 300, y: 200 }];
    items = (['calendar', 'todo', 'alarm', 'settings'] as const).map((tab, index) => {
      const circle = {
        animate: vi.fn(createAnimation),
        getBoundingClientRect: () => ({
          ...circleBounds,
          left: circleBounds.left + positions[index].x - positions[selectedIndex].x,
          top: circleBounds.top + positions[index].y - positions[selectedIndex].y,
        }),
        transform: 'matrix(1.2, 0, 0, 1.2, 0, 0)',
      };
      const visual = { animate: vi.fn(createAnimation), transform: 'matrix(1, 0, 0, 1, 4, 2)' };
      return {
        tab, circle, visual,
        querySelector: vi.fn((selector: string) => selector === '.max-expand-app-launcher-circle' ? circle : visual),
      };
    });
    stage = {
      getBoundingClientRect: () => stageBounds,
      querySelector: vi.fn((selector: string) => {
        selectedIndex = items.findIndex((item) => selector.includes(`data-app="${item.tab}"`));
        return items[selectedIndex]?.circle ?? null;
      }),
    };
    launcher = {
      animate: vi.fn(createAnimation),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => items),
    };
    application = { animate: vi.fn(createAnimation) };
    media = Object.assign(new EventTarget(), { matches: false });
    vi.stubGlobal('window', {
      setTimeout, clearTimeout,
      matchMedia: vi.fn(() => media),
      getComputedStyle: (element: { transform: string }) => ({ transform: element.transform }),
    });
  });

  afterEach(() => {
    if (!unmounted) unmount();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('放大网格中的真实圆并同步推开近邻，全部动画完成才清理过渡', async () => {
    render().selectApp('calendar');
    expect(onSelectApp).toHaveBeenCalledExactlyOnceWith('calendar');
    expect(render().transition).toEqual({
      direction: 'open', tab: 'calendar', icon: { left: 40, top: 70, width: 60, height: 60 },
    });
    expect(stage.querySelector).toHaveBeenCalledWith('.max-expand-app-launcher-item[data-app="calendar"] .max-expand-app-launcher-circle');
    const applicationFrames = application.animate.mock.calls[0][0] as Keyframe[];
    expect(applicationFrames[0]).toEqual(expect.objectContaining({ transform: 'translate(-130px, -50px) scale(0.15)', opacity: 0 }));
    expect(applicationFrames.at(-1)).toEqual(expect.objectContaining({ transform: 'translate(0px, 0px) scale(1)', opacity: 1 }));
    const [selected, rightNeighbor] = items;
    expect(selected.circle.animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ duration: 280, easing: 'cubic-bezier(.3,0,.2,1)' }));
    const circleFrames = selected.circle.animate.mock.calls[0][0] as Keyframe[];
    expect(circleFrames[0].transform).toBe(`${selected.circle.transform} scale(1)`);
    expect(circleFrames.at(-1)?.transform).toBe(`${selected.circle.transform} scale(3.2)`);
    const selectedVisualFrames = selected.visual.animate.mock.calls[0][0] as Keyframe[];
    expect(selectedVisualFrames.every((frame) => frame.transform === `${selected.visual.transform} translate3d(0px, 0px, 0)`)).toBe(true);
    const neighborFrames = rightNeighbor.visual.animate.mock.calls[0][0] as Keyframe[];
    expect(rightNeighbor.circle.animate).not.toHaveBeenCalled();
    expect(neighborFrames[0].transform).toBe(`${rightNeighbor.visual.transform} translate3d(0px, 0px, 0)`);
    const endTranslation = String(neighborFrames.at(-1)?.transform).match(/translate3d\(([-\d.e]+)px, ([-\d.e]+)px, 0\)/);
    expect(Number(endTranslation?.[1])).toBeGreaterThan(0);
    expect(neighborFrames.map((frame) => frame.offset)).toEqual(circleFrames.map((frame) => frame.offset));
    expect(rightNeighbor.visual.animate.mock.calls[0][1]).toEqual(selected.circle.animate.mock.calls[0][1]);
    expect(items[2].visual.animate).toHaveBeenCalledOnce();
    const farFrames = items[3].visual.animate.mock.calls[0][0] as Keyframe[];
    expect(farFrames.every((frame) => frame.transform === `${items[3].visual.transform} translate3d(0px, 0px, 0)`)).toBe(true);
    const launcherFrames = launcher.animate.mock.calls[0][0] as Keyframe[];
    expect(launcherFrames.every((frame) => frame.transform === undefined)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);

    const lastNeighborAnimation = rightNeighbor.visual.animate.mock.results[0].value as Animation;
    animations.filter(({ animation }) => animation !== lastNeighborAnimation).forEach((animation) => animation.complete());
    await vi.advanceTimersByTimeAsync(0);
    expect(render().transition?.direction).toBe('open');

    await completeAnimations();

    expect(result.transition).toBeNull();
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(onSelectApp).toHaveBeenCalledOnce();
    expect(onBackToLauncher).not.toHaveBeenCalled();
  });

  it('返回重新测量图标并保留应用，动画完成才显示导航页', async () => {
    options.launcherVisible = false;
    circleBounds = { left: 180, top: 140, width: 72, height: 72 };
    render().backToLauncher();
    expect(onBackToLauncher).not.toHaveBeenCalled();
    expect(render().transition).toEqual({
      direction: 'close', tab: 'todo', icon: { left: 170, top: 120, width: 72, height: 72 },
    });
    const applicationFrames = application.animate.mock.calls[0][0] as Keyframe[];
    expect(applicationFrames[0]).toEqual(expect.objectContaining({ transform: 'translate(0px, 0px) scale(1)', opacity: 1 }));
    expect(applicationFrames.at(-1)).toEqual(expect.objectContaining({ transform: 'translate(6px, 6px) scale(0.18)', opacity: 0 }));
    const [, selected] = items;
    const circleFrames = selected.circle.animate.mock.calls[0][0] as Keyframe[];
    expect(circleFrames[0].transform).toBe(`${selected.circle.transform} scale(3.2)`);
    expect(circleFrames.at(-1)?.transform).toBe(`${selected.circle.transform} scale(1)`);
    expect(options.launcherVisible).toBe(false);

    await completeAnimations();

    expect(options.launcherVisible).toBe(true);
    expect(result.transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
  });

  it.each(['open', 'close'] as const)('中等宽度 %s 动画的相邻采样之间保持图标顺序，不互相穿过', (direction) => {
    const activeIndex = 17;
    const positions = [5, 4, 5, 4].flatMap((count, row) => Array.from(Array.from({ length: count }).keys(), (column) => ({
      x: 60 + (column + row % 2 / 2) * 65.6,
      y: 60 + row * 94,
      width: 63.6,
    })));
    const hoverOffsets = getAppLauncherHoverOffsets(positions, activeIndex);
    stageBounds = { left: 0, top: 0, width: 400, height: 440 };
    items = MAX_EXPAND_APP_TABS.map((tab, index) => {
      const width = 55.2 * (index === activeIndex ? 1.2 : 1);
      const circle = {
        animate: vi.fn(createAnimation),
        getBoundingClientRect: () => ({
          width, height: width,
          left: positions[index].x + hoverOffsets[index].x - width / 2,
          top: positions[index].y + hoverOffsets[index].y - width / 2,
        }),
        transform: index === activeIndex ? 'matrix(1.2, 0, 0, 1.2, 0, 0)' : 'matrix(1, 0, 0, 1, 0, 0)',
      };
      const visual = {
        animate: vi.fn(createAnimation),
        transform: `matrix(1, 0, 0, 1, ${hoverOffsets[index].x}, ${hoverOffsets[index].y})`,
      };
      return {
        tab, circle, visual,
        querySelector: vi.fn((selector: string) => selector === '.max-expand-app-launcher-circle' ? circle : visual),
      };
    });
    options.activeTab = MAX_EXPAND_APP_TABS[activeIndex];
    options.launcherVisible = direction === 'open';
    const actions = render();
    if (direction === 'open') actions.selectApp(options.activeTab);
    else actions.backToLauncher();
    expect(render().transition?.direction).toBe(direction);

    const leftFrames = items[15].visual.animate.mock.calls[0][0] as Keyframe[];
    const rightFrames = items[16].visual.animate.mock.calls[0][0] as Keyframe[];
    const centerAtFrame = (index: number, frame: Keyframe): { x: number; y: number } => {
      const translation = String(frame.transform).match(/translate3d\(([-+\d.e]+)px, ([-+\d.e]+)px, 0\)/);
      expect(translation).not.toBeNull();
      const bounds = items[index].circle.getBoundingClientRect();
      return {
        x: bounds.left + bounds.width / 2 + Number(translation?.[1]),
        y: bounds.top + bounds.height / 2 + Number(translation?.[2]),
      };
    };
    expect(leftFrames.map((frame) => frame.offset)).toEqual(rightFrames.map((frame) => frame.offset));
    leftFrames.slice(1).forEach((leftFrame, previousIndex) => {
      const leftBefore = centerAtFrame(15, leftFrames[previousIndex]);
      const leftAfter = centerAtFrame(15, leftFrame);
      const rightBefore = centerAtFrame(16, rightFrames[previousIndex]);
      const rightAfter = centerAtFrame(16, rightFrames[previousIndex + 1]);
      for (let step = 0; step <= 10; step += 1) {
        const progress = step / 10;
        const dx = rightBefore.x + (rightAfter.x - rightBefore.x) * progress
          - leftBefore.x - (leftAfter.x - leftBefore.x) * progress;
        const dy = rightBefore.y + (rightAfter.y - rightBefore.y) * progress
          - leftBefore.y - (leftAfter.y - leftBefore.y) * progress;
        expect(dx, `segment ${previousIndex}, step ${step}`).toBeGreaterThan(0);
        expect(Math.hypot(dx, dy), `segment ${previousIndex}, step ${step}`).toBeGreaterThanOrEqual(55.2 - .0001);
      }
    });
  });

  it('同一事件批次和播放期间忽略重复选择与返回，结束后可以继续操作', async () => {
    const actions = render();
    actions.selectApp('calendar');
    actions.selectApp('alarm');
    actions.backToLauncher();
    render().backToLauncher();
    expect(onSelectApp).toHaveBeenCalledExactlyOnceWith('calendar');
    expect(onBackToLauncher).not.toHaveBeenCalled();
    const openingAnimationCount = animations.length;
    await completeAnimations();

    result.backToLauncher();
    result.backToLauncher();
    expect(render().transition?.direction).toBe('close');
    expect(animations.length).toBeGreaterThan(openingAnimationCount);
    await completeAnimations();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
  });

  it('返回目标不在导航可视区域时只滚动导航容器，并使用更新后的图标位置', () => {
    options.launcherVisible = false;
    let scrollTop = 0;
    const scroll = {
      getBoundingClientRect: () => ({ top: 40, height: 200 }),
      get scrollTop() { return scrollTop; },
      set scrollTop(value: number) { scrollTop = Math.max(0, value); },
    };
    Object.assign(launcher, { querySelector: vi.fn(() => scroll) });
    items[1].circle.getBoundingClientRect = () => ({ left: 60, top: 480 - scrollTop, width: 60, height: 60 });

    render().backToLauncher();

    expect(render().transition?.icon).toEqual({ left: 50, top: 90, width: 60, height: 60 });
    expect(scrollTop).toBe(370);
    expect(onBackToLauncher).not.toHaveBeenCalled();
  });

  it('目标图标无法移入舞台时直接返回，避免向窗口外缩放', () => {
    options.launcherVisible = false;
    circleBounds.top = 600;

    render().backToLauncher();

    expect(render().transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(animations).toHaveLength(0);
  });

  it('外部切换应用取消旧返回，迟到的完成通知不能覆盖新应用', async () => {
    options.launcherVisible = false;
    render().backToLauncher();
    render();
    options = { ...options, activeTab: 'calendar' };
    expect(render().transition).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await completeAnimations();
    await vi.advanceTimersByTimeAsync(1000);

    expect(options.activeTab).toBe('calendar');
    expect(options.launcherVisible).toBe(false);
    expect(onBackToLauncher).not.toHaveBeenCalled();
  });

  it('外部返回导航后取消进入过渡，旧 Promise 不影响下一个应用', async () => {
    render().selectApp('calendar');
    render();
    const previous = [...animations];
    options = { ...options, launcherVisible: true };
    render().selectApp('alarm');
    expect(render().transition?.tab).toBe('alarm');
    previous.forEach((animation) => animation.complete());
    await Promise.resolve();
    await Promise.resolve();

    expect(render().transition?.tab).toBe('alarm');
    expect(options.activeTab).toBe('alarm');
    expect(onBackToLauncher).not.toHaveBeenCalled();
  });

  it('页面隐藏时取消退出动作，离场树和迟到回调不再切换应用', async () => {
    options.launcherVisible = false;
    render().backToLauncher();
    render();
    options = { ...options, contentActive: false };
    render().backToLauncher();
    result.selectApp('alarm');
    await completeAnimations();

    expect(result.transition).toBeNull();
    expect(onBackToLauncher).not.toHaveBeenCalled();
    expect(onSelectApp).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('关闭动画后立即完成返回，后续选择也直接切页', () => {
    options.launcherVisible = false;
    render().backToLauncher();
    render();
    const createdBeforeDisabling = animations.length;
    options = { ...options, animationEnabled: false };
    expect(render().transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    result.selectApp('calendar');
    expect(render().transition).toBeNull();
    expect(onSelectApp).toHaveBeenCalledExactlyOnceWith('calendar');
    expect(animations).toHaveLength(createdBeforeDisabling);
  });

  it('系统减少动态效果初始开启时立即切页，中途开启时立即完成返回', () => {
    media.matches = true;
    render().selectApp('calendar');
    expect(render().transition).toBeNull();
    expect(animations).toHaveLength(0);
    setReducedMotion(false);
    result.backToLauncher();
    expect(render().transition?.direction).toBe('close');
    setReducedMotion(true);
    expect(render().transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('缺少动画能力或有效图标几何时降级直接切页', () => {
    stageBounds.width = 0;
    render().selectApp('calendar');
    expect(render().transition).toBeNull();
    expect(onSelectApp).toHaveBeenCalledExactlyOnceWith('calendar');
    stageBounds.width = 400;
    launcher.animate = undefined as unknown as typeof launcher.animate;
    result.backToLauncher();
    expect(render().transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(animations).toHaveLength(0);
  });

  it('动画接口中途抛错仍完成请求并释放已创建的动画', async () => {
    options.launcherVisible = false;
    launcher.animate.mockImplementation(() => { throw new Error('animation unavailable'); });
    render().backToLauncher();
    expect(render().transition).toBeNull();
    await Promise.resolve();

    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(animations).toHaveLength(1);
    expect(animations[0].cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finished 不返回时超时完成返回，不会永久保留过渡锁', async () => {
    options.launcherVisible = false;
    render().backToLauncher();
    render();
    await vi.advanceTimersByTimeAsync(379);
    expect(onBackToLauncher).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(render().transition).toBeNull();
    expect(onBackToLauncher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('卸载清理动画和系统监听，迟到完成及旧操作引用不能更新状态', async () => {
    const removeListener = vi.spyOn(media, 'removeEventListener');
    options.launcherVisible = false;
    render().backToLauncher();
    const oldActions = render();
    unmount();
    animations.forEach((animation) => animation.complete());
    setReducedMotion(true);
    oldActions.backToLauncher();
    oldActions.selectApp('calendar');
    await vi.advanceTimersByTimeAsync(1000);

    expect(removeListener).toHaveBeenCalledOnce();
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(onBackToLauncher).not.toHaveBeenCalled();
    expect(onSelectApp).not.toHaveBeenCalled();
  });
});
