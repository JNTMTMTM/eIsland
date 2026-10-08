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
 * @file maxExpandContentEager.test.tsx
 * @description MaxExpandContentEager 的真实渲染分支、用户交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { MaxExpandContentEager as Component } from '../MaxExpandContentEager';
import { MaxExpandContentShell } from '../MaxExpandContentShell';
import { AiChatTab } from '../components/agent/components/AiChatTab';
import { TodoTab } from '../components/todo/components/TodoTab';
import { UrlFavoritesTab } from '../components/urlFavorites';
import { LocalFileSearchTab } from '../components/localFileSearch/components/LocalFileSearchTab';
import { ClipboardHistoryTab } from '../components/clipBoardHistory';
import { AlbumTab } from '../components/album/components/AlbumTab';
import { MailTab } from '../components/mail';
import { MemoTab } from '../components/memo/components/MemoTab';
import { CountdownTab } from '../components/countdown';
import { AlarmTab } from '../components/alarm/components/AlarmTab';
import { ToolboxTab } from '../components/toolbox';
import { MiniGameTab } from '../components/miniGame';
import { StockTab } from '../components/stock';
import { CliTab } from '../components/cli';
import { CalculatorTab } from '../components/calculator';
import { WorldClockTab } from '../components/worldClock';
import { CalendarTab } from '../components/calendar';
import { SettingsTab } from '../components/setting';
import { render, value } from './componentHarness';
vi.mock('../components/agent/components/AiChatTab', () => ({ AiChatTab: () => null }));
vi.mock('../components/todo/components/TodoTab', () => ({ TodoTab: () => null }));
vi.mock('../components/urlFavorites', () => ({ UrlFavoritesTab: () => null }));
vi.mock('../components/localFileSearch/components/LocalFileSearchTab', () => ({ LocalFileSearchTab: () => null }));
vi.mock('../components/clipBoardHistory', () => ({ ClipboardHistoryTab: () => null }));
vi.mock('../components/album/components/AlbumTab', () => ({ AlbumTab: () => null }));
vi.mock('../components/mail', () => ({ MailTab: () => null }));
vi.mock('../components/memo/components/MemoTab', () => ({ MemoTab: () => null }));
vi.mock('../components/countdown', () => ({ CountdownTab: () => null }));
vi.mock('../components/alarm/components/AlarmTab', () => ({ AlarmTab: () => null }));
vi.mock('../components/toolbox', () => ({ ToolboxTab: () => null }));
vi.mock('../components/miniGame', () => ({ MiniGameTab: () => null }));
vi.mock('../components/stock', () => ({ StockTab: () => null }));
vi.mock('../components/cli', () => ({ CliTab: () => null }));
vi.mock('../components/calculator', () => ({ CalculatorTab: () => null }));
vi.mock('../components/worldClock', () => ({ WorldClockTab: () => null }));
vi.mock('../components/calendar', () => ({ CalendarTab: () => null }));
vi.mock('../components/setting', () => ({ SettingsTab: () => null }));
describe('MaxExpandContentEager', () => {
  const cases = [['aiChat', AiChatTab], ['todo', TodoTab], ['urlFavorites', UrlFavoritesTab], ['localFileSearch', LocalFileSearchTab], ['clipboardHistory', ClipboardHistoryTab], ['album', AlbumTab], ['mail', MailTab], ['memo', MemoTab], ['countdown', CountdownTab], ['alarm', AlarmTab], ['toolbox', ToolboxTab], ['miniGame', MiniGameTab], ['stock', StockTab], ['cli', CliTab], ['calculator', CalculatorTab], ['worldClock', WorldClockTab], ['calendar', CalendarTab], ['settings', SettingsTab]] as const;
  it.each(cases)('renders the real routing branch for %s', (tab, child) => {
    const tree = render(Component);
    const renderActiveTab = value(tree, MaxExpandContentShell, 'renderActiveTab') as (tab: string, fallback: ReactElement, ready: boolean) => ReactElement | null;
    const fallback = createElement('span', {}, 'Loading');
    expect(renderActiveTab(tab, fallback, false)).toBe(fallback);
    expect(renderActiveTab(tab, fallback, true)?.type).toBe(child);
    expect(renderActiveTab('unknown', fallback, true)).toBeNull();
    expect(value(tree, MaxExpandContentShell, 'deferContent')).toBe(false);
  });
});

vi.mock('../MaxExpandContentShell', () => ({ MaxExpandContentShell: () => null }));
