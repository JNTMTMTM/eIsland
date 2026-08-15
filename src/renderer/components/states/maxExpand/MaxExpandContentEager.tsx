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
 * @file MaxExpandContentEager.tsx
 * @description MaxExpand 非性能模式（旧版一次性加载）内容实现。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MaxExpandTab } from '../../../store/types';
import { MaxExpandContentShell } from './MaxExpandContentShell';
import { AiChatTab } from './components/agent/components/AiChatTab';
import { TodoTab } from './components/todo/components/TodoTab';
import { UrlFavoritesTab } from './components/urlFavorites';
import { LocalFileSearchTab } from './components/localFileSearch/components/LocalFileSearchTab';
import { ClipboardHistoryTab } from './components/clipBoardHistory';
import { AlbumTab } from './components/album/components/AlbumTab';
import { MailTab } from './components/mail';
import { SettingsTab } from './components/SettingsTab';
import { CountdownTab } from './components/countdown';
import { MemoTab } from './components/memo/components/MemoTab';
import { AlarmTab } from './components/alarm/components/AlarmTab';
import { ToolboxTab } from './components/ToolboxTab';
import { MiniGameTab } from './components/MiniGameTab';
import { StockTab } from './components/stock';
import { CliTab } from './components/cli';
import { CalculatorTab } from './components/calculator';

function renderEagerActiveTab(activeTab: MaxExpandTab, loadingFallback: ReactElement, contentReady: boolean): ReactElement | null {
  if (!contentReady) return loadingFallback;
  if (activeTab === 'aiChat') return <AiChatTab />;
  if (activeTab === 'todo') return <TodoTab />;
  if (activeTab === 'urlFavorites') return <UrlFavoritesTab />;
  if (activeTab === 'localFileSearch') return <LocalFileSearchTab />;
  if (activeTab === 'clipboardHistory') return <ClipboardHistoryTab />;
  if (activeTab === 'album') return <AlbumTab />;
  if (activeTab === 'mail') return <MailTab />;
  if (activeTab === 'memo') return <MemoTab />;
  if (activeTab === 'countdown') return <CountdownTab />;
  if (activeTab === 'alarm') return <AlarmTab />;
  if (activeTab === 'toolbox') return <ToolboxTab />;
  if (activeTab === 'miniGame') return <MiniGameTab />;
  if (activeTab === 'stock') return <StockTab />;
  if (activeTab === 'cli') return <CliTab />;
  if (activeTab === 'calculator') return <CalculatorTab />;
  if (activeTab === 'settings') return <SettingsTab />;
  return null;
}

/**
 * 渲染 MaxExpand 的旧版一次性加载内容（非性能模式）。
 */
export function MaxExpandContentEager(): ReactElement {
  return <MaxExpandContentShell renderActiveTab={renderEagerActiveTab} deferContent={false} />;
}
