/**
 * @file useIslandStore.ts
 * @description 灵动岛 Zustand 状态管理 store，管理展开状态、尺寸、透明度、内容
 * @author 鸡哥
 */

import { create } from 'zustand';
import type { IslandState, IslandContent, IslandView } from '../types/island';

interface IslandStore extends IslandState {
  setView: (view: IslandView) => void;
  setExpanded: (expanded: boolean) => void;
  setHeight: (height: number) => void;
  setWidth: (width: number) => void;
  setPosition: (x: number, y: number) => void;
  setOpacity: (opacity: number) => void;
  setContent: (content: IslandContent | null) => void;
  clearContent: () => void;
  reset: () => void;
}

const initialState: IslandState = {
  view: 'compact',
  expanded: false,
  height: 80,
  width: 300,
  position: { x: 0, y: 0 },
  opacity: 1,
  content: null,
};

/**
 * 灵动岛状态管理 Hook，提供展开状态、尺寸、透明度及内容管理方法
 */
export const useIslandStore = create<IslandStore>((set) => ({
  ...initialState,

  setView: (view) => set({ view }),

  setExpanded: (expanded) => set({ expanded }),

  setHeight: (height) => set({ height }),

  setWidth: (width) => set({ width }),

  setPosition: (x, y) => set({ position: { x, y } }),

  setOpacity: (opacity) => set({ opacity: Math.max(0.1, Math.min(1, opacity)) }),

  setContent: (content) => set({ content }),

  clearContent: () => set({ content: null, view: 'compact', expanded: false }),

  reset: () => set(initialState),
}));
