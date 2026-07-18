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
 * @file UrlFavoritesImportExportPanel.tsx
 * @description URL 收藏模块导入导出面板，包含格式选择与导入导出按钮。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_FORMATS } from '../config/urlFavoritesConfig';
import type { UrlFavoritesImportExportPanelProps } from '../types/urlFavoritesTypes';

/**
 * URL 收藏导入导出面板
 * @param props - 组件入参
 * @returns ReactElement
 */
export function UrlFavoritesImportExportPanel({
  importExportOpen,
  importInputRef,
  importFormat,
  setImportFormat,
  exportFormat,
  setExportFormat,
  onImportClick,
  onImportFile,
  onExport,
  hasFavorites,
}: UrlFavoritesImportExportPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div
      id="url-favorites-import-export-panel"
      className={`url-favorites-import-export-panel${importExportOpen ? ' url-favorites-import-export-panel--open' : ''}`}
    >
      <input
        ref={importInputRef}
        className="url-favorites-file-input"
        type="file"
        accept={importFormat === 'json' ? '.json,application/json' : '.html,.htm,text/html'}
        onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
      />
      <div className="url-favorites-format-group" aria-label={t('urlFavoritesTab.import.formatAria', { defaultValue: '导入格式' })}>
        {SUPPORTED_FORMATS.map((format) => (
          <button
            key={`import-${format}`}
            className={`url-favorites-format-btn${importFormat === format ? ' url-favorites-format-btn--active' : ''}`}
            type="button"
            onClick={() => setImportFormat(format)}
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>
      <button className="url-favorites-secondary-action" type="button" onClick={onImportClick}>
        {t('urlFavoritesTab.actions.import', { defaultValue: '导入' })}
      </button>
      <div className="url-favorites-format-group" aria-label={t('urlFavoritesTab.export.formatAria', { defaultValue: '导出格式' })}>
        {SUPPORTED_FORMATS.map((format) => (
          <button
            key={`export-${format}`}
            className={`url-favorites-format-btn${exportFormat === format ? ' url-favorites-format-btn--active' : ''}`}
            type="button"
            onClick={() => setExportFormat(format)}
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        className="url-favorites-secondary-action"
        type="button"
        onClick={onExport}
        disabled={!hasFavorites}
      >
        {t('urlFavoritesTab.actions.export', { defaultValue: '导出' })}
      </button>
    </div>
  );
}
