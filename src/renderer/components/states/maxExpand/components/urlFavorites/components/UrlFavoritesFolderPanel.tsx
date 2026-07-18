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
 * @file UrlFavoritesFolderPanel.tsx
 * @description URL 收藏模块文件夹管理面板，包含文件夹筛选、新建与清空。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { UrlFavoritesFolderPanelProps } from '../types/urlFavoritesTypes';

/**
 * URL 收藏文件夹管理面板
 * @param props - 组件入参
 * @returns ReactElement
 */
export function UrlFavoritesFolderPanel({
  folderToolsOpen,
  folders,
  activeFolder,
  setActiveFolder,
  newFolderInput,
  setNewFolderInput,
  onCreateFolder,
  onClearFolder,
}: UrlFavoritesFolderPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div
      id="url-favorites-folder-panel"
      className={`url-favorites-folder-bar${folderToolsOpen ? ' url-favorites-folder-bar--open' : ''}`}
    >
      <datalist id="url-favorites-folder-options">
        {folders.map((folder) => <option key={folder} value={folder} />)}
      </datalist>
      <button
        className={`url-favorites-folder-chip${activeFolder === '' ? ' url-favorites-folder-chip--active' : ''}`}
        type="button"
        onClick={() => setActiveFolder('')}
      >
        {t('urlFavoritesTab.folders.all', { defaultValue: '全部' })}
      </button>
      {folders.map((folder) => (
        <button
          key={folder}
          className={`url-favorites-folder-chip${activeFolder === folder ? ' url-favorites-folder-chip--active' : ''}`}
          type="button"
          onClick={() => setActiveFolder(folder)}
          title={folder}
        >
          {folder}
        </button>
      ))}
      <input
        className="url-favorites-folder-input"
        type="text"
        value={newFolderInput}
        onChange={(e) => setNewFolderInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCreateFolder();
          }
        }}
        placeholder={t('urlFavoritesTab.folders.newPlaceholder', { defaultValue: '新建文件夹' })}
      />
      <button className="url-favorites-folder-add" type="button" onClick={onCreateFolder}>
        {t('urlFavoritesTab.folders.create', { defaultValue: '新建' })}
      </button>
      {activeFolder ? (
        <button className="url-favorites-folder-clear" type="button" onClick={() => onClearFolder(activeFolder)}>
          {t('urlFavoritesTab.folders.clearCurrent', { defaultValue: '清空当前分类' })}
        </button>
      ) : null}
    </div>
  );
}
