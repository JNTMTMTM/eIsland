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
 * @file islandWindowTransition.ts
 * @description 将原生窗口收缩与当前渲染形变的完成信号关联，避免忙帧或旧动画提前裁剪。
 * @author 鸡哥
 */

let nextTransitionId = 0;
let activeTransitionId = 0;
let activeKind: 'state' | 'shape' = 'state';
const listeners = new Set<() => void>();

/**
 * 在发送尺寸请求前开始一次状态或形态切换；同状态内容刷新继续使用当前令牌。
 * @param from - 当前状态或形态。
 * @param to - 目标状态或形态。
 * @param kind - 状态形变由壳层确认；形态切换由窗口移动动画确认。
 * @returns 当前切换令牌。
 */
export function beginIslandWindowTransition(from: string, to: string, kind: 'state' | 'shape' = 'state'): number {
  if (from !== to) {
    activeTransitionId = ++nextTransitionId;
    activeKind = kind;
    window.api?.beginWindowTransition?.(activeTransitionId);
    listeners.forEach((listener) => listener());
  }
  return activeTransitionId;
}

/**
 * 读取当前形变对应的原生窗口保护令牌。
 * @param kind - 可选的令牌类别，避免壳层提前确认仍在进行的形态移动。
 * @returns 当前切换令牌；0 表示没有等待中的切换。
 */
export function getIslandWindowTransitionId(kind?: 'state' | 'shape'): number {
  if (kind && kind !== activeKind) return 0;
  return activeTransitionId;
}

/**
 * 订阅令牌变化，保证同帧反转回原状态时也能收到当前完成任务。
 * @param listener - 令牌改变时执行的回调。
 * @returns 取消订阅函数。
 */
export function subscribeIslandWindowTransition(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/**
 * 等真实尺寸动画完成后，仅允许当前切换的完成信号释放原生画布。
 * @param transitionId - 开始形变时捕获的令牌。
 */
export function completeIslandWindowTransition(transitionId: number): void {
  if (!transitionId || transitionId !== activeTransitionId) return;
  const shell = typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('.island-shell');
  // 忙帧可能推迟 CSS transition 的真正起点。刷新样式后等待实际几何动画，排除无限循环的光效。
  const animations = shell?.getAnimations?.().filter((animation) => {
    if (animation.playState === 'finished' || animation.playState === 'idle') return false;
    const effect = animation.effect as KeyframeEffect | null;
    if (!effect?.getKeyframes || !Number.isFinite(effect.getComputedTiming().endTime)) return false;
    return effect.getKeyframes().some((frame) => Object.keys(frame).some((key) =>
      ['width', 'height', 'transform'].includes(key) || (key.startsWith('border') && key.endsWith('Radius'))));
  }) ?? [];
  if (animations.length) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 完成信号保持同步接口；allSettled 消化动画取消，令牌校验隔离过期异步任务。
    void (async () => {
      await Promise.allSettled(animations.map((animation) => animation.finished));
      if (transitionId !== activeTransitionId) return;
      requestAnimationFrame(() => completeIslandWindowTransition(transitionId));
    })();
    return;
  }
  window.api?.completeWindowTransition?.(transitionId);
  activeTransitionId = 0;
  listeners.forEach((listener) => listener());
}
