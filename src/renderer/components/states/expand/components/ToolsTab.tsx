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
 * @file ToolsTab.tsx
 * @description Expanded 系统工具 Tab — 快捷启动管理
 * @author 鸡哥
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';

/** 应用快捷方式 */
interface AppShortcut {
  id: number;
  name: string;
  path: string;
  iconBase64: string | null;
}

/** 存储键名 */
const APPS_STORE_KEY = 'app-shortcuts';
/** 最大快捷启动数量 */
const MAX_APPS = 18;

/**
 * 系统工具 Tab
 * @description 展开状态下的快捷启动管理面板
 */
export function ToolsTab(): React.ReactElement {
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
    for (let i = 0; i < files.length; i++) {
      const filePath = window.api.getPathForFile(files[i]);
      if (!filePath) continue;
      if (!filePath.toLowerCase().endsWith('.exe')) { hasInvalid = true; continue; }
      if (apps.some(a => a.path === filePath)) { hasDuplicate = true; continue; }
      if (apps.length >= MAX_APPS) break;
      hasValid = true;
      const name = filePath.split('\\').pop()?.replace(/\.exe$/i, '') || 'App';
      try {
        const iconBase64 = await window.api.getFileIcon(filePath);
        setApps(prev => [...prev, { id: Date.now() + Math.random(), name, path: filePath, iconBase64 }]);
      } catch { /* noop */ }
    }
    if (hasInvalid && !hasValid) {
      setDropError(true);
      setTimeout(() => setDropError(false), 2000);
    } else if (hasDuplicate && !hasValid) {
      setDropDuplicate(true);
      setTimeout(() => setDropDuplicate(false), 2000);
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

  return (
    <div className="expand-tab-panel tools-panel">
      {/* ===== 左侧：拖拽添加区 ===== */}
      <div
        className={`tools-drop-zone ${dragOver ? 'drag-over' : ''} ${dropError ? 'drop-error' : ''} ${dropDuplicate ? 'drop-duplicate' : ''}`}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="tools-drop-zone-inner">
          {dragOver ? (
            <span className="tools-drop-zone-hint active">松开添加</span>
          ) : dropError ? (
            <span className="tools-drop-zone-hint error">仅支持 .exe 文件</span>
          ) : dropDuplicate ? (
            <span className="tools-drop-zone-hint duplicate">已存在该应用</span>
          ) : (
            <>
              <span className="tools-drop-zone-icon">+</span>
              <span className="tools-drop-zone-hint">拖入 .exe</span>
            </>
          )}
        </div>
      </div>

      {/* ===== 右侧：快捷启动列表 ===== */}
      <div className="tools-app-list">
        <div className="tools-app-list-header">
          <span className="tools-app-list-title">快捷启动</span>
          <span className="tools-app-list-count">{apps.length} 项</span>
        </div>
        <div className="tools-app-list-body">
          {apps.length === 0 ? (
            <div className="tools-app-list-empty">暂无快捷启动项</div>
          ) : (
            apps.map(app => (
              <div key={app.id} className="tools-app-row">
                <div className="tools-app-icon-wrap" onClick={() => openApp(app.path)} title="点击启动">
                  {app.iconBase64 ? (
                    <img className="tools-app-icon" src={`data:image/png;base64,${app.iconBase64}`} alt={app.name} />
                  ) : (
                    <span className="tools-app-icon-placeholder">📂</span>
                  )}
                </div>
                {editingId === app.id ? (
                  <input
                    ref={editRef}
                    className="tools-app-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={confirmEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="tools-app-name" onDoubleClick={() => startEdit(app)} title="双击编辑名称">
                    {app.name}
                  </span>
                )}
                <span className="tools-app-path" title={app.path}>{app.path}</span>
                <button className="tools-app-edit" onClick={() => startEdit(app)} title="编辑名称">✎</button>
                <button className="tools-app-delete" onClick={() => removeApp(app.id)} title="删除">×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
