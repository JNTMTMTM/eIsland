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
 * @file useIslandDrag.ts
 * @description 灵动岛 pill 模式拖动支持 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Point } from '../../../preload/types';
import type { IslandShapeMode, IslandState } from '../../store/types';

/** 拖动距离阈值（像素），低于此值视为点击 */
const DRAG_THRESHOLD = 4;

interface UseIslandDragOptions {
  shapeMode: IslandShapeMode;
  state: IslandState;
  positionLockedRef: React.MutableRefObject<boolean>;
}

interface UseIslandDragResult {
  /** 包裹 onClick，拖动时忽略点击 */
  wrapClick: (handler: () => void) => () => void;
}

/** 每次按下独立保存系统坐标，串行处理采样结果，避免旧拖动的异步响应移动窗口。 */
interface DragSession {
  position: Promise<Point | null>;
}

/**
 * 读取与窗口边界使用相同 DIP 单位的系统鼠标坐标。
 * @returns 系统鼠标位置；IPC 失败时返回 null 以中止手势。
 */
async function readMousePosition(): Promise<Point | null> {
  try {
    const position = await window.api.getMousePosition();
    return position;
  } catch {
    return null;
  }
}

/**
 * pill 模式下为灵动岛添加拖动能力。
 * @param options - 形态模式与当前状态。
 * @returns 包装后的点击处理函数。
 */
export function useIslandDrag(options: UseIslandDragOptions): UseIslandDragResult {
  const { shapeMode, state, positionLockedRef } = options;
  const isDraggingRef = useRef(false);
  const dragSessionRef = useRef<DragSession | null>(null);
  const hasMovedRef = useRef(false);

  /** 允许拖动的状态集合 */
  const draggable = shapeMode === 'pill' && (state === 'idle' || state === 'lyrics' || state === 'lyricsTranslation' || state === 'agentVoiceInput');

  useEffect(() => {
    if (!draggable) return;

    let animationFrameId: number | null = null;

    const cancelDrag = (): void => {
      isDraggingRef.current = false;
      dragSessionRef.current = null;
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    };

    const applyMovement = async (session: DragSession, position: Promise<Point | null>): Promise<Point | null> => {
      try {
        const [previous, current] = await Promise.all([session.position, position]);
        if (dragSessionRef.current !== session) return null;
        if (!previous || !current || positionLockedRef.current) {
          cancelDrag();
          return null;
        }
        const dx = current.x - previous.x;
        const dy = current.y - previous.y;
        if (!hasMovedRef.current && Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) {
          return previous;
        }
        hasMovedRef.current = true;
        if (dx !== 0 || dy !== 0) window.api.moveWindowDelta(dx, dy);
        return current;
      } catch {
        if (dragSessionRef.current === session) cancelDrag();
        return null;
      }
    };

    const flushPendingMovement = (): void => {
      animationFrameId = null;
      const session = dragSessionRef.current;
      if (!session) return;
      if (positionLockedRef.current) {
        cancelDrag();
        return;
      }

      // 收起和移动窗口时 DOM 屏幕坐标可能跳变；只使用主进程采样的系统 DIP 坐标。
      session.position = applyMovement(session, readMousePosition());
    };

    const scheduleDeltaFlush = (): void => {
      if (animationFrameId !== null) return;
      animationFrameId = requestAnimationFrame(flushPendingMovement);
    };

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button !== 0 || positionLockedRef.current) return;
      cancelDrag();
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragSessionRef.current = { position: readMousePosition() };
    };

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isDraggingRef.current) return;
      if (positionLockedRef.current || (e.buttons & 1) === 0) {
        cancelDrag();
        return;
      }
      scheduleDeltaFlush();
    };

    const handleMouseUp = (e: MouseEvent): void => {
      if (e.button !== 0) return;
      isDraggingRef.current = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        flushPendingMovement();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', cancelDrag);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', cancelDrag);
      cancelDrag();
      /** 形态模式切换（如 pill→notch）导致 draggable 变为 false 时，重置拖动标记以恢复点击 */
      hasMovedRef.current = false;
    };
  }, [draggable, positionLockedRef]);

  const wrapClick = useCallback((handler: () => void) => async () => {
    try {
      if (hasMovedRef.current) return;
      const session = dragSessionRef.current;
      if (!session) {
        handler();
        return;
      }
      // mouseup 的最后一次系统坐标采样完成后，再决定是否把本次手势作为点击。
      await session.position;
      if (dragSessionRef.current === session && !hasMovedRef.current) handler();
    } catch {
      // 失效的手势不再触发点击。
    }
  }, []);

  return { wrapClick };
}
