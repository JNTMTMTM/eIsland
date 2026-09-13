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
 * @file useWheelPicker.ts
 * @description 轮盘选择器拖拽与滚动交互 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef } from 'react';
import { WHEEL_ITEM_HEIGHT } from '../config/wheelPickerConstants';

/** useWheelPicker Hook 参数 */
interface UseWheelPickerParams {
  containerRef: React.RefObject<HTMLDivElement | null>;
  items: number[];
  value: number;
  onChange: (val: number) => void;
}

/** useWheelPicker Hook 返回值 */
interface UseWheelPickerResult {
  handleMouseDown: (e: React.MouseEvent) => void;
}

/** 轮盘选择器拖拽与滚动交互 Hook */
export function useWheelPicker({
  containerRef,
  items,
  value,
  onChange,
}: UseWheelPickerParams): UseWheelPickerResult {
  const currentIdx = value - items[0]!;
  const dragStartY = useRef(0);
  const dragStartTop = useRef(0);
  const isDragging = useRef(false);
  const lastIdxRef = useRef(currentIdx);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const frameRef = useRef<number | null>(null);
  const targetTopRef = useRef(currentIdx * WHEEL_ITEM_HEIGHT);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const stopAnimation = useCallback((): void => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);

  const clampIdx = useCallback((idx: number) => Math.max(0, Math.min(items.length - 1, idx)), [items.length]);

  const scrollToIdx = useCallback((idx: number, smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    targetTopRef.current = idx * WHEEL_ITEM_HEIGHT;
    if (!smooth || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      stopAnimation();
      el.scrollTop = targetTopRef.current;
      return;
    }
    // 连续输入只更新目标，沿用同一条动画，避免反复重启动画造成停顿。
    if (frameRef.current !== null) return;
    let lastTime = performance.now();
    let position = el.scrollTop;
    const animate = (now: number): void => {
      const elapsed = Math.min(64, now - lastTime);
      lastTime = now;
      const distance = targetTopRef.current - position;
      if (Math.abs(distance) < 0.5) {
        el.scrollTop = targetTopRef.current;
        frameRef.current = null;
        return;
      }
      position += distance * (1 - Math.exp(-elapsed / 45));
      el.scrollTop = position;
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
  }, [containerRef, stopAnimation]);

  const selectIdx = useCallback((idx: number): void => {
    if (lastIdxRef.current === idx) return;
    lastIdxRef.current = idx;
    onChangeRef.current(items[idx]!);
  }, [items]);

  useEffect(() => {
    // 仅外部切换闹钟时同步位置；自身 onChange 的回传不能打断动画。
    if (currentIdx !== lastIdxRef.current) {
      dragCleanupRef.current?.();
      lastIdxRef.current = currentIdx;
      scrollToIdx(currentIdx, false);
    }
  }, [currentIdx, scrollToIdx]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    scrollToIdx(lastIdxRef.current, false);
    let wheelRemainder = 0;
    let lastWheelTime = 0;
    let snapTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWheel = (e: WheelEvent): void => {
      e.preventDefault();
      e.stopPropagation();
      if (isDragging.current || e.deltaY === 0) return;
      const now = performance.now();
      if (now - lastWheelTime > 180 || Math.sign(wheelRemainder) !== Math.sign(e.deltaY)) wheelRemainder = 0;
      lastWheelTime = now;
      const pixels = e.deltaY * (e.deltaMode === 1 ? WHEEL_ITEM_HEIGHT : e.deltaMode === 2 ? el.clientHeight : 1);
      wheelRemainder += Math.max(-WHEEL_ITEM_HEIGHT, Math.min(WHEEL_ITEM_HEIGHT, pixels));
      const steps = Math.trunc(wheelRemainder / WHEEL_ITEM_HEIGHT);
      if (steps === 0) return;
      wheelRemainder -= steps * WHEEL_ITEM_HEIGHT;
      const next = clampIdx(lastIdxRef.current + steps);
      selectIdx(next);
      scrollToIdx(next);
    };
    // 触屏和原生滚动同样更新数值，停下后再吸附到最近一项。
    const handleScroll = (): void => {
      if (isDragging.current || frameRef.current !== null) return;
      selectIdx(clampIdx(Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        if (!isDragging.current) scrollToIdx(lastIdxRef.current);
      }, 140);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', handleScroll);
      clearTimeout(snapTimer);
      dragCleanupRef.current?.();
      stopAnimation();
    };
  }, [selectIdx, clampIdx, scrollToIdx, containerRef, stopAnimation]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    dragCleanupRef.current?.();
    stopAnimation();
    isDragging.current = true;
    el.classList.add('alarm-wheel-scroll--dragging');
    dragStartY.current = e.clientY;
    dragStartTop.current = el.scrollTop;

    const handleMouseMove = (ev: MouseEvent): void => {
      const dy = dragStartY.current - ev.clientY;
      const top = Math.max(0, Math.min((items.length - 1) * WHEEL_ITEM_HEIGHT, dragStartTop.current + dy));
      el.scrollTop = top;
      selectIdx(clampIdx(Math.round(top / WHEEL_ITEM_HEIGHT)));
    };

    const handleMouseUp = (): void => {
      dragCleanupRef.current?.();
      selectIdx(clampIdx(Math.round(el.scrollTop / WHEEL_ITEM_HEIGHT)));
      scrollToIdx(lastIdxRef.current);
    };

    dragCleanupRef.current = () => {
      isDragging.current = false;
      el.classList.remove('alarm-wheel-scroll--dragging');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
      dragCleanupRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
  }, [items.length, selectIdx, clampIdx, scrollToIdx, containerRef, stopAnimation]);

  return { handleMouseDown };
}
