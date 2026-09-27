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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file useAppNavigationTransition.ts
 * @description 从应用图标展开页面、收回导航，并清理中断的 Web Animations 过渡。
 * @author 鸡哥
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';
import type {
  AppNavigationTransition,
  UseAppNavigationTransitionOptions,
  UseAppNavigationTransitionResult,
} from '../types/appTransitionTypes';

const TRANSITION_DURATION_MS = 400;
const TRANSITION_FALLBACK_MS = TRANSITION_DURATION_MS + 100;

interface TransitionRun {
  transition: AppNavigationTransition;
  stageWidth: number;
  stageHeight: number;
  animations: Animation[];
  timer: number | null;
  settled: boolean;
}

function releaseRun(run: TransitionRun): void {
  if (run.timer !== null) window.clearTimeout(run.timer);
  run.animations.splice(0).forEach((animation) => animation.cancel());
}

async function waitForAnimation(animation: Animation): Promise<void> {
  try {
    await animation.finished;
  } catch {
    // cancel() 会拒绝 finished；是否仍允许完成切页由当前运行标识决定。
  }
}

/**
 * 为应用选择与返回提供可中断的缩放过渡，直接入口仍由外部状态决定。
 * @param options - 当前应用、导航页可见性、动画条件及状态更新回调。
 * @returns 舞台和图层引用、当前过渡以及应用选择和返回操作。
 */
