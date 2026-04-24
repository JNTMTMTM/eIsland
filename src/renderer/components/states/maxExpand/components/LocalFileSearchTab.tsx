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
 * @file LocalFileSearchTab.tsx
 * @description 最大展开模式本地文件查找页
 * @author 鸡哥
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LocalFileSearchItem {
  name: string;
  path: string;
  isDirectory: boolean;
}

const SEARCH_ROOT_STORE_KEY = 'local-file-search-root';

export function LocalFileSearchTab(): React.ReactElement {
  const { t } = useTranslation();
  const [rootDir, setRootDir] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalFileSearchItem[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const iconLoadingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    window.api.storeRead(SEARCH_ROOT_STORE_KEY).then((value) => {
      if (typeof value === 'string' && value.trim()) {
        setRootDir(value.trim());
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const nextPaths = new Set(results.map((item) => item.path));
    const staleKeys = Object.keys(iconMap).filter((path) => !nextPaths.has(path));
    if (staleKeys.length === 0) return;
    setIconMap((prev) => {
      const next = { ...prev };
      staleKeys.forEach((key) => { delete next[key]; });
      return next;
    });
  }, [results]);

  useEffect(() => {
    const unresolved = results.filter((item) => (
      !item.isDirectory
      && !iconMap[item.path]
      && !iconLoadingPathsRef.current.has(item.path)
    ));
    if (unresolved.length === 0) return;
    unresolved.forEach((item) => {
      iconLoadingPathsRef.current.add(item.path);
      window.api.getFileIcon(item.path).then((iconBase64) => {
        if (!iconBase64) return;
        setIconMap((prev) => {
          if (prev[item.path]) return prev;
          return { ...prev, [item.path]: iconBase64 };
        });
      }).catch(() => {}).finally(() => {
        iconLoadingPathsRef.current.delete(item.path);
      });
    });
  }, [results, iconMap]);

  const handlePickRootDir = (): void => {
    window.api.pickLocalSearchDirectory().then((pickedPath) => {
      if (!pickedPath) return;
      setRootDir(pickedPath);
      window.api.storeWrite(SEARCH_ROOT_STORE_KEY, pickedPath).catch(() => {});
    }).catch(() => {});
  };

  const handleSearch = (): void => {
    const trimmedRootDir = rootDir.trim();
    const trimmedKeyword = keyword.trim();
    if (!trimmedRootDir || !trimmedKeyword) {
      setResults([]);
      return;
    }
    setLoading(true);
    window.api.searchLocalFiles(trimmedRootDir, trimmedKeyword, 120).then((items) => {
      setResults(Array.isArray(items) ? items : []);
    }).catch(() => {
      setResults([]);
    }).finally(() => {
      setLoading(false);
    });
  };

  const countText = useMemo(() => {
    return t('maxExpand.localFileSearch.count', {
      defaultValue: '{{count}} 项',
      count: results.length,
    });
  }, [results.length, t]);

  return (
    <div className="local-file-search">
      <div className="local-file-search-header">
        <span className="local-file-search-title">{t('maxExpand.localFileSearch.title', { defaultValue: '本地文件查找' })}</span>
        <span className="local-file-search-count">{countText}</span>
      </div>

      <div className="local-file-search-root-row">
        <input
          className="local-file-search-root-input"
          value={rootDir}
          onChange={(e) => setRootDir(e.target.value)}
          placeholder={t('maxExpand.localFileSearch.rootPlaceholder', { defaultValue: '选择或输入搜索目录，例如 C:\\Users' })}
        />
        <button type="button" className="local-file-search-btn" onClick={handlePickRootDir}>
          {t('maxExpand.localFileSearch.pickDir', { defaultValue: '选择目录' })}
        </button>
      </div>

      <div className="local-file-search-query-row">
        <input
          className="local-file-search-query-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
          placeholder={t('maxExpand.localFileSearch.keywordPlaceholder', { defaultValue: '输入文件名关键词，例如 report、.pdf' })}
        />
        <button type="button" className="local-file-search-btn" onClick={handleSearch}>
          {loading
            ? t('maxExpand.localFileSearch.searching', { defaultValue: '搜索中…' })
            : t('maxExpand.localFileSearch.search', { defaultValue: '搜索' })}
        </button>
      </div>

      <div className="local-file-search-results">
        {loading ? (
          <div className="local-file-search-empty">{t('maxExpand.localFileSearch.loading', { defaultValue: '正在检索本地文件…' })}</div>
        ) : results.length === 0 ? (
          <div className="local-file-search-empty">{t('maxExpand.localFileSearch.empty', { defaultValue: '暂无结果，试试更换关键词或目录。' })}</div>
        ) : (
          results.map((item) => (
            <button
              key={item.path}
              type="button"
              className="local-file-search-item"
              onDoubleClick={() => {
                void window.api.openFile(item.path);
              }}
              onClick={() => {
                void window.api.openFile(item.path);
              }}
              title={item.path}
            >
              <span className="local-file-search-item-icon-wrap">
                {item.isDirectory ? (
                  <span className="local-file-search-item-icon-placeholder">📁</span>
                ) : iconMap[item.path] ? (
                  <img
                    className="local-file-search-item-icon"
                    src={`data:image/png;base64,${iconMap[item.path]}`}
                    alt=""
                    aria-hidden="true"
                  />
                ) : (
                  <span className="local-file-search-item-icon-placeholder">📄</span>
                )}
              </span>
              <span className="local-file-search-item-main">
                <span className="local-file-search-item-name">{item.name}</span>
                <span className="local-file-search-item-path">{item.path}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
