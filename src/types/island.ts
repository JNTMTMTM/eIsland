/**
 * @file island.ts
 * @description 灵动岛状态和内容的类型定义，包括视图状态、动画配置
 * @author 鸡哥
 */

export type IslandView = 'compact' | 'expanded' | 'minimal';

export interface IslandState {
  view: IslandView;
  expanded: boolean;
  height: number;
  width: number;
  position: {
    x: number;
    y: number;
  };
  opacity: number;
  content: IslandContent | null;
}

export interface IslandContent {
  type: 'notification' | 'music' | 'timer' | 'weather' | 'custom';
  title: string;
  subtitle?: string;
  icon?: string;
  actions?: Array<{
    id: string;
    label: string;
    icon?: string;
    onClick: () => void;
  }>;
}

export interface IslandAnimationConfig {
  duration: number;
  easing: 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  transform: {
    scale?: number;
    translateX?: number;
    translateY?: number;
  };
}
