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
 * @file useUrlFavoritesDnd.ts
 * @description URL 收藏拖拽排序 hook：拖拽状态管理与列表重排。
 * @author 鸡哥
 */

import { useRef, useState } from 'react';
import type { Dispatch, DragEvent, RefObject, SetStateAction } from 'react';
import type { UrlFavoriteItem } from '../types/urlFavoritesTypes';

/** useUrlFavoritesDnd 返回值 */
export interface UseUrlFavoritesDndReturn {
  draggingId: number | null;
  dragOverId: number | null;
  dragMovedRef: RefObject<boolean>;
  handleDragStart: (e: DragEvent<HTMLButtonElement>, id: number) => void;
  handleDragOver: (e: DragEvent<HTMLDivElement>, id: number) => void;
  handleDrop: (e: DragEvent<HTMLDivElement>, id: number) => void;
  resetDragState: () => void;
}

/**
 * URL 收藏拖拽排序 hook
 * @param setFavorites - favorites setter
 * @returns 拖拽状态与处理函数
 */
export function useUrlFavoritesDnd(
  setFavorites: Dispatch<SetStateAction<UrlFavoriteItem[]>>,
): UseUrlFavoritesDndReturn {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const dragFromIdRef = useRef<number | null>(null);
  const dragMovedRef = useRef(false);

  const resetDragState = (): void => {
    dragFromIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, id: number): void => {
    dragFromIdRef.current = id;
    dragMovedRef.current = false;
    setDraggingId(id);
    setDragOverId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, id: number): void => {
    if (dragFromIdRef.current === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragFromIdRef.current !== id) dragMovedRef.current = true;
    setDragOverId(id);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, id: number): void => {
    e.preventDefault();
    const fromId = dragFromIdRef.current;
    if (fromId === null || fromId === id) {
      resetDragState();
      return;
    }

    setFavorites((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === id);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    resetDragState();
  };

  return {
    draggingId,
    dragOverId,
    dragMovedRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    resetDragState,
  };
}
