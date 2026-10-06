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
 * @file GomokuInformation.tsx
 * @description 展示五子棋状态、对战设置及重开和高亮操作。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { GomokuInformationProps } from '../types';
import { type GomokuAIDifficulty } from '../../games/GameGomoku';

/**
 * 展示五子棋状态、对战设置及重开和高亮操作。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.gomoku - 五子棋快照、设置和控制句柄。
 * @returns 与原页面一致的展示元素。
 */
export function GomokuInformation({ t, gomoku }: GomokuInformationProps): ReactElement {
  const { gomokuRef, gomokuState, gomokuMode, setGomokuMode, gomokuDifficulty, setGomokuDifficulty, handleStartGomoku, handleHighlightLastGomokuMove, gomokuDraw, gomokuSettingsLocked } = gomoku;
  const gomokuStatusText = (gomokuMode === 'pve' && gomokuState.turn === 2 && gomokuState.aiThinking && gomokuState.winner === 0)
    ? t('miniGameTab.gomoku.thinking', { defaultValue: '正在思考' })
    : gomokuState.winner === 1
    ? t('miniGameTab.gomoku.winnerBlack')
    : gomokuState.winner === 2
      ? t('miniGameTab.gomoku.winnerWhite')
      : gomokuDraw
        ? t('miniGameTab.gomoku.draw')
        : gomokuState.turn === 1
          ? t('miniGameTab.gomoku.turnBlack')
          : t('miniGameTab.gomoku.turnWhite');
  return (
    <div className="mg-section mg-section-top-score">
      <div className="g2048-score-row">
        <div className="g2048-score-box gomoku-status-box">
          <span className="g2048-score-label">{t('miniGameTab.gomoku.status')}</span>
          <span className="g2048-score-val">{gomokuStatusText}</span>
        </div>
      </div>
      <div className="g2048-score-row g2048-score-box gomoku-status-box">
        <span className="g2048-score-label">{t('miniGameTab.gomoku.mode', { defaultValue: '对战模式' })}</span>
        <div className="settings-card-inline-row">
          <label className="settings-card-check">
            <input
              type="radio"
              name="gomoku-match-mode"
              checked={gomokuMode === 'pve'}
              disabled={gomokuSettingsLocked}
              onChange={() => {
                setGomokuMode('pve');
                gomokuRef.current?.restart();
              }}
            />
            {t('miniGameTab.gomoku.modePve', { defaultValue: '人机对战' })}
          </label>
          <label className="settings-card-check">
            <input
              type="radio"
              name="gomoku-match-mode"
              checked={gomokuMode === 'pvp'}
              disabled={gomokuSettingsLocked}
              onChange={() => {
                setGomokuMode('pvp');
                gomokuRef.current?.restart();
              }}
            />
            {t('miniGameTab.gomoku.modePvp', { defaultValue: '人人对战' })}
          </label>
        </div>
      </div>
      {gomokuMode === 'pve' && (
        <div className="g2048-score-row">
          <div className="g2048-score-box gomoku-status-box">
          <span className="g2048-score-label">{t('miniGameTab.gomoku.difficulty', { defaultValue: '选择对局难度' })}</span>
          <select
            className="gomoku-difficulty-select"
            value={gomokuDifficulty}
            disabled={gomokuSettingsLocked}
            onChange={(event) => {
              const raw = event.target.value;
              const nextDifficulty: GomokuAIDifficulty = raw === 'master'
                ? 'master'
                : raw === 'expert'
                  ? 'expert'
                  : raw === 'hard'
                    ? 'hard'
                    : raw === 'easy'
                      ? 'easy'
                      : 'novice';
              setGomokuDifficulty(nextDifficulty);
              gomokuRef.current?.restart();
            }}
          >
            <option value="novice">{t('miniGameTab.gomoku.difficultyNovice', { defaultValue: '新手' })}</option>
            <option value="easy">{t('miniGameTab.gomoku.difficultyEasy', { defaultValue: '简单' })}</option>
            <option value="hard">{t('miniGameTab.gomoku.difficultyHard', { defaultValue: '困难' })}</option>
            <option value="expert">{t('miniGameTab.gomoku.difficultyExpert', { defaultValue: '专家' })}</option>
            <option value="master">{t('miniGameTab.gomoku.difficultyMaster', { defaultValue: '大师' })}</option>
          </select>
        </div>
        </div>
      )}
      <button className="g2048-new-btn g2048-new-btn-block" type="button" onClick={handleStartGomoku}>{t('miniGameTab.gomoku.restart')}</button>
      <button
        className="g2048-new-btn g2048-new-btn-block"
        type="button"
        onClick={handleHighlightLastGomokuMove}
        disabled={!gomokuState.lastMove}
      >
        {t('miniGameTab.gomoku.highlightLastMove', { defaultValue: '高亮上一手' })}
      </button>
      <div className="mg-empty-hint gomoku-unranked-hint">{t('miniGameTab.gomoku.unrankedHint')}</div>
    </div>
  );
}
