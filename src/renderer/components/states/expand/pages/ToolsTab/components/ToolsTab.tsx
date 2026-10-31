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

import { useTranslation } from 'react-i18next';
import { useToolsTab } from '../hooks/useToolsTab';
import type { ReactElement } from 'react';

/**
 * 系统工具 Tab
 * @description 展开状态下的快捷启动管理面板
 * @returns 快捷启动面板
 */
export function ToolsTab(): ReactElement {
  const { t } = useTranslation();
  const {
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
  } = useToolsTab();

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
            <span className="tools-drop-zone-hint active">{t('toolsTab.drop.releaseToAdd', { defaultValue: '松开添加' })}</span>
          ) : dropError ? (
            <span className="tools-drop-zone-hint error">{t('toolsTab.drop.onlyExe', { defaultValue: '仅支持 .exe 或 .lnk 文件' })}</span>
          ) : dropDuplicate ? (
            <span className="tools-drop-zone-hint duplicate">{t('toolsTab.drop.duplicate', { defaultValue: '已存在该应用' })}</span>
          ) : (
            <>
              <span className="tools-drop-zone-icon">+</span>
              <span className="tools-drop-zone-hint">{t('toolsTab.drop.dragExe', { defaultValue: '拖入 .exe 或 .lnk' })}</span>
            </>
          )}
        </div>
      </div>

      {/* ===== 右侧：快捷启动列表 ===== */}
      <div className="tools-app-list">
        <div className="tools-app-list-header">
          <span className="tools-app-list-title">{t('toolsTab.title', { defaultValue: '快捷启动' })}</span>
          <span className="tools-app-list-count">{t('toolsTab.count', { defaultValue: '{{count}} 项', count: apps.length })}</span>
        </div>
        <div className="tools-app-list-body">
          {apps.length === 0 ? (
            <div className="tools-app-list-empty">{t('toolsTab.empty', { defaultValue: '暂无快捷启动项' })}</div>
          ) : (
            apps.map(app => (
              <div key={app.id} className="tools-app-row">
                <div className="tools-app-icon-wrap" onClick={() => openApp(app.path)} title={t('toolsTab.launchTitle', { defaultValue: '点击启动' })}>
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
                  <span className="tools-app-name" onDoubleClick={() => startEdit(app)} title={t('toolsTab.editNameByDoubleClick', { defaultValue: '双击编辑名称' })}>
                    {app.name}
                  </span>
                )}
                <span className="tools-app-path" title={app.path}>{app.path}</span>
                <button className="tools-app-edit" onClick={() => startEdit(app)} title={t('toolsTab.editName', { defaultValue: '编辑名称' })}>✎</button>
                <button className="tools-app-delete" onClick={() => removeApp(app.id)} title={t('toolsTab.delete', { defaultValue: '删除' })}>×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
