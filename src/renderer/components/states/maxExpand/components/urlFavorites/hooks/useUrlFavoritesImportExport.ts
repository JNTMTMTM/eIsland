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
 * @file useUrlFavoritesImportExport.ts
 * @description URL 收藏导入导出 hook：格式选择、文件导入、导出。
 * @author 鸡哥
 */

import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import type { UrlFavoriteItem, UrlFavoritesFormat } from '../types/urlFavoritesTypes';
import {
  parseImportedFavorites,
  mergeFavorites,
  serializeFavoritesToJson,
  serializeFavoritesToHtml,
} from '../utils/urlFavoritesUtils';

/** useUrlFavoritesImportExport 返回值 */
export interface UseUrlFavoritesImportExportReturn {
  importFormat: UrlFavoritesFormat;
  setImportFormat: Dispatch<SetStateAction<UrlFavoritesFormat>>;
  exportFormat: UrlFavoritesFormat;
  setExportFormat: Dispatch<SetStateAction<UrlFavoritesFormat>>;
  importInputRef: React.RefObject<HTMLInputElement | null>;
  handleImportClick: () => void;
  handleImportFile: (file: File | null) => void;
  handleExport: () => void;
}

/**
 * URL 收藏导入导出 hook
 * @param favorites - 当前收藏列表
 * @param setFavorites - favorites setter
 * @param showStatusMessage - 状态消息回调
 * @returns 格式状态、ref、导入导出处理函数
 */
export function useUrlFavoritesImportExport(
  favorites: UrlFavoriteItem[],
  setFavorites: Dispatch<SetStateAction<UrlFavoriteItem[]>>,
  showStatusMessage: (message: string) => void,
): UseUrlFavoritesImportExportReturn {
  const { t } = useTranslation();
  const [importFormat, setImportFormat] = useState<UrlFavoritesFormat>('json');
  const [exportFormat, setExportFormat] = useState<UrlFavoritesFormat>('json');
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = (): void => {
    importInputRef.current?.click();
  };

  const handleImportFile = (file: File | null): void => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = typeof reader.result === 'string' ? reader.result : '';
        const imported = parseImportedFavorites(content, importFormat);
        if (imported.length === 0) {
          showStatusMessage(t('urlFavoritesTab.messages.importEmpty', { defaultValue: '未识别到可导入的收藏' }));
          return;
        }
        const next = mergeFavorites(favorites, imported);
        const addedCount = next.length - favorites.length;
        if (addedCount === 0) {
          showStatusMessage(t('urlFavoritesTab.messages.importEmpty', { defaultValue: '未识别到可导入的收藏' }));
          return;
        }
        setFavorites(next);
        showStatusMessage(t('urlFavoritesTab.messages.importSuccess', { defaultValue: '已导入 {{count}} 条收藏', count: addedCount }));
      } catch {
        showStatusMessage(t('urlFavoritesTab.messages.importFailed', { defaultValue: '导入失败，请检查文件格式' }));
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showStatusMessage(t('urlFavoritesTab.messages.importFailed', { defaultValue: '导入失败，请检查文件格式' }));
      if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleExport = (): void => {
    const isJson = exportFormat === 'json';
    const content = isJson
      ? serializeFavoritesToJson(favorites)
      : serializeFavoritesToHtml(favorites, t('urlFavoritesTab.folders.uncategorized', { defaultValue: '未分类' }));
    const date = new Date().toISOString().slice(0, 10);
    window.api.saveTextFile({
      defaultPath: `eIsland-url-favorites-${date}.${isJson ? 'json' : 'html'}`,
      content,
      filters: isJson
        ? [{ name: 'JSON', extensions: ['json'] }]
        : [{ name: 'HTML', extensions: ['html', 'htm'] }],
    }).then((result) => {
      if (result.ok) {
        showStatusMessage(t('urlFavoritesTab.messages.exportSuccess', { defaultValue: '已导出 {{count}} 条收藏', count: favorites.length }));
        return;
      }
      if (!result.canceled) {
        showStatusMessage(t('urlFavoritesTab.messages.exportFailed', { defaultValue: '导出失败，请稍后重试' }));
      }
    }).catch(() => {
      showStatusMessage(t('urlFavoritesTab.messages.exportFailed', { defaultValue: '导出失败，请稍后重试' }));
    });
  };

  return {
    importFormat,
    setImportFormat,
    exportFormat,
    setExportFormat,
    importInputRef,
    handleImportClick,
    handleImportFile,
    handleExport,
  };
}
