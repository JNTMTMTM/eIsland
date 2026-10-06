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
 * @file Game2048Information.tsx
 * @description 展示 2048 成绩并调用重开句柄。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { Game2048InformationProps } from '../types';
import { formatDuration } from '../utils/formatDuration';

/**
 * 展示 2048 成绩并调用重开句柄。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.ranking - 2048 快照、排行数据和异步事件。
 * @returns 与原页面一致的展示元素。
 */
export function Game2048Information({ t, ranking }: Game2048InformationProps): ReactElement {
  const { myScore, gameState, handleStartNewGame } = ranking;

  return (
    <div className="mg-section mg-section-top-score">
      <div className="g2048-score-row g2048-score-cards">
        <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.game2048.score')}</span><span className="g2048-score-val">{gameState.score}</span></div>
        <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.highScore')}</span><span className="g2048-score-val">{myScore?.highScore?.toLocaleString() ?? '--'}</span></div>
        <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.duration')}</span><span className="g2048-score-val">{myScore?.bestDurationMs !== null && myScore?.bestDurationMs !== undefined ? formatDuration(myScore.bestDurationMs) : '--'}</span></div>
        <div className="g2048-score-box"><span className="g2048-score-label">{t('miniGameTab.moves')}</span><span className="g2048-score-val">{myScore?.bestMoves !== null && myScore?.bestMoves !== undefined ? myScore.bestMoves : '--'}</span></div>
      </div>
      <button className="g2048-new-btn g2048-new-btn-block" type="button" onClick={handleStartNewGame}>{t('miniGameTab.game2048.newGame')}</button>
    </div>
  );
}
