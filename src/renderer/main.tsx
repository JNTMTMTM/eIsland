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
 * @file main.tsx
 * @description React 19 渲染进程入口，挂载根组件并初始化全局样式
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import DynamicIsland from './components/DynamicIsland';
import useIslandStore from './store/slices';
import { initTheme } from './utils/theme';

function applyIslandOpacity(opacity: number): void {
  const safe = Math.max(10, Math.min(100, Math.round(opacity)));
  document.documentElement.style.setProperty('--island-opacity', String(safe));
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('[Renderer] 未找到 #root 挂载节点');
}

/** 启动时初始化主题（读取持久化设置并应用 data-theme，在 React 挂载前执行避免闪烁） */
initTheme();

/** 启动时初始化灵动岛透明度（在 React 挂载前设置，避免首次渲染闪烁） */
window.api?.islandOpacityGet?.().then((val) => {
  applyIslandOpacity(typeof val === 'number' ? val : 100);
}).catch(() => {
  applyIslandOpacity(100);
});

/** 启动时拉取最新天气数据（内部流程：读缓存 → 获取定位 → 获取天气 → 写缓存） */
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
