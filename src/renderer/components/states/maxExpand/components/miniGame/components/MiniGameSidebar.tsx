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
 * @file MiniGameSidebar.tsx
 * @description 展示小游戏侧栏并切换页面。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MiniGameSidebarProps } from '../types';
import { GAME_LIST } from '../config/miniGameConfig';

/**
 * 展示小游戏侧栏并切换页面。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 导航状态和事件入口。
 * @returns 与原页面一致的展示元素。
 */
export function MiniGameSidebar({ t, navigation }: MiniGameSidebarProps): ReactElement {
  const { setSelectedGame, activeSidebar, setActiveSidebar } = navigation;

  return (
    <div className="max-expand-settings-sidebar">
      <button
        className={`max-expand-settings-sidebar-item ${activeSidebar === 'index' ? 'active' : ''}`}
        onClick={() => setActiveSidebar('index')}
        type="button"
      >
        <span className="sidebar-dot" />
        {t('miniGameTab.sidebar.index')}
      </button>
      {GAME_LIST.map((game) => (
        <button
          key={game.id}
          className={`max-expand-settings-sidebar-item ${activeSidebar === game.id ? 'active' : ''}`}
          onClick={() => {
            setSelectedGame(game.id);
            setActiveSidebar(game.id);
          }}
          type="button"
        >
          <span className="sidebar-dot" />
          {t(game.labelKey, { defaultValue: game.id })}
        </button>
      ))}
    </div>
  );
}
