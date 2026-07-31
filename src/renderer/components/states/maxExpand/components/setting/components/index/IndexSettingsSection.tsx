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

import { useState, useMemo, type MutableRefObject, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SEARCHABLE_SETTINGS, SETTINGS_TAB_ICONS, type SearchableSettingItem, type AppSettingsPageKey, type MusicSettingsPageKey, type AiSettingsPageKey, type NetworkSettingsPageKey, type SettingsSidebarTabKey } from '../../utils/settingsConfig';

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
  setAiSettingsPage?: (page: AiSettingsPageKey) => void;
  setNetworkSettingsPage?: (page: NetworkSettingsPageKey) => void;
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
  setAiSettingsPage,
  setNetworkSettingsPage,
  setActiveTab,
  onAction,
}: IndexSettingsSectionProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const getCardOutlineClass = (cardId: string): string => {
    if (cardId === 'user-pro') return ' settings-user-pro-nav-card--outline';
    if (cardId === 'user-recharge') return ' settings-user-recharge-nav-card--outline';
    return '';
  };
  const getCardLabel = (card: IndexNavCard): string => t(`settings.nav.${card.id}.label`, { defaultValue: card.label });
  const getCardDesc = (card: IndexNavCard): string => t(`settings.nav.${card.id}.desc`, { defaultValue: card.desc });

  const getSearchItemIcon = (item: SearchableSettingItem): string | undefined => {
    if (item.appPage) return SETTINGS_TAB_ICONS[item.appPage];
    if (item.musicPage) return SETTINGS_TAB_ICONS[`music-${item.musicPage}` as keyof typeof SETTINGS_TAB_ICONS] ?? SETTINGS_TAB_ICONS.music;
    if (item.aiPage) return SETTINGS_TAB_ICONS.ai;
    if (item.networkPage) return SETTINGS_TAB_ICONS.network;
    return SETTINGS_TAB_ICONS[item.tab as keyof typeof SETTINGS_TAB_ICONS];
  };

  const searchResults = useMemo((): Array<SearchableSettingItem & { localizedLabel: string; localizedDesc: string }> | null => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return SEARCHABLE_SETTINGS
      .map((item) => {
        const localizedLabel = item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label;
        const localizedDesc = item.descKey ? t(item.descKey, { defaultValue: item.desc }) : item.desc;
        return { ...item, localizedLabel, localizedDesc };
      })
      .filter((item) => item.localizedLabel.toLowerCase().includes(q) || item.localizedDesc.toLowerCase().includes(q));
  }, [searchQuery, i18n.language, t]);

  return (
    <div className="max-expand-settings-section settings-index-section">
      <div className="settings-index-header">
        <div className="max-expand-settings-title">
          {t('settings.index.title', { defaultValue: '快速导航' })}
          <button className="settings-nav-edit-btn" type="button" onClick={resetNavConfig}>{t('settings.index.reset', { defaultValue: '恢复默认' })}</button>
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
            {navEditMode
              ? t('settings.index.done', { defaultValue: '完成' })
              : t('settings.index.edit', { defaultValue: '编辑' })}
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
              placeholder={t('settings.index.searchPlaceholder', { defaultValue: '搜索配置项...' })}
            />
            {searchQuery && (
              <button className="settings-index-search-clear" type="button" onClick={() => setSearchQuery('')} aria-label={t('settings.index.searchClear', { defaultValue: 'Clear search' })}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
            {searchResults && (
              <div className="settings-index-search-dropdown">
                {searchResults.length === 0 ? (
                  <div className="settings-index-search-dropdown-empty">{t('settings.index.searchEmpty', { defaultValue: '没有找到匹配的配置项' })}</div>
                ) : (
                  searchResults.map((item, idx) => (
                    <button
                      key={`${item.tab}-${item.label}-${idx}`}
                      className="settings-index-search-dropdown-item"
                      type="button"
                      onClick={() => {
                        if (item.appPage) {
                          setAppSettingsPage(item.appPage);
                          setActiveTab('app');
                        } else if (item.musicPage) {
                          setMusicSettingsPage(item.musicPage);
                          setActiveTab('music');
                        } else if (item.aiPage && setAiSettingsPage) {
                          setAiSettingsPage(item.aiPage);
                          setActiveTab('ai');
                        } else if (item.networkPage && setNetworkSettingsPage) {
                          setNetworkSettingsPage(item.networkPage);
                          setActiveTab('network');
                        } else {
                          setActiveTab(item.tab);
                        }
                        setSearchQuery('');
                      }}
                    >
                      <div className="settings-index-search-dropdown-text">
                        <span className="settings-index-search-dropdown-title">{item.localizedLabel}</span>
                        <span className="settings-index-search-dropdown-desc">{item.localizedDesc}</span>
                      </div>
                      {getSearchItemIcon(item) && (
                        <img className="settings-index-search-dropdown-icon" src={getSearchItemIcon(item)} alt="" aria-hidden="true" />
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
            ? t('settings.index.hintEdit', { defaultValue: '拖拽卡片可调整排列顺序，点击「完成」保存。' })
            : t('settings.index.hintView', { defaultValue: '点击卡片可快速跳转到对应配置页。' })}
        </div>
      </div>
      <div className="settings-index-cards" aria-label={t('settings.index.ariaNav', { defaultValue: '设置快速导航' })}>
          {visibleCards.map((card, idx) => (
            navEditMode ? (
              <div
                key={card.id}
                className={`settings-index-card editing${getCardOutlineClass(card.id)}${dragOverIdx === idx ? ' drag-over' : ''}`}
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
                  aria-label={t('settings.index.removeCard', { defaultValue: '删除 {{label}}', label: getCardLabel(card) })}
                >
                  −
                </button>
                <span className="settings-index-card-title">{getCardLabel(card)}</span>
                <span className="settings-index-card-desc">{getCardDesc(card)}</span>
                {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
              </div>
            ) : (
              <button
                key={card.id}
                className={`settings-index-card${getCardOutlineClass(card.id)}`}
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
                <span className="settings-index-card-title">{getCardLabel(card)}</span>
                <span className="settings-index-card-desc">{getCardDesc(card)}</span>
                {card.icon && <img className="settings-index-card-layout-icon" src={card.icon} alt="" aria-hidden="true" />}
              </button>
            )
          ))}
      </div>
      {navEditMode && (
        <div className="settings-nav-add-panel" aria-label={t('settings.index.ariaAddPanel', { defaultValue: '可添加导航卡片' })}>
          <div className="settings-music-label">{t('settings.index.addableTitle', { defaultValue: '可添加卡片' })}</div>
          {hiddenCards.length === 0 ? (
            <div className="settings-music-hint">{t('settings.index.emptyAddable', { defaultValue: '当前没有可添加的卡片' })}</div>
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
                  <span>{t(`settings.nav.${card.id}.label`, { defaultValue: card.label })}</span>
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
