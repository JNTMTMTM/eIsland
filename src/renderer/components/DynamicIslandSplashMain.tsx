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
 * @file DynamicIslandSplashMain.tsx
 * @description 启动画面 React 渲染入口
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/splash.css';
import i18n from '../i18n';
import { SplashScreen } from './SplashScreen';

const root = document.getElementById('root');
if (!root) {
  throw new Error(`[SplashRenderer] ${i18n.t('common.errors.rootMountNotFound', { defaultValue: '未找到 #root 挂载节点' })}`);
}

createRoot(root).render(
  <StrictMode>
    <SplashScreen />
  </StrictMode>
);
