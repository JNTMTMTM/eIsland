/**
 * @file main.tsx
 * @description React 19 渲染进程入口，挂载根组件并初始化全局样式
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import DynamicIsland from './components/DynamicIsland';
import useIslandStore from './store/isLandStore';

const root = document.getElementById('root');
if (!root) {
  throw new Error('[Renderer] 未找到 #root 挂载节点');
}

/** 启动时自动获取精确位置并拉取天气 */
useIslandStore.getState().fetchWeatherData();

/**
 * 挂载 React 根组件，启动灵动岛 UI
 * @description 使用 StrictMode 捕获潜在问题，生产环境无额外影响
 */
createRoot(root).render(
  <StrictMode>
    <DynamicIsland />
  </StrictMode>
);
