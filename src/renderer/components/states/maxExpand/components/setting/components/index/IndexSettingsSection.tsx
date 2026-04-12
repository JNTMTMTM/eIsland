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
 * @file IndexSettingsSection.tsx
 * @description 设置页面 - 总览导航配置区块
 * @author 鸡哥
 */

import type { MutableRefObject, ReactElement } from 'react';
import type { AppSettingsPageKey, MusicSettingsPageKey, SettingsSidebarTabKey } from '../../utils/settingsConfig';

interface IndexNavCard {
  id: string;
  label: string;
  desc: string;
  icon?: string;
  tab: SettingsSidebarTabKey;
  appPage?: AppSettingsPageKey;
  musicPage?: MusicSettingsPageKey;
  actionId?: string;
}

interface IndexSettingsSectionProps {
  visibleCards: IndexNavCard[];
  hiddenCards: Array<{ id: string; label: string }>;
  navEditMode: boolean;
  dragOverIdx: number | null;
  navOrder: string[];
  hiddenNavOrder: string[];
  dragIdxRef: MutableRefObject<number | null>;
  setDragOverIdx: (idx: number | null) => void;
  setNavOrder: (order: string[]) => void;
  setHiddenNavOrder: (order: string[]) => void;
  setNavEditMode: (value: boolean) => void;
  resetNavConfig: () => void;
  persistNavConfig: (visible: string[], hidden: string[]) => void;
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
  setMusicSettingsPage: (page: MusicSettingsPageKey) => void;
  setActiveTab: (tab: SettingsSidebarTabKey) => void;
  onAction?: (actionId: string) => void;
}

/**
 * 渲染设置总览导航区块
 * @param props - 总览导航配置参数
 * @returns 总览导航设置区域
 */
export function IndexSettingsSection({
  visibleCards,
  hiddenCards,
  navEditMode,
  dragOverIdx,
  navOrder,
  hiddenNavOrder,
  dragIdxRef,
  setDragOverIdx,
  setNavOrder,
  setHiddenNavOrder,
  setNavEditMode,
  resetNavConfig,
  persistNavConfig,
  setAppSettingsPage,
  setMusicSettingsPage,
  setActiveTab,
  onAction,
}: IndexSettingsSectionProps): ReactElement {
  return (
    <div className="max-expand-settings-section settings-index-section">
      <div className="settings-index-header">
        <div className="max-expand-settings-title">
          快速导航
          <button className="settings-nav-edit-btn" type="button" onClick={resetNavConfig}>恢复默认</button>
          <button
            className={`settings-nav-edit-btn ${navEditMode ? 'active' : ''}`}
            type="button"
            onClick={() => {
              if (navEditMode) {
                persistNavConfig(navOrder, hiddenNavOrder);
              }
              setNavEditMode(!navEditMode);
            }}
          >
            {navEditMode ? '完成' : '编辑'}
          </button>
        </div>
        <div className="settings-music-hint settings-index-hint">
          {navEditMode ? '拖拽卡片可调整排列顺序，点击「完成」保存。' : '点击卡片可快速跳转到对应配置页。'}
        </div>
      </div>
      <div className="settings-index-cards" aria-label="设置快速导航">
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
                const newOrder = visibleCards.map((c) => c.id);
                const [moved] = newOrder.splice(from, 1);
                newOrder.splice(idx, 0, moved);
                setNavOrder(newOrder);
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
                  const nextHidden = hiddenNavOrder.includes(card.id) ? hiddenNavOrder : [...hiddenNavOrder, card.id];
                  setNavOrder(nextVisible);
                  setHiddenNavOrder(nextHidden);
                }}
                aria-label={`删除 ${card.label}`}
              >
                −
              </button>
              <span className="settings-index-card-title">{card.label}</span>
              <span className="settings-index-card-desc">{card.desc}</span>
              {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
            </div>
          ) : (
            <button
              key={card.id}
              className="settings-index-card"
              type="button"
              onClick={() => {
                if (card.actionId && onAction) {
                  onAction(card.actionId);
                } else if (card.appPage) {
                  setAppSettingsPage(card.appPage);
                  setActiveTab('app');
                } else if (card.musicPage) {
                  setMusicSettingsPage(card.musicPage);
                  setActiveTab('music');
                } else {
                  setActiveTab(card.tab);
                }
              }}
            >
              <span className="settings-index-card-title">{card.label}</span>
              <span className="settings-index-card-desc">{card.desc}</span>
              {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
            </button>
          )
        ))}
      </div>
      {navEditMode && (
        <div className="settings-nav-add-panel" aria-label="可添加导航卡片">
          <div className="settings-music-label">可添加卡片</div>
          {hiddenCards.length === 0 ? (
            <div className="settings-music-hint">当前没有可添加的卡片</div>
          ) : (
            <div className="settings-nav-add-list">
              {hiddenCards.map((card) => (
                <button
                  key={card.id}
                  className="settings-nav-add-item"
                  type="button"
                  onClick={() => {
                    const nextVisible = navOrder.includes(card.id) ? navOrder : [...navOrder, card.id];
                    const nextHidden = hiddenNavOrder.filter((id) => id !== card.id);
                    setNavOrder(nextVisible);
                    setHiddenNavOrder(nextHidden);
                  }}
                >
                  <span>{card.label}</span>
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
