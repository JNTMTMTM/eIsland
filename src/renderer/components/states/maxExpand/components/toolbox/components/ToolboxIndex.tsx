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
 * @file ToolboxIndex.tsx
 * @description 工具箱首页搜索、卡片展示与导航编辑界面。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { ToolboxNavigationProps } from '../types';

/**
 * 渲染导航首页，所有状态变更交由导航 Hook 提供的操作处理。
 * @param props - 首页展示输入。
 * @param props.t - 当前语言翻译函数。
 * @param props.navigation - 页面状态及导航编辑操作。
 * @returns 工具箱首页。
 */
export function ToolboxIndex({ t, navigation }: ToolboxNavigationProps): ReactElement {
  const {
    navEditMode, searchQuery, setSearchQuery, searchResults, resetToolboxNavConfig,
    toggleNavEditMode, navigateByCard, visibleCards, hiddenCards, dragOverIdx,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd, removeCard, addCard,
  } = navigation;
  return (
    <div className="max-expand-settings-section settings-index-section">
      <div className="settings-index-header">
        <div className="max-expand-settings-title">
          {t('maxExpand.toolbox.index.title')}
          <button className="settings-nav-edit-btn" type="button" onClick={resetToolboxNavConfig}>
            {t('maxExpand.toolbox.index.reset')}
          </button>
          <button
            className={`settings-nav-edit-btn ${navEditMode ? 'active' : ''}`}
            type="button"
            onClick={toggleNavEditMode}
          >
            {navEditMode ? t('maxExpand.toolbox.index.done') : t('maxExpand.toolbox.index.edit')}
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
              placeholder={t('maxExpand.toolbox.index.searchPlaceholder')}
            />
            {searchQuery && (
              <button
                className="settings-index-search-clear"
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={t('maxExpand.toolbox.index.searchClear')}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
            {searchResults && (
              <div className="settings-index-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="settings-index-search-dropdown-empty">{t('maxExpand.toolbox.index.searchEmpty')}</div>
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
                      {card.icon && (
                        <img className="settings-index-search-dropdown-icon" src={card.icon} alt="" aria-hidden="true" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="settings-music-hint settings-index-hint">
          {navEditMode
            ? t('maxExpand.toolbox.index.hintEdit')
            : t('maxExpand.toolbox.index.hintView')}
        </div>
      </div>
      <div className="settings-index-cards" aria-label={t('maxExpand.toolbox.index.ariaNav')}>
        {visibleCards.map((card, idx) => (
          navEditMode ? (
            <div
              key={card.id}
              className={`settings-index-card editing${dragOverIdx === idx ? ' drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
            >
              <span className="settings-index-card-drag-handle">⠿</span>
              <button
                className="settings-index-card-remove"
                type="button"
                onClick={() => removeCard(card.id)}
                aria-label={t('maxExpand.toolbox.index.removeCard', { label: t(card.labelKey) })}
              >
                −
              </button>
              <span className="settings-index-card-title">{t(card.labelKey)}</span>
              <span className="settings-index-card-desc">{t(card.descKey)}</span>
              {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
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
              {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
            </button>
          )
        ))}
      </div>
      {navEditMode && (
        <div className="settings-nav-add-panel" aria-label={t('maxExpand.toolbox.index.ariaAddPanel')}>
          <div className="settings-music-label">{t('maxExpand.toolbox.index.addableTitle')}</div>
          {hiddenCards.length === 0 ? (
            <div className="settings-music-hint">{t('maxExpand.toolbox.index.emptyAddable')}</div>
          ) : (
            <div className="settings-nav-add-list">
              {hiddenCards.map((card) => (
                <button
                  key={card.id}
                  className="settings-nav-add-item"
                  type="button"
                  onClick={() => addCard(card.id)}
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
