/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarScrollDamping.ts
 * @description 为连续月历提供滚轮阻尼和顺向月初吸附，保留细粒度定位能力。
 * @author 鸡哥
 */

import { DAMPING_TIME_MS, SNAP_DISTANCE, STOP_DISTANCE, WHEEL_SCALE } from '../config/calendarConfig';

/**
 * 在滚动容器上启用阻尼与单段吸附；使用相对位移兼容向前补充月份。
 * @param element - 日历日期滚动容器。
 * @param getMonthStarts - 读取最新月初位置，兼容滚动中动态补充月份。
 * @returns 解绑监听并取消未完成动画的清理函数。
 */
export function attachCalendarScrollDamping(element: HTMLElement, getMonthStarts: () => readonly number[]): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let remaining = 0;
  let snapRemaining = 0;
  let fractional = 0;
  let frame: number | null = null;
  let lastTime = 0;
  let snapping = false;

  /** 用户点击、键盘导航或触摸时立即结束余下位移。 */
  const stop = (): void => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    remaining = 0;
    snapRemaining = 0;
    fractional = 0;
    snapping = false;
  };

  /** 滚轮位移与吸附位移共用衰减曲线，避免先减速再二次启动。 */
  const animate = (time: number): void => {
    frame = null;
    const elapsed = Math.min(Math.max(time - lastTime, 0), 64);
    lastTime = time;
    const total = remaining + snapRemaining;
    const decay = Math.abs(total) <= STOP_DISTANCE ? 0 : Math.exp(-elapsed / DAMPING_TIME_MS);
    const step = total * (1 - decay) + fractional;
    const before = element.scrollTop;
    element.scrollTop += step;
    // 保留浏览器舍入掉的小数位移，避免结束时再跳几像素校正。
    fractional = step - (element.scrollTop - before);
    remaining *= decay;
    snapRemaining *= decay;
    if (element.scrollTop === before && Math.abs(step) >= 1) {
      stop();
      return;
    }
    if (Math.abs(remaining + snapRemaining) > STOP_DISTANCE) {
      frame = requestAnimationFrame(animate);
    } else {
      element.scrollTop += remaining + snapRemaining + fractional;
      remaining = 0;
      snapRemaining = 0;
      fractional = 0;
      if (snapping) {
        const target = getMonthStarts().find((top) => Math.abs(top - element.scrollTop) <= 1);
        if (target !== undefined) element.scrollTop = target;
      }
      snapping = false;
    }
  };

  /** 根据本次输入预先确定最终停靠点，以一次连续缓动抵达。 */
  const onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.cancelable) {
      stop();
      return;
    }
    if (event.deltaY === 0 || element.clientHeight === 0) return;
    event.preventDefault();
    const direction = Math.sign(event.deltaY);
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
    const limit = element.clientHeight * .8;
    const delta = Math.max(-limit, Math.min(limit, event.deltaY * unit)) * WHEEL_SCALE;
    if (Math.sign(delta) !== Math.sign(remaining)) {
      remaining = 0;
      fractional = 0;
    }
    remaining = Math.max(-limit, Math.min(limit, remaining + delta));
    // 新输入只保留用户滚动的余量，重新计算吸附，避免多次叠加自动位移。
    const projected = element.scrollTop + remaining + fractional;
    const radius = Math.min(SNAP_DISTANCE, element.clientHeight * .28);
    const target = getMonthStarts().filter((top) =>
      (top - projected) * direction >= 0 && Math.abs(top - projected) <= radius
    ).sort((a, b) => Math.abs(a - projected) - Math.abs(b - projected))[0];
    snapping = target !== undefined;
    snapRemaining = target === undefined ? 0 : target - projected;
    if (reducedMotion.matches) {
      element.scrollTop += remaining + snapRemaining + fractional;
      stop();
      return;
    }
    if (frame === null) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  };

  element.addEventListener('wheel', onWheel, { passive: false });
  element.addEventListener('pointerdown', stop);
  element.addEventListener('keydown', stop);
  reducedMotion.addEventListener('change', stop);
  return () => {
    stop();
    element.removeEventListener('wheel', onWheel);
    element.removeEventListener('pointerdown', stop);
    element.removeEventListener('keydown', stop);
    reducedMotion.removeEventListener('change', stop);
  };
}
