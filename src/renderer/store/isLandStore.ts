/**
 * @file isLandStore.ts
 * @description 灵动岛状态管理模块，使用 Zustand 管理 hover 与待机状态
 * @author 鸡哥
 */

import { create } from 'zustand';

/**
 * 灵动岛 UI 状态枚举
 * - idle: 待机状态，灵动岛静默显示
 * - hover: 悬停状态，展示额外信息或图标
 */
export type IslandState = 'idle' | 'hover';

/** 灵动岛 Store 接口定义 */
interface IIslandStore {
  /** 当前状态 */
  state: IslandState;
  /** 切换到待机状态 */
  setIdle: () => void;
  /** 切换到悬停状态 */
  setHover: () => void;
}

/**
 * 灵动岛状态管理 Store
 * 使用 zustand 管理状态变更，无需 Redux 的模板代码
 */
const useIslandStore = create<IIslandStore>((set) => ({
  state: 'idle',
  setIdle: (): void => set({ state: 'idle' }),
  setHover: (): void => set({ state: 'hover' })
}));

export default useIslandStore;
