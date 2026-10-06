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
 * @file MiniGameGamePanel.tsx
 * @description 组合游戏棋盘、对局信息和账号排行榜面板。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MiniGameGamePanelProps } from '../types';
import { Game2048 } from '../../games/Game2048';
import { GameGomoku } from '../../games/GameGomoku';
import { GAME_LIST, MINI_GAME_GOMOKU_STATE_STORE_KEY } from '../config/miniGameConfig';
import { isRankedGame } from '../utils/leaderboardIdentity';
import { Game2048Information } from './Game2048Information';
import { GomokuInformation } from './GomokuInformation';
import { MiniGameLeaderboard } from './MiniGameLeaderboard';

/**
 * 组合游戏棋盘、对局信息和账号排行榜面板。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 导航状态和事件入口。
 * @param props.gomoku - 五子棋快照、设置和控制句柄。
 * @param props.ranking - 2048 快照、排行数据和异步事件。
 * @param props.setLogin - 进入登录页面。
 * @param props.setRegister - 进入注册页面。
 * @returns 与原页面一致的展示元素。
 */
export function MiniGameGamePanel({ t, navigation, gomoku, ranking, setLogin, setRegister }: MiniGameGamePanelProps): ReactElement {
  const { selectedGame } = navigation;
  const { gomokuRef, gomokuState, gomokuMode, gomokuDifficulty, gomokuHighlightPulse, handleGomokuStateChange, gomokuDraw } = gomoku;
  const { activeSession, gameRef, handleGameEnd, handleGameState } = ranking;
  const selectedEntry = GAME_LIST.find((g) => g.id === selectedGame);
  const game2048Available = selectedEntry?.available && selectedGame === '2048';
  const gomokuAvailable = selectedEntry?.available && selectedGame === 'gomoku';
  const showRankedPanel = isRankedGame(selectedGame);
  const gomokuResultOverlayText = gomokuState.winner === 1
    ? (gomokuMode === 'pve' ? t('miniGameTab.gomoku.victory', { defaultValue: '胜利' }) : t('miniGameTab.gomoku.winnerBlack'))
    : gomokuState.winner === 2
      ? (gomokuMode === 'pve' ? t('miniGameTab.gomoku.defeat', { defaultValue: '失败' }) : t('miniGameTab.gomoku.winnerWhite'))
      : gomokuDraw
        ? t('miniGameTab.gomoku.draw')
        : null;
  return (
    <div className={`mg-panel-body mg-panel-game-layout${gomokuAvailable ? ' mg-panel-gomoku' : ''}`}>
    {/* 游戏棋盘（纯净，无上下控件） */}
    {game2048Available && (
      <div className="mg-game-area">
        <Game2048 ref={gameRef} onGameEnd={handleGameEnd} onStateChange={handleGameState} activeSession={activeSession} />
      </div>
    )}
    {gomokuAvailable && (
      <div className="mg-game-area">
        <GameGomoku
          ref={gomokuRef}
          storageKey={MINI_GAME_GOMOKU_STATE_STORE_KEY}
          aiDifficulty={gomokuMode === 'pve' ? gomokuDifficulty : undefined}
          highlightMove={gomokuState.lastMove}
          highlightPulse={gomokuHighlightPulse}
          resultOverlayText={gomokuResultOverlayText}
          onStateChange={handleGomokuStateChange}
          boardAriaLabel={t('miniGameTab.gomoku.boardAria')}
          getCellAriaLabel={(row, col) => t('miniGameTab.gomoku.cellAria', { row, col })}
        />
      </div>
    )}

    {/* 右侧信息面板 */}
    <div className="mg-info-sidebar">
      {/* 游戏说明 + 分数 + 新游戏（同行） */}
      {game2048Available && <Game2048Information t={t} ranking={ranking} />}

      {gomokuAvailable && <GomokuInformation t={t} gomoku={gomoku} />}

      <MiniGameLeaderboard t={t} ranking={ranking} setLogin={setLogin} setRegister={setRegister} showRankedPanel={showRankedPanel} />
    </div>
  </div>
  );
}
