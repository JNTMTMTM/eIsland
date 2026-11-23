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
 * @description 将 Explorer 组件挂载到独立页面。
 * @author 鸡哥
 */
import { createRoot } from 'react-dom/client';
import '../../../i18n';
import '../../../styles/reset/reset.css';
import { initFonts } from '../../../utils/font';
import { initTheme } from '../../../utils/theme';
import ExplorerWindow from './index';

const root = document.getElementById('root');
if (root) {
  // eslint-disable-next-line promise/prefer-await-to-then -- 外观设置与窗口加载并行。
  Promise.all([initTheme(), initFonts()]).catch(console.error);
  createRoot(root).render(<ExplorerWindow />);
}
