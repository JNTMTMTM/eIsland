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
 * @description React 渲染入口，国际化与界面组合不依赖 Node 或主进程模块。
 * @author 鸡哥
 */
import { createRoot } from 'react-dom/client';
import './locales/i18n';
import AdapterWizard from './modules/migration';
let App = AdapterWizard;
if (import.meta.env.DEV && import.meta.env.MODE === 'local-preview') {
  const { localPreview } = await import('./local/localPreview');
  window.migration = localPreview.api;
  App = (await import('./local/localApp')).default;
}
createRoot(document.getElementById('root')!).render(<App />);
