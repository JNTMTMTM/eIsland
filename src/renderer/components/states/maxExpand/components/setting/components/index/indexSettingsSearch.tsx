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
 * @file indexSettingsSearch.tsx
 * @description 快速导航搜索与本地化索引，隔离输入期间的导航卡片更新。
 * @author 鸡哥
 */

import { memo, useCallback, useMemo, useState, type ChangeEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SEARCHABLE_SETTINGS,
  SETTINGS_TAB_ICONS,
  type SearchableSettingItem,
  type AppSettingsPageKey,
  type MusicSettingsPageKey,
  type AiSettingsPageKey,
  type NetworkSettingsPageKey,
  type SettingsSidebarTabKey,
} from '../../utils/settingsConfig';

interface IndexSettingsSearchProps {
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
  setMusicSettingsPage: (page: MusicSettingsPageKey) => void;
  setAiSettingsPage?: (page: AiSettingsPageKey) => void;
  setNetworkSettingsPage?: (page: NetworkSettingsPageKey) => void;
  setActiveTab: (tab: SettingsSidebarTabKey) => void;
  onAction?: (actionId: string) => void;
}

function getSearchItemIcon(item: SearchableSettingItem): string | undefined {
  if (item.appPage) return SETTINGS_TAB_ICONS[item.appPage];
  if (item.musicPage) return SETTINGS_TAB_ICONS[`music-${item.musicPage}` as keyof typeof SETTINGS_TAB_ICONS] ?? SETTINGS_TAB_ICONS.music;
  if (item.aiPage) return SETTINGS_TAB_ICONS.ai;
  if (item.networkPage) return SETTINGS_TAB_ICONS.network;
  return SETTINGS_TAB_ICONS[item.tab as keyof typeof SETTINGS_TAB_ICONS];
}

/**
 * 搜索当前语言的配置项并跳转至对应页面。
 * @param props - 配置页面及快捷操作的导航回调。
 * @param props.setAppSettingsPage - 切换软件设置子页面。
 * @param props.setMusicSettingsPage - 切换歌曲设置子页面。
 * @param props.setAiSettingsPage - 切换 AI 设置子页面。
 * @param props.setNetworkSettingsPage - 切换网络设置子页面。
 * @param props.setActiveTab - 切换设置分类。
 * @param props.onAction - 执行快捷导航操作。
 * @returns 搜索输入框与匹配结果。
 */
function IndexSettingsSearch({
  setAppSettingsPage,
  setMusicSettingsPage,
  setAiSettingsPage,
  setNetworkSettingsPage,
  setActiveTab,
  onAction,
}: IndexSettingsSearchProps): ReactElement {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // 首次搜索才建立索引；清空后保留，后续输入只做匹配，切换语言时重新翻译。
  const searchIndex = useMemo(() => {
    if (!hasSearched) return [];
    return SEARCHABLE_SETTINGS.map((item) => {
      const localizedLabel = item.labelKey ? t(item.labelKey, { defaultValue: item.label }) : item.label;
      const localizedDesc = item.descKey ? t(item.descKey, { defaultValue: item.desc }) : item.desc;
      return {
        localizedLabel,
        localizedDesc,
        ...item,
        normalizedLabel: localizedLabel.toLowerCase(),
        normalizedDesc: localizedDesc.toLowerCase(),
        icon: getSearchItemIcon(item),
      };
    });
  }, [hasSearched, t]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return null;
    return searchIndex.filter((item) => item.normalizedLabel.includes(query) || item.normalizedDesc.includes(query));
  }, [searchQuery, searchIndex]);

  const handleSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const nextQuery = event.target.value;
    setSearchQuery(nextQuery);
    if (nextQuery.trim()) setHasSearched(true);
  }, []);

  const clearSearch = useCallback((): void => setSearchQuery(''), []);

  return (
    <div className="settings-index-search-wrap">
      <span className="settings-index-search-icon" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </span>
      <input className="settings-index-search-input"
        type="text"
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder={t('settings.index.searchPlaceholder', { defaultValue: '搜索配置项...' })}
      />
      {searchQuery && (
        <button className="settings-index-search-clear" type="button" onClick={clearSearch} aria-label={t('settings.index.searchClear', { defaultValue: 'Clear search' })}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      )}
      {searchResults && (
        <div className="settings-index-search-dropdown">
          {searchResults.length === 0 ? (
            <div className="settings-index-search-dropdown-empty">{t('settings.index.searchEmpty', { defaultValue: '没有找到匹配的配置项' })}</div>
          ) : (
            searchResults.map((item) => (
              <button key={`${item.tab}-${item.labelKey ?? item.label}`}
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
                  } else if (item.actionId && onAction) {
                    onAction(item.actionId);
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
                {item.icon && (
                  <img className="settings-index-search-dropdown-icon" src={item.icon} alt="" aria-hidden="true" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default memo(IndexSettingsSearch);
