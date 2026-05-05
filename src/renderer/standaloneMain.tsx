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
 * @file standaloneMain.tsx
 * @description 独立窗口渲染入口
 * @author 鸡哥
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './styles/settings/settings.css';
import './styles/standalone-window.css';
import { StandaloneWindow } from './components/StandaloneWindow';
import { initTheme } from './utils/theme';
import { bootstrapAuthSession } from './utils/authSession';
import useIslandStore from './store/slices';
import type { NowPlayingInfo } from './store/types';
import './i18n';

const root = document.getElementById('root');
if (!root) {
  throw new Error('[StandaloneRenderer] 未找到 #root 挂载节点');
}
const rootEl = root;

async function bootstrap(): Promise<void> {
  await initTheme();
  await bootstrapAuthSession();

  const handleNowPlayingUpdate = useIslandStore.getState().handleNowPlayingUpdate;
  const initialInfo = await window.api.mediaCurrentInfoGet().catch(() => null);
  handleNowPlayingUpdate(initialInfo as NowPlayingInfo | null);
  window.api.onNowPlayingInfo((info: NowPlayingInfo | null) => {
    handleNowPlayingUpdate(info);
  });

  createRoot(rootEl).render(
    <StrictMode>
      <StandaloneWindow />
    </StrictMode>
  );
}

void bootstrap();
