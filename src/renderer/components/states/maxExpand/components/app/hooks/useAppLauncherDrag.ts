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
 */

/**
 * @file useAppLauncherDrag.ts
 * @description 长按图标拖动排序，处理取消、指针捕获与松手后的点击抑制。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_LAUNCHER_DRAG_SCALE, APP_LAUNCHER_HOLD_RING_OUTSET, APP_LAUNCHER_LONG_PRESS_MS, APP_LAUNCHER_MOVE_TOLERANCE } from '../config/appLauncherConfig';
import { clampAppLauncherDragOffset, getAppLauncherInsertionIndex, getAppLauncherReorderOffsets } from '../utils/appLauncherReorder';
import type { PointerEvent, RefObject } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { AppLauncherHoverOffset, AppLauncherPosition } from '../types/appLauncherTypes';

interface LauncherDrag {
  tab: MaxExpandTab;
  target: MaxExpandTab | null;
  x: number;
  y: number;
  offsets: AppLauncherHoverOffset[];
  hideTarget: boolean;
}

interface LauncherPress {
  button: HTMLButtonElement;
  tab: MaxExpandTab;
  pointerId: number;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  timer: number | null;
  dragging: boolean;
  positions: AppLauncherPosition[];
  tabs: MaxExpandTab[];
  sourceIndex: number;
  scrollTop: number;
  bounds: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'> | null;
}

/**
 * 拖动时按插入位置实时让出槽位，松手后提交排序或隐藏操作。
 * @param gridRef - 图标网格引用。
 * @param enabled - 导航可交互且布局已加载、没有正在保存时允许长按。
 * @param moveApp - 持久化源应用到目标位置。
 * @param hideZoneRef - 拖动时显示的右侧隐藏区域。
 * @param hideApp - 持久化应用隐藏状态。
 * @returns 长按目标、拖动视觉状态、指针处理函数与点击抑制入口。
 */
