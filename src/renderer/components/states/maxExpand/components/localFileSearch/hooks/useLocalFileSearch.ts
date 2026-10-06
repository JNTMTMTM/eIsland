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
 * @file useLocalFileSearch.ts
 * @description 本地文件搜索模块状态管理 hook。
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SEARCH_ROOT_STORE_KEY } from '../config/localFileSearchConfig';
import type { LocalFileSearchItem, MatchMode, MatchScope, UseLocalFileSearchReturn } from '../types/localFileSearchTypes';
import { parseCsvValues } from '../utils/localFileSearchUtils';

/**
 * 本地文件搜索状态管理 hook
 * @description 封装 LocalFileSearchTab 的全部状态与操作逻辑
 */
export function useLocalFileSearch(): UseLocalFileSearchReturn {
  const { t } = useTranslation();
  const [rootDir, setRootDir] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [resultLimit, setResultLimit] = useState(120);
  const [maxDepth, setMaxDepth] = useState(8);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchMode, setMatchMode] = useState<MatchMode>('contains');
  const [matchScope, setMatchScope] = useState<MatchScope>('name');
  const [includeFiles, setIncludeFiles] = useState(true);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [extensionsInput, setExtensionsInput] = useState('');
  const [excludeDirsInput, setExcludeDirsInput] = useState('');
  const [includeDirectories, setIncludeDirectories] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LocalFileSearchItem[]>([]);
  const [iconMap, setIconMap] = useState<Record<string, string>>({});
  const iconLoadingPathsRef = useRef<Set<string>>(new Set());
  const searchRequestIdRef = useRef(0);

  /** 启动时从持久化加载搜索根目录 */
  useEffect(() => {
    window.api.storeRead(SEARCH_ROOT_STORE_KEY).then((value) => {
      if (typeof value === 'string' && value.trim()) {
        setRootDir(value.trim());
      }
    }).catch(() => {});
  }, []);

  /** 清理不在结果中的图标缓存 */
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

  /** 懒加载文件图标 */
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

  /** 选择搜索根目录 */
  const handlePickRootDir = (): void => {
    window.api.pickLocalSearchDirectory().then((pickedPath) => {
      if (!pickedPath) return;
      setRootDir(pickedPath);
      window.api.storeWrite(SEARCH_ROOT_STORE_KEY, pickedPath).catch(() => {});
    }).catch(() => {});
  };

  /** 执行搜索 */
  const handleSearch = (): void => {
    const requestId = ++searchRequestIdRef.current;
    const trimmedRootDir = rootDir.trim();
    const trimmedKeyword = keyword.trim();
    if (!trimmedRootDir || !trimmedKeyword) {
      setResults([]);
      setLoading(false);
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
      if (requestId !== searchRequestIdRef.current) return;
      setResults(Array.isArray(items) ? items : []);
    }).catch(() => {
      if (requestId !== searchRequestIdRef.current) return;
      setResults([]);
    }).finally(() => {
      if (requestId !== searchRequestIdRef.current) return;
      setLoading(false);
    });
  };

  /** 结果数量文本 */
  const countText = useMemo(() => {
    return t('maxExpand.localFileSearch.count', {
      defaultValue: '{{count}} 项',
      count: results.length,
    });
  }, [results.length, t]);

  return {
    rootDir, setRootDir,
    keyword, setKeyword,
    showConfig, setShowConfig,
    resultLimit, setResultLimit,
    maxDepth, setMaxDepth,
    caseSensitive, setCaseSensitive,
    matchMode, setMatchMode,
    matchScope, setMatchScope,
    includeFiles, setIncludeFiles,
    includeHidden, setIncludeHidden,
    extensionsInput, setExtensionsInput,
    excludeDirsInput, setExcludeDirsInput,
    includeDirectories, setIncludeDirectories,
    loading, results, iconMap, countText,
    handlePickRootDir, handleSearch,
  };
}
