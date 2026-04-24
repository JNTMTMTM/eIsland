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

function parseCsvValues(input: string): string[] {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 最大展开模式下的本地文件检索页面。
 * @returns 本地文件搜索页组件。
 */
export function LocalFileSearchTab(): React.ReactElement {
  const { t } = useTranslation();
  const [rootDir, setRootDir] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [resultLimit, setResultLimit] = useState(120);
  const [maxDepth, setMaxDepth] = useState(8);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchMode, setMatchMode] = useState<'contains' | 'startsWith' | 'endsWith' | 'exact'>('contains');
  const [matchScope, setMatchScope] = useState<'name' | 'path'>('name');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [extensionsInput, setExtensionsInput] = useState('');
  const [excludeDirsInput, setExcludeDirsInput] = useState('');
  const [includeDirectories, setIncludeDirectories] = useState(true);
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
    const parsedExtensions = parseCsvValues(extensionsInput);
    const parsedExcludeDirs = parseCsvValues(excludeDirsInput);
    setLoading(true);
    window.api.searchLocalFiles(trimmedRootDir, trimmedKeyword, {
      limit: resultLimit,
      maxDepth,
      includeDirectories,
      includeFiles,
      includeHidden,
      caseSensitive,
      matchMode,
      matchScope,
      extensions: parsedExtensions,
      excludeDirs: parsedExcludeDirs,
    }).then((items) => {
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
        <button
          type="button"
          className={`local-file-search-btn local-file-search-config-toggle${showConfig ? ' active' : ''}`}
          onClick={() => setShowConfig((prev) => !prev)}
        >
          {t('maxExpand.localFileSearch.config', { defaultValue: '配置' })}
        </button>
      </div>

      {showConfig ? (
        <div className="local-file-search-config-panel">
          <label className="local-file-search-config-item">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.limitLabel', { defaultValue: '最大结果数' })}
            </span>
            <select
              className="local-file-search-config-select"
              value={String(resultLimit)}
              onChange={(e) => {
                const nextLimit = Number(e.target.value);
                if (Number.isFinite(nextLimit) && nextLimit > 0) {
                  setResultLimit(nextLimit);
                }
              }}
            >
              <option value="50">50</option>
              <option value="120">120</option>
              <option value="300">300</option>
            </select>
          </label>

          <label className="local-file-search-config-item">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.matchScopeLabel', { defaultValue: '匹配范围' })}
            </span>
            <select
              className="local-file-search-config-select"
              value={matchScope}
              onChange={(e) => {
                const nextValue = e.target.value;
                if (nextValue === 'name' || nextValue === 'path') {
                  setMatchScope(nextValue);
                }
              }}
            >
              <option value="name">{t('maxExpand.localFileSearch.matchScopeName', { defaultValue: '文件名' })}</option>
              <option value="path">{t('maxExpand.localFileSearch.matchScopePath', { defaultValue: '完整路径' })}</option>
            </select>
          </label>

          <label className="local-file-search-config-item">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.matchModeLabel', { defaultValue: '匹配方式' })}
            </span>
            <select
              className="local-file-search-config-select"
              value={matchMode}
              onChange={(e) => {
                const nextValue = e.target.value;
                if (nextValue === 'contains' || nextValue === 'startsWith' || nextValue === 'endsWith' || nextValue === 'exact') {
                  setMatchMode(nextValue);
                }
              }}
            >
              <option value="contains">{t('maxExpand.localFileSearch.matchModeContains', { defaultValue: '包含' })}</option>
              <option value="startsWith">{t('maxExpand.localFileSearch.matchModeStartsWith', { defaultValue: '前缀' })}</option>
              <option value="endsWith">{t('maxExpand.localFileSearch.matchModeEndsWith', { defaultValue: '后缀' })}</option>
              <option value="exact">{t('maxExpand.localFileSearch.matchModeExact', { defaultValue: '精确匹配' })}</option>
            </select>
          </label>

          <label className="local-file-search-config-item">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.depthLabel', { defaultValue: '最大深度' })}
            </span>
            <select
              className="local-file-search-config-select"
              value={String(maxDepth)}
              onChange={(e) => {
                const nextDepth = Number(e.target.value);
                if (Number.isFinite(nextDepth) && nextDepth >= 0) {
                  setMaxDepth(nextDepth);
                }
              }}
            >
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="12">12</option>
            </select>
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--input">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.extensionsLabel', { defaultValue: '文件后缀' })}
            </span>
            <input
              className="local-file-search-config-input"
              value={extensionsInput}
              onChange={(e) => setExtensionsInput(e.target.value)}
              placeholder={t('maxExpand.localFileSearch.extensionsPlaceholder', { defaultValue: '如 pdf,docx,ts' })}
            />
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--input">
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.excludeDirsLabel', { defaultValue: '排除目录' })}
            </span>
            <input
              className="local-file-search-config-input"
              value={excludeDirsInput}
              onChange={(e) => setExcludeDirsInput(e.target.value)}
              placeholder={t('maxExpand.localFileSearch.excludeDirsPlaceholder', { defaultValue: '如 dist,build,coverage' })}
            />
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--checkbox">
            <input
              type="checkbox"
              checked={includeDirectories}
              onChange={(e) => setIncludeDirectories(e.target.checked)}
            />
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.includeFolders', { defaultValue: '结果包含文件夹' })}
            </span>
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--checkbox">
            <input
              type="checkbox"
              checked={includeFiles}
              onChange={(e) => setIncludeFiles(e.target.checked)}
            />
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.includeFiles', { defaultValue: '结果包含文件' })}
            </span>
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--checkbox">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(e) => setIncludeHidden(e.target.checked)}
            />
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.includeHidden', { defaultValue: '包含隐藏项' })}
            </span>
          </label>

          <label className="local-file-search-config-item local-file-search-config-item--checkbox">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
            />
            <span className="local-file-search-config-label">
              {t('maxExpand.localFileSearch.caseSensitive', { defaultValue: '区分大小写' })}
            </span>
          </label>
        </div>
      ) : null}

      {loading ? (
        <div className="local-file-search-progress" aria-hidden="true">
          <span className="local-file-search-progress-bar" />
        </div>
      ) : null}

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
