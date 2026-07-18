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
 * @file UrlFavoritesInputBar.tsx
 * @description URL 收藏模块输入栏，包含 URL 输入、添加按钮、分组与导入导出开关。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { UrlFavoritesInputBarProps } from '../types/urlFavoritesTypes';

/**
 * URL 收藏输入栏
 * @param props - 组件入参
 * @returns ReactElement
 */
export function UrlFavoritesInputBar({
  urlInput,
  setUrlInput,
  placeholder,
  onAdd,
  folderToolsOpen,
  onToggleFolderTools,
  importExportOpen,
  onToggleImportExport,
}: UrlFavoritesInputBarProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="url-favorites-input-bar">
      <input
        className="url-favorites-input"
        type="text"
        placeholder={placeholder}
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
      />
      <button className="url-favorites-add" type="button" onClick={onAdd}>
        {t('urlFavoritesTab.actions.add', { defaultValue: '添加' })}
      </button>
      <button
        className={`url-favorites-tool-toggle${folderToolsOpen ? ' url-favorites-tool-toggle--active' : ''}`}
        type="button"
        onClick={onToggleFolderTools}
        aria-expanded={folderToolsOpen}
        aria-controls="url-favorites-folder-panel"
      >
        {t('urlFavoritesTab.actions.manageFolders', { defaultValue: '分组' })}
      </button>
      <button
        className={`url-favorites-manage${importExportOpen ? ' url-favorites-manage--active' : ''}`}
        type="button"
        onClick={onToggleImportExport}
        aria-expanded={importExportOpen}
        aria-controls="url-favorites-import-export-panel"
      >
        {t('urlFavoritesTab.actions.manageImportExport', { defaultValue: '导入导出' })}
      </button>
    </div>
  );
}
