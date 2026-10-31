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
 * @file useToolsTab.ts
 * @description Expanded 系统工具 Tab 的快捷启动加载、持久化、拖拽添加与名称编辑状态。
 * @author 鸡哥
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { APPS_STORE_KEY, DROP_FEEDBACK_MS, MAX_APPS } from '../config/toolsConfig';
import { getAppNameFromPath, isLaunchablePath } from '../utils/toolsUtils';
import type { AppShortcut, UseToolsTabReturn } from '../types/toolsTypes';

/**
 * 管理快捷启动列表与拖拽交互。
 * @returns 列表状态与交互回调
 */
export function useToolsTab(): UseToolsTabReturn {
  const { t } = useTranslation();
  const [apps, setApps] = useState<AppShortcut[]>([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dropError, setDropError] = useState(false);
  const [dropDuplicate, setDropDuplicate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const editRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  /** 加载应用快捷方式 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(APPS_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (Array.isArray(data)) setApps(data as AppShortcut[]);
      setAppsLoaded(true);
    }).catch(() => { if (!cancelled) setAppsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  /** 持久化 */
  useEffect(() => {
    if (!appsLoaded) return;
    window.api.storeWrite(APPS_STORE_KEY, apps).catch(() => {});
  }, [apps, appsLoaded]);

  /** 全局阻止默认拖拽行为（Electron 透明窗口必需） */
  useEffect(() => {
    const preventDragDefault = (e: DragEvent): void => {
      e.preventDefault();
    };
    document.addEventListener('dragover', preventDragDefault);
    document.addEventListener('drop', preventDragDefault);
    return () => {
      document.removeEventListener('dragover', preventDragDefault);
      document.removeEventListener('drop', preventDragDefault);
    };
  }, []);

  /** 聚焦编辑输入框 */
  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  /** 拖拽添加应用 */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    let hasInvalid = false;
    let hasValid = false;
    let hasDuplicate = false;
    let addedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const filePath = window.api.getPathForFile(files[i]);
      if (!filePath) continue;
      if (!isLaunchablePath(filePath)) { hasInvalid = true; continue; }
      if (apps.some(a => a.path === filePath)) { hasDuplicate = true; continue; }
      if (apps.length + addedCount >= MAX_APPS) break;
      hasValid = true;
      const name = getAppNameFromPath(filePath) || t('toolsTab.defaultAppName', { defaultValue: 'App' });
      try {
        const iconBase64 = await window.api.getFileIcon(filePath);
        setApps(prev => prev.length >= MAX_APPS ? prev : [...prev, { id: Date.now() + Math.random(), name, path: filePath, iconBase64 }]);
        addedCount += 1;
      } catch { /* noop */ }
    }
    if (hasInvalid && !hasValid) {
      setDropError(true);
      setTimeout(() => setDropError(false), DROP_FEEDBACK_MS);
    } else if (hasDuplicate && !hasValid) {
      setDropDuplicate(true);
      setTimeout(() => setDropDuplicate(false), DROP_FEEDBACK_MS);
    }
  }, [apps]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) setDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setDragOver(false);
    }
  }, []);

  /** 删除 */
  const removeApp = useCallback((id: number) => {
    setApps(prev => prev.filter(a => a.id !== id));
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  /** 开始编辑名称 */
  const startEdit = useCallback((app: AppShortcut) => {
    setEditingId(app.id);
    setEditName(app.name);
  }, []);

  /** 确认编辑 */
  const confirmEdit = useCallback(() => {
    if (editingId === null) return;
    const trimmed = editName.trim();
    if (trimmed) {
      setApps(prev => prev.map(a => a.id === editingId ? { ...a, name: trimmed } : a));
    }
    setEditingId(null);
  }, [editingId, editName]);

  /** 打开应用 */
  const openApp = useCallback((path: string) => {
    window.api.openFile(path).catch(() => {});
  }, []);

  return {
    apps,
    dragOver,
    dropError,
    dropDuplicate,
    editingId,
    editName,
    editRef,
    setEditName,
    setEditingId,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    removeApp,
    startEdit,
    confirmEdit,
    openApp,
  };
}
