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
 * @file MiniGameTab.tsx
 * @description 组合小游戏导航、对局展示和排行榜模块。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useIslandStore } from '../../../../../../store/index';
import { GAME_LIST } from '../config/miniGameConfig';
import { useMiniGameNavigation } from '../hooks/useMiniGameNavigation';
import { useMiniGameGomoku } from '../hooks/useMiniGameGomoku';
import { useMiniGameLeaderboard } from '../hooks/useMiniGameLeaderboard';
import { MiniGameSidebar } from './MiniGameSidebar';
import { MiniGameIndex } from './MiniGameIndex';
import { MiniGameGamePanel } from './MiniGameGamePanel';

/**
 * 渲染小游戏页面，页面层只组合模块。
 * @returns 小游戏导航或选中的对局页面。
 */
export function MiniGameTab(): ReactElement {
  const { t, i18n } = useTranslation();
  const { setLogin, setRegister } = useIslandStore();
  const navigation = useMiniGameNavigation(t, i18n);
  const gomoku = useMiniGameGomoku();
  const ranking = useMiniGameLeaderboard(navigation.selectedGame, t);
  const { selectedGame, activeSidebar } = navigation;
  const selectedEntry = GAME_LIST.find((g) => g.id === selectedGame);
  const selectedGameHintKey = selectedGame === '2048'
    ? 'miniGameTab.game2048.hint'
    : selectedGame === 'gomoku' ? 'miniGameTab.gomoku.hint' : null;

  return (
    <div className="max-expand-settings toolbox-tab-container">
      <div className="max-expand-settings-layout">
        {/* 侧栏：快速导航 + 游戏列表 */}
        <MiniGameSidebar t={t} navigation={navigation} />

        {/* 主面板 */}
        <div className="max-expand-settings-panel settings-scrollbar-thin">
          {activeSidebar !== 'index' && (
            <div className="max-expand-settings-title settings-app-title-line">
              <span>{selectedEntry ? t(selectedEntry.labelKey, { defaultValue: selectedEntry.id }) : ''}</span>
              {selectedEntry?.available && selectedGameHintKey && (
                <span className="settings-app-title-sub mg-main-title-subtitle"> - {t(selectedGameHintKey)}</span>
              )}
              {selectedEntry && !selectedEntry.available && (
                <span className="mg-badge-coming-soon">{t('miniGameTab.comingSoon')}</span>
              )}
            </div>
          )}

          {activeSidebar === 'index' && <MiniGameIndex t={t} navigation={navigation} />}

          {activeSidebar !== 'index' && <MiniGameGamePanel t={t} navigation={navigation} gomoku={gomoku} ranking={ranking} setLogin={setLogin} setRegister={setRegister} />}
        </div>
      </div>
    </div>
  );
}
