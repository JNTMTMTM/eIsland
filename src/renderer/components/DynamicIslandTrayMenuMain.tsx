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
 * @file DynamicIslandTrayMenuMain.tsx
 * @description 自绘托盘菜单渲染入口，菜单组件与样式位于 components/DynamicIslandTrayMenu 模块
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/reset/reset.css';
import i18n from '../i18n';
import { initTheme } from '../utils/theme';
import { TrayMenu } from './components/DynamicIslandTrayMenu';

const root = document.getElementById('root');
if (!root) {
  throw new Error(`[TrayMenuRenderer] ${i18n.t('common.errors.rootMountNotFound', { defaultValue: '未找到 #root 挂载节点' })}`);
}
const rootEl = root;

/** 先应用主题再挂载，避免菜单首次弹出时闪现默认配色。 */
async function bootstrap(): Promise<void> {
  await initTheme();
  createRoot(rootEl).render(
    <StrictMode>
      <TrayMenu />
    </StrictMode>
  );
}

void bootstrap();
