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
import { APP_LAUNCHER_LONG_PRESS_MS, APP_LAUNCHER_MOVE_TOLERANCE } from '../config/appLauncherConfig';
import { getAppLauncherInsertionIndex, getAppLauncherReorderOffsets } from '../utils/appLauncherReorder';
import type { PointerEvent, RefObject } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { AppLauncherHoverOffset, AppLauncherPosition } from '../types/appLauncherTypes';

interface LauncherDrag {
  tab: MaxExpandTab;
  target: MaxExpandTab | null;
  x: number;
  y: number;
  offsets: AppLauncherHoverOffset[];
}

interface LauncherPress {
  button: HTMLButtonElement;
  tab: MaxExpandTab;
  pointerId: number;
  x: number;
  y: number;
  timer: number | null;
  dragging: boolean;
  positions: AppLauncherPosition[];
  tabs: MaxExpandTab[];
  sourceIndex: number;
  scrollTop: number;
}

/**
 * 拖动时按插入位置实时让出槽位，松手后提交一次顺序调整。
 * @param gridRef - 图标网格引用。
 * @param enabled - 导航可交互且布局已加载、没有正在保存时允许长按。
 * @param moveApp - 持久化源应用到目标位置。
 * @returns 长按目标、拖动视觉状态、指针处理函数与点击抑制入口。
 */
export default function useAppLauncherDrag(
  gridRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  moveApp: (source: MaxExpandTab, target: MaxExpandTab) => Promise<void>,
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
      timer: null,
      dragging: false,
      positions: [],
      tabs: [],
      sourceIndex: -1,
      scrollTop: 0,
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
      press.dragging = true;
      suppressClickRef.current = true;
      const nextDrag = { tab, target: tab, x: 0, y: 0, offsets: getAppLauncherReorderOffsets(press.positions, press.sourceIndex, press.sourceIndex) };
      dragRef.current = nextDrag;
      setDrag(nextDrag);
    }, APP_LAUNCHER_LONG_PRESS_MS);
  }, [enabled, gridRef, cancelDrag]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    const x = event.clientX - press.x;
    const y = event.clientY - press.y;
    if (!press.dragging) {
      if (Math.hypot(x, y) > APP_LAUNCHER_MOVE_TOLERANCE) {
        suppressClickRef.current = true;
        cancelDrag();
      }
      return;
    }
    event.preventDefault();
    const grid = gridRef.current;
    const viewport = grid?.parentElement?.getBoundingClientRect();
    let target: MaxExpandTab | null = null;
    let offsets = dragRef.current?.offsets ?? [];
    const scrollDelta = (grid?.parentElement?.scrollTop ?? 0) - press.scrollTop;
    // 固定槽位只在开始时测量一次，让位动画不会反过来改变插入判定。
    if (grid && viewport && event.clientX >= viewport.left && event.clientX <= viewport.right
      && event.clientY >= viewport.top && event.clientY <= viewport.bottom) {
      const source = press.positions[press.sourceIndex];
      const settingsIndex = press.tabs.indexOf('settings');
      const movablePositions = press.positions.slice(0, settingsIndex < 0 ? press.positions.length : settingsIndex);
      const targetIndex = source ? getAppLauncherInsertionIndex(movablePositions, source.x + x, source.y + y + scrollDelta) : -1;
      target = press.tabs[targetIndex] ?? null;
      offsets = getAppLauncherReorderOffsets(press.positions, press.sourceIndex, targetIndex);
    }
    const nextDrag = { x, offsets, target, y: y + scrollDelta, tab: press.tab };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }, [gridRef, cancelDrag]);

  const onPointerUp = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) return;
    if (press.dragging) onPointerMove(event);
    const target = dragRef.current?.target;
    if (press.dragging && target) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises -- 保存函数内部处理错误，指针回调需同步结束拖动。
      void moveApp(press.tab, target);
    }
    cancelDrag();
  }, [moveApp, cancelDrag, onPointerMove]);

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
