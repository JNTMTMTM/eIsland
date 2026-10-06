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
 * @file MiniGameLeaderboard.tsx
 * @description 展示账号入口、排行加载态、成绩和刷新错误。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MiniGameLeaderboardProps } from '../types';
import { SvgIcon } from '../../../../../../utils/SvgIcon';

/**
 * 展示账号入口、排行加载态、成绩和刷新错误。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.ranking - 2048 快照、排行数据和异步事件。
 * @param props.setLogin - 进入登录页面。
 * @param props.setRegister - 进入注册页面。
 * @param props.showRankedPanel - 是否显示支持排名的游戏面板。
 * @returns 与原页面一致的展示元素。
 */
export function MiniGameLeaderboard({ t, ranking, setLogin, setRegister, showRankedPanel }: MiniGameLeaderboardProps): ReactElement {
  const { loggedIn, leaderboard, loading, error, myRank, resolveEntryName, resolveEntryAvatar, handleRefresh } = ranking;

  return (
    <>
      {/* 未登录提示 */}
      {showRankedPanel && !loggedIn && (
        <div className="settings-user-auth">
          <div className="settings-user-auth-entry-title">
            {t('miniGameTab.auth.entryTitle')}
          </div>
          <div className="settings-user-auth-entry-actions">
            <button type="button" className="settings-user-primary-btn" onClick={() => setLogin()}>
              {t('miniGameTab.auth.gotoLogin')}
            </button>
            <button type="button" className="settings-user-secondary-btn" onClick={() => setRegister()}>
              {t('miniGameTab.auth.gotoRegister')}
            </button>
          </div>
          <div className="settings-user-auth-hint">
            {t('miniGameTab.auth.hint')}
          </div>
        </div>
      )}

      {/* 加载态 */}
      {showRankedPanel && loggedIn && loading && (
        <div className="mg-notice">
          <span className="mg-notice-text">{t('miniGameTab.loading')}</span>
        </div>
      )}

      {/* 排行榜（始终显示） */}
      {showRankedPanel && loggedIn && !loading && (
        <div className="mg-section mg-section-scroll">
          <div className="mg-section-header">
            <div className="mg-section-title-wrap">
              <span className="mg-section-title">{t('miniGameTab.leaderboard')}</span>
              <button
                className="mg-refresh-btn mg-leaderboard-hint-btn"
                type="button"
                title={t('miniGameTab.leaderboardRestartHint')}
                aria-label={t('miniGameTab.leaderboardRestartHint')}
              >
                ?
              </button>
            </div>
            <div className="mg-section-header-actions">
              <span className="mg-my-rank">{t('miniGameTab.myRank')}: {myRank ?? t('miniGameTab.rankUnavailable')}</span>
              <button className="mg-refresh-btn" type="button" onClick={handleRefresh} title={t('miniGameTab.refresh')} aria-label={t('miniGameTab.refresh')} disabled={Boolean(error)}>
                <img className="mg-refresh-icon" src={SvgIcon.REVERT} alt="" aria-hidden="true" />
              </button>
            </div>
          </div>
          {error && (
            <div className="mg-refresh-error">
              <span className="mg-refresh-error-text">{error}</span>
            </div>
          )}
          {leaderboard.length > 0 ? (
            <div className="mg-leaderboard">
              <div className="mg-lb-header-row">
                <span className="mg-lb-rank">#</span>
                <span className="mg-lb-user">{t('miniGameTab.lbUser')}</span>
                <span className="mg-lb-score">{t('miniGameTab.lbScore')}</span>
              </div>
              {leaderboard.slice(0, 4).map((entry) => (
                <div key={entry.rank} className={`mg-lb-row ${entry.rank <= 3 ? 'mg-lb-top' : ''}${entry.isPro ? ' mg-lb-row-pro' : ''}`}>
                  <span className={`mg-lb-rank ${entry.rank <= 3 ? `mg-lb-rank-${entry.rank}` : ''}`}>{entry.rank}</span>
                  <span className="mg-lb-user">
                    <span className="mg-lb-user-meta">
                      {resolveEntryAvatar(entry)
                        ? <img className="mg-lb-user-avatar" src={resolveEntryAvatar(entry) ?? ''} alt={resolveEntryName(entry)} />
                        : <span className="mg-lb-user-avatar-placeholder">{resolveEntryName(entry).slice(0, 1)}</span>}
                      {entry.isPro ? <img className="mg-lb-pro-icon" src={SvgIcon.PRO} alt="PRO" /> : null}
                      <span className="mg-lb-user-name">{resolveEntryName(entry)}</span>
                    </span>
                  </span>
                  <span className="mg-lb-score">{entry.highScore.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mg-empty-hint">{t('miniGameTab.lbEmpty')}</div>
          )}
        </div>
      )}
    </>
  );
}
