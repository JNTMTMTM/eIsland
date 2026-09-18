/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License (GPL-3.0 or later).
 */

/**
 * @file calendarScrollDamping.ts
 * @description 为连续月历提供低速、短尾的滚轮缓动，保留细粒度定位能力。
 * @author 鸡哥
 */

const WHEEL_SCALE = .55;
const DAMPING_TIME_MS = 70;
const STOP_DISTANCE = .25;

/**
 * 在滚动容器上启用阻尼；使用相对位移，兼容虚拟列表向前补充月份。
 * @param element - 日历日期滚动容器。
 * @returns 解绑监听并取消未完成动画的清理函数。
 */
export function attachCalendarScrollDamping(element: HTMLElement): () => void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let remaining = 0;
  let frame: number | null = null;
  let lastTime = 0;

  /** 用户点击、键盘导航或触摸时立即结束余下的滚轮位移。 */
  const stop = (): void => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    remaining = 0;
  };

  /** 使用实际帧间隔计算衰减，避免高刷新率屏幕上的滚动手感变化。 */
  const animate = (time: number): void => {
    frame = null;
    const elapsed = Math.min(Math.max(time - lastTime, 0), 64);
    lastTime = time;
    const step = Math.abs(remaining) <= STOP_DISTANCE
      ? remaining
      : remaining * (1 - Math.exp(-elapsed / DAMPING_TIME_MS));
    const before = element.scrollTop;
    element.scrollTop += step;
    remaining -= step;
    // 到达真实边界时放弃残余惯性；月份扩展仍由原滚动逻辑负责。
    if (element.scrollTop === before && Math.abs(step) >= 1) remaining = 0;
    if (Math.abs(remaining) > STOP_DISTANCE) {
      frame = requestAnimationFrame(animate);
    } else {
      element.scrollTop += remaining;
      remaining = 0;
    }
  };

  /** 归一化不同设备的滚轮单位，限制积累距离并支持立即反向。 */
  const onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.cancelable) {
      stop();
      return;
    }
    if (event.deltaY === 0 || element.clientHeight === 0) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
    const limit = element.clientHeight * .8;
    const delta = Math.max(-limit, Math.min(limit, event.deltaY * unit)) * WHEEL_SCALE;
    if (reducedMotion.matches) {
      stop();
      element.scrollTop += delta;
      return;
    }
    if (Math.sign(delta) !== Math.sign(remaining)) remaining = 0;
    remaining = Math.max(-limit, Math.min(limit, remaining + delta));
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