export default function useAppLauncherDrag(
  gridRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  moveApp: (source: MaxExpandTab, target: MaxExpandTab) => Promise<void>,
  hideZoneRef: RefObject<HTMLDivElement | null>,
  hideApp: (tab: MaxExpandTab) => Promise<void>,
): {
  pressedTab: MaxExpandTab | null;
  drag: LauncherDrag | null;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  cancelDrag: () => void;
  consumeClick: (keyboard?: boolean) => boolean;
} {
  const [drag, setDrag] = useState<LauncherDrag | null>(null);
  const [pressedTab, setPressedTab] = useState<MaxExpandTab | null>(null);
  const pressRef = useRef<LauncherPress | null>(null);
  const dragRef = useRef<LauncherDrag | null>(null);
  const suppressClickRef = useRef(false);

  const cancelDrag = useCallback((): void => {
    const press = pressRef.current;
    pressRef.current = null;
    dragRef.current = null;
    if (press?.timer !== null && press?.timer !== undefined) window.clearTimeout(press.timer);
    if (press?.button.hasPointerCapture(press.pointerId)) press.button.releasePointerCapture(press.pointerId);
    setDrag(null);
    setPressedTab(null);
  }, []);

  useEffect(() => {
    if (!enabled) cancelDrag();
  }, [enabled, cancelDrag]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && pressRef.current) {
        event.preventDefault();
        cancelDrag();
      }
    };
    window.addEventListener('blur', cancelDrag);
    window.addEventListener('resize', cancelDrag);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelDrag();
      window.removeEventListener('blur', cancelDrag);
      window.removeEventListener('resize', cancelDrag);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cancelDrag]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    if (!event.isPrimary || event.button !== 0 || pressRef.current) return;
    suppressClickRef.current = false;
    const tab = event.currentTarget.dataset.app as MaxExpandTab;
    if (!enabled || tab === 'settings') return;
    const press: LauncherPress = {
      tab,
      button: event.currentTarget,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      deltaX: 0,
      deltaY: 0,
      timer: null,
      dragging: false,
      positions: [],
      tabs: [],
      sourceIndex: -1,
      scrollTop: 0,
      bounds: null,
    };
    pressRef.current = press;
    press.button.setPointerCapture(press.pointerId);
    setPressedTab(tab);
    press.timer = window.setTimeout(() => {
      press.timer = null;
      const grid = gridRef.current;
      if (!grid) {
        cancelDrag();
        return;
      }
      const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>(':scope > button'));
      press.positions = buttons.map((button) => {
        const bounds = button.getBoundingClientRect();
        return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, width: bounds.width };
      });
      press.tabs = buttons.map((button) => button.dataset.app as MaxExpandTab);
      press.sourceIndex = press.tabs.indexOf(tab);
      press.scrollTop = grid.parentElement?.scrollTop ?? 0;
      const visual = press.button.querySelector<HTMLElement>('.max-expand-app-launcher-visual');
      const circle = press.button.querySelector<HTMLElement>('.max-expand-app-launcher-circle');
      const viewport = grid.parentElement?.getBoundingClientRect();
      if (!visual || !circle || !viewport) {
        cancelDrag();
        return;
      }
      const buttonBounds = press.button.getBoundingClientRect();
      const visualBounds = visual.getBoundingClientRect();
      const circleBounds = circle.getBoundingClientRect();
      // 视觉层只平移；以固定按钮还原原点，避免把悬停位移带入拖动边界。
      const left = buttonBounds.left + (buttonBounds.width - visualBounds.width) / 2;
      const top = buttonBounds.top + (buttonBounds.height - visualBounds.height) / 2;
      const circleX = left + circleBounds.left + circleBounds.width / 2 - visualBounds.left;
      const circleY = top + circleBounds.top + circleBounds.height / 2 - visualBounds.top;
      const radiusX = (circle.offsetWidth / 2 + APP_LAUNCHER_HOLD_RING_OUTSET) * APP_LAUNCHER_DRAG_SCALE;
      const radiusY = (circle.offsetHeight / 2 + APP_LAUNCHER_HOLD_RING_OUTSET) * APP_LAUNCHER_DRAG_SCALE;
      press.bounds = {
        left: Math.min(left, circleX - radiusX),
        right: Math.max(left + visualBounds.width, circleX + radiusX),
        top: Math.min(top, circleY - radiusY),
        bottom: Math.max(top + visualBounds.height, circleY + radiusY),
      };
      const offset = clampAppLauncherDragOffset(press.bounds, viewport, 0, 0);
      if (!offset) {
        cancelDrag();
        return;
      }
      press.dragging = true;
      suppressClickRef.current = true;
      const nextDrag = { tab, target: tab, x: offset.x, y: offset.y, hideTarget: false, offsets: getAppLauncherReorderOffsets(press.positions, press.sourceIndex, press.sourceIndex) };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    }, APP_LAUNCHER_LONG_PRESS_MS);
  }, [enabled, gridRef, cancelDrag]);

  const updateDrag = useCallback((press: LauncherPress): void => {
    const grid = gridRef.current;
    const viewport = grid?.parentElement?.getBoundingClientRect();
    const scrollDelta = (grid?.parentElement?.scrollTop ?? 0) - press.scrollTop;
    if (!grid || !viewport || !press.bounds) {
      cancelDrag();
      return;
    }
    const bounds = { ...press.bounds, top: press.bounds.top - scrollDelta, bottom: press.bounds.bottom - scrollDelta };
    const offset = clampAppLauncherDragOffset(bounds, viewport, press.deltaX, press.deltaY + scrollDelta);
    if (!offset) {
      cancelDrag();
      return;
    }
    // 固定槽位只在开始时测量一次，让位动画不会反过来改变插入判定。
    const source = press.positions[press.sourceIndex];
    const settingsIndex = press.tabs.indexOf('settings');
    const movablePositions = press.positions.slice(0, settingsIndex < 0 ? press.positions.length : settingsIndex);
    const zone = hideZoneRef.current?.getBoundingClientRect();
    const pointerX = press.x + press.deltaX;
    const pointerY = press.y + press.deltaY;
    const centerX = (bounds.left + bounds.right) / 2 + offset.x;
    const centerY = (bounds.top + bounds.bottom) / 2 + offset.y;
    // 指针和受边界限制后的图标都需进入隐藏区，容器外松手不会误隐藏。
    const hideTarget = zone !== undefined && Math.hypot(press.deltaX, press.deltaY) > APP_LAUNCHER_MOVE_TOLERANCE
      && pointerX >= zone.left && pointerX <= zone.right
      && pointerY >= zone.top && pointerY <= zone.bottom
      && centerX >= zone.left && centerX <= zone.right && centerY >= zone.top && centerY <= zone.bottom;
    let targetIndex = source ? getAppLauncherInsertionIndex(movablePositions, source.x + offset.x, source.y + offset.y) : -1;
    if (hideTarget) targetIndex = press.sourceIndex;
    const offsets = getAppLauncherReorderOffsets(press.positions, press.sourceIndex, targetIndex);
    const nextDrag = { offsets, hideTarget, x: offset.x, y: offset.y, tab: press.tab, target: hideTarget ? null : press.tabs[targetIndex] ?? null };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }, [gridRef, hideZoneRef, cancelDrag]);

  useEffect(() => {
    const viewport = gridRef.current?.parentElement;
    const onScroll = (): void => {
      const press = pressRef.current;
      if (press?.dragging) updateDrag(press);
    };
    viewport?.addEventListener('scroll', onScroll);
    return () => viewport?.removeEventListener('scroll', onScroll);
  }, [gridRef, updateDrag]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    press.deltaX = event.clientX - press.x;
    press.deltaY = event.clientY - press.y;
    if (!press.dragging) {
      if (Math.hypot(press.deltaX, press.deltaY) > APP_LAUNCHER_MOVE_TOLERANCE) {
        suppressClickRef.current = true;
        cancelDrag();
      }
      return;
    }
    event.preventDefault();
    updateDrag(press);
  }, [updateDrag, cancelDrag]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    if (press.dragging) onPointerMove(event);
    const target = dragRef.current?.target;
    if (press.dragging && dragRef.current?.hideTarget) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 保存函数内部处理失败并回滚，指针回调同步结束拖动。
      void hideApp(press.tab);
    } else if (press.dragging && target) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 保存函数内部处理错误，指针回调需同步结束拖动。
      void moveApp(press.tab, target);
    }
    cancelDrag();
  }, [moveApp, hideApp, cancelDrag, onPointerMove]);

  const consumeClick = useCallback((keyboard = false): boolean => {
    if (keyboard && !pressRef.current?.dragging) {
      suppressClickRef.current = false;
      return false;
    }
    const suppressed = suppressClickRef.current || pressRef.current?.dragging === true;
    suppressClickRef.current = false;
    return suppressed;
  }, []);

  return { pressedTab, drag, onPointerDown, onPointerMove, onPointerUp, cancelDrag, consumeClick };
}