export function useAppNavigationTransition(options: UseAppNavigationTransitionOptions): UseAppNavigationTransitionResult {
  const stageRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLDivElement>(null);
  const applicationRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef(options);
  latestRef.current = options;
  const reducedMotionRef = useRef(false);
  const mountedRef = useRef(true);
  const runRef = useRef<TransitionRun | null>(null);
  const [transition, setTransition] = useState<AppNavigationTransition | null>(null);

  const settle = useCallback((targetRun: TransitionRun, complete: boolean): void => {
    const run = runRef.current;
    if (!run || run !== targetRun || run.settled || !mountedRef.current) return;
    run.settled = true;
    if (run.timer !== null) window.clearTimeout(run.timer);
    run.timer = null;
    const latest = latestRef.current;
    // 填充帧留到目标状态提交后的 layout cleanup，避免先取消缩放而闪回完整应用。
    setTransition(null);
    if (complete && run.transition.direction === 'close' && latest.contentActive
      && latest.activeTab === run.transition.tab && !latest.launcherVisible) {
      latest.onBackToLauncher();
    }
  }, []);

  const createRun = useCallback((direction: 'open' | 'close', tab: MaxExpandTab): TransitionRun | null => {
    const stage = stageRef.current;
    const launcher = launcherRef.current;
    if (!latestRef.current.animationEnabled || reducedMotionRef.current || !stage || !launcher) return null;
    if (typeof stage.getBoundingClientRect !== 'function' || typeof stage.querySelector !== 'function'
      || typeof launcher.animate !== 'function') return null;
    const circle = stage.querySelector(`.max-expand-app-launcher-item[data-app="${tab}"] .max-expand-app-launcher-circle`);
    if (!circle || typeof circle.getBoundingClientRect !== 'function') return null;
    const bounds = stage.getBoundingClientRect();
    let icon = circle.getBoundingClientRect();
    if (direction === 'close' && typeof launcher.querySelector === 'function') {
      const scroll = launcher.querySelector<HTMLElement>('.max-expand-app-launcher-scroll');
      if (scroll) {
        const viewport = scroll.getBoundingClientRect();
        if (viewport.height > 0 && (icon.top < viewport.top || icon.top + icon.height > viewport.top + viewport.height)) {
          // 只移动导航自己的滚动容器，避免 scrollIntoView 连带滚动灵动岛或文档。
          scroll.scrollTop += icon.top + icon.height / 2 - viewport.top - viewport.height / 2;
          icon = circle.getBoundingClientRect();
        }
      }
    }
    if (![bounds.width, bounds.height, icon.width, icon.height].every((value) => Number.isFinite(value) && value > 0)
      || ![bounds.left, bounds.top, icon.left, icon.top].every(Number.isFinite)) return null;
    if (icon.left < bounds.left || icon.top < bounds.top || icon.left + icon.width > bounds.left + bounds.width
      || icon.top + icon.height > bounds.top + bounds.height) return null;
    return {
      transition: {
        direction,
        tab,
        icon: { left: icon.left - bounds.left, top: icon.top - bounds.top, width: icon.width, height: icon.height },
      },
      stageWidth: bounds.width,
      stageHeight: bounds.height,
      animations: [],
      timer: null,
      settled: false,
    };
  }, []);

  const selectApp = useCallback((tab: MaxExpandTab): void => {
    const latest = latestRef.current;
    if (!mountedRef.current || runRef.current || !latest.contentActive || !latest.launcherVisible) return;
    const run = createRun('open', tab);
    if (run) {
      runRef.current = run;
      setTransition(run.transition);
    }
    latest.onSelectApp(tab);
  }, [createRun]);

  const backToLauncher = useCallback((): void => {
    const latest = latestRef.current;
    if (!mountedRef.current || runRef.current || !latest.contentActive || latest.launcherVisible) return;
    const run = createRun('close', latest.activeTab);
    if (!run) {
      latest.onBackToLauncher();
      return;
    }
    runRef.current = run;
    setTransition(run.transition);
  }, [createRun]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (runRef.current) releaseRun(runRef.current);
      runRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = media.matches;
    const handleChange = (event: MediaQueryListEvent): void => {
      reducedMotionRef.current = event.matches;
      if (event.matches && runRef.current) settle(runRef.current, true);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [settle]);

  useLayoutEffect(() => {
    const run = runRef.current;
    if (!run) return;
    if (!options.contentActive || options.activeTab !== run.transition.tab || options.launcherVisible) {
      settle(run, false);
    } else if (!options.animationEnabled || reducedMotionRef.current) {
      settle(run, true);
    }
  }, [options.activeTab, options.launcherVisible, options.contentActive, options.animationEnabled, settle]);

  useLayoutEffect(() => {
    const run = runRef.current;
    if (!transition || !run || run.transition !== transition || run.settled) {
      if (run?.settled) {
        releaseRun(run);
        runRef.current = null;
      }
      return;
    }
    const application = applicationRef.current;
    const launcher = launcherRef.current;
    const icon = iconRef.current;
    if (!application || !launcher || !icon || typeof application.animate !== 'function'
      || typeof launcher.animate !== 'function' || typeof icon.animate !== 'function') {
      settle(run, true);
      return;
    }
    const { left, top, width, height } = transition.icon;
    const scale = Math.min(1, Math.max(.06, width / run.stageWidth));
    const x = left + width / 2 - run.stageWidth / 2;
    const y = top + height / 2 - run.stageHeight / 2;
    const compact = `translate(${x}px, ${y}px) scale(${scale})`;
    const applicationFrames: Keyframe[] = [
      { transform: compact, transformOrigin: '50% 50%', opacity: 0 },
      { transform: 'translate(0px, 0px) scale(1)', transformOrigin: '50% 50%', opacity: 1 },
    ];
    const launcherFrames: Keyframe[] = [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.06)', opacity: 0 },
    ];
    const iconFrames: Keyframe[] = transition.direction === 'open' ? [
      { transform: 'scale(1)', opacity: 1, offset: 0 },
      { transform: 'scale(1.65)', opacity: 1, offset: .25 },
      { transform: 'scale(3)', opacity: 0, offset: .65 },
      { transform: 'scale(3)', opacity: 0, offset: 1 },
    ] : [
      { transform: 'scale(2)', opacity: 0, offset: 0 },
      { transform: 'scale(1.65)', opacity: 0, offset: .45 },
      { transform: 'scale(1)', opacity: 1, offset: 1 },
    ];
    if (transition.direction === 'close') {
      applicationFrames.reverse();
      launcherFrames.reverse();
    }
    const timing: KeyframeAnimationOptions = { duration: TRANSITION_DURATION_MS, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' };
    try {
      run.animations.push(application.animate(applicationFrames, timing));
      run.animations.push(launcher.animate(launcherFrames, timing));
      run.animations.push(icon.animate(iconFrames, { ...timing, easing: 'linear' }));
      run.timer = window.setTimeout(() => settle(run, true), TRANSITION_FALLBACK_MS);
    } catch {
      // 不支持当前动画实现时仍完成用户请求，不能把页面留在过渡锁中。
      settle(run, true);
    }
    const finishAnimations = async (): Promise<void> => {
      await Promise.all(run.animations.map(waitForAnimation));
      settle(run, true);
    };
    // layout effect 必须同步返回清理；每个 finished 的取消拒绝已在等待函数内处理。
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- layout effect 需同步返回清理，动画取消拒绝已单独捕获。
    void finishAnimations();
    return () => {
      releaseRun(run);
      if (runRef.current === run) runRef.current = null;
    };
  }, [transition, settle]);

  return { stageRef, launcherRef, applicationRef, iconRef, transition, selectApp, backToLauncher };
}
