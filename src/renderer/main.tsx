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

const root = document.getElementById('root');
if (!root) {
  throw new Error('[Renderer] 未找到 #root 挂载节点');
}

/** 先从本地存储加载缓存数据，确保首次渲染有内容可展示 */
const cachedWeather = useIslandStore.getState().weather;
const cachedLocation = useIslandStore.getState().location;
if (cachedWeather.description) {
  console.log('[Renderer] 启动时加载缓存天气数据:', cachedWeather);
}
if (cachedLocation) {
  console.log('[Renderer] 启动时加载缓存位置信息:', cachedLocation);
}

/** 立即从接口拉取最新天气数据（不读取本地缓存） */
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
