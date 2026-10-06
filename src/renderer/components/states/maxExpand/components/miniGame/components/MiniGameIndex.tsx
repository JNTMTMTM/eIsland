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
 * @file MiniGameIndex.tsx
 * @description 展示可排序、隐藏和搜索的小游戏导航。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MiniGameIndexProps } from '../types';

/**
 * 展示可排序、隐藏和搜索的小游戏导航。
 * @param props - 页面展示数据与原有事件入口。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 导航状态和事件入口。
 * @returns 与原页面一致的展示元素。
 */
export function MiniGameIndex({ t, navigation }: MiniGameIndexProps): ReactElement {
  const { navOrder, setNavOrder, hiddenNavOrder, setHiddenNavOrder, navEditMode, setNavEditMode, dragOverIdx, setDragOverIdx, dragIdxRef, searchQuery, setSearchQuery, visibleCards, hiddenCards, searchResults, persistMiniGameNavConfig, resetMiniGameNavConfig, navigateByCard } = navigation;

  return (
    <div className="max-expand-settings-section settings-index-section">
      <div className="settings-index-header">
        <div className="max-expand-settings-title">
          {t('miniGameTab.index.title')}
          <button className="settings-nav-edit-btn" type="button" onClick={resetMiniGameNavConfig}>
            {t('miniGameTab.index.reset')}
          </button>
          <button
            className={`settings-nav-edit-btn ${navEditMode ? 'active' : ''}`}
            type="button"
            onClick={() => {
              if (navEditMode) {
                persistMiniGameNavConfig(navOrder, hiddenNavOrder);
              }
              setNavEditMode(!navEditMode);
            }}
          >
            {navEditMode ? t('miniGameTab.index.done') : t('miniGameTab.index.edit')}
          </button>
          <div className="settings-index-search-wrap">
            <span className="settings-index-search-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              className="settings-index-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('miniGameTab.index.searchPlaceholder')}
            />
            {searchQuery && (
              <button
                className="settings-index-search-clear"
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('miniGameTab.index.searchClear')}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
            {searchResults && (
              <div className="settings-index-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="settings-index-search-dropdown-empty">{t('miniGameTab.index.searchEmpty')}</div>
                ) : (
                  searchResults.map((card) => (
                    <button
                      key={card.id}
                      className="settings-index-search-dropdown-item"
                      type="button"
                      onClick={() => {
                        navigateByCard(card.id);
                        setSearchQuery('');
                      }}
                    >
                      <div className="settings-index-search-dropdown-text">
                        <span className="settings-index-search-dropdown-title">{card.localizedLabel}</span>
                        <span className="settings-index-search-dropdown-desc">{card.localizedDesc}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="settings-music-hint settings-index-hint">
          {navEditMode
            ? t('miniGameTab.index.hintEdit')
            : t('miniGameTab.index.hintView')}
        </div>
      </div>
      <div className="settings-index-cards" aria-label={t('miniGameTab.index.ariaNav')}>
        {visibleCards.map((card, idx) => (
          navEditMode ? (
            <div
              key={card.id}
              className={`settings-index-card editing${dragOverIdx === idx ? ' drag-over' : ''}`}
              draggable
              onDragStart={(e) => {
                dragIdxRef.current = idx;
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIdx(idx);
              }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverIdx(null);
                const from = dragIdxRef.current;
                if (from === null || from === idx) return;
                const nextOrder = visibleCards.map((item) => item.id);
                const [moved] = nextOrder.splice(from, 1);
                nextOrder.splice(idx, 0, moved);
                setNavOrder(nextOrder);
              }}
              onDragEnd={() => {
                dragIdxRef.current = null;
                setDragOverIdx(null);
              }}
            >
              <span className="settings-index-card-drag-handle">⠿</span>
              <button
                className="settings-index-card-remove"
                type="button"
                onClick={() => {
                  const nextVisible = navOrder.filter((id) => id !== card.id);
                  const nextHidden = hiddenNavOrder.includes(card.id)
                    ? hiddenNavOrder
                    : [...hiddenNavOrder, card.id];
                  setNavOrder(nextVisible);
                  setHiddenNavOrder(nextHidden);
                }}
                aria-label={t('miniGameTab.index.removeCard', { label: t(card.labelKey) })}
              >
                −
              </button>
              <span className="settings-index-card-title">{t(card.labelKey)}</span>
              <span className="settings-index-card-desc">{t(card.descKey)}</span>
            </div>
          ) : (
            <button
              key={card.id}
              className="settings-index-card"
              type="button"
              onClick={() => navigateByCard(card.id)}
            >
              <span className="settings-index-card-title">{t(card.labelKey)}</span>
              <span className="settings-index-card-desc">{t(card.descKey)}</span>
            </button>
          )
        ))}
      </div>
      {navEditMode && (
        <div className="settings-nav-add-panel" aria-label={t('miniGameTab.index.ariaAddPanel')}>
          <div className="settings-music-label">{t('miniGameTab.index.addableTitle')}</div>
          {hiddenCards.length === 0 ? (
            <div className="settings-music-hint">{t('miniGameTab.index.emptyAddable')}</div>
          ) : (
            <div className="settings-nav-add-list">
              {hiddenCards.map((card) => (
                <button
                  key={card.id}
                  className="settings-nav-add-item"
                  type="button"
                  onClick={() => {
                    const nextVisible = navOrder.includes(card.id)
                      ? navOrder
                      : [...navOrder, card.id];
                    const nextHidden = hiddenNavOrder.filter((id) => id !== card.id);
                    setNavOrder(nextVisible);
                    setHiddenNavOrder(nextHidden);
                  }}
                >
                  <span>{t(card.labelKey)}</span>
                  <span className="settings-nav-add-plus">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
