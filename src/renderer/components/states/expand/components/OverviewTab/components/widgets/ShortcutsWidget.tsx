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
 * @file ShortcutsWidget.tsx
 * @description Overview 快捷启动小组件，展示用户配置的应用快捷方式并支持拖拽排序。
 * @author 鸡哥
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../store/slices';
import type { AppShortcut } from '../../utils/overviewUtils';

interface ShortcutsWidgetProps {
  apps: AppShortcut[];
  dragIndex: number | null;
  dragOverIndex: number | null;
  onOpenApp: (path: string) => void;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDragOver: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
}

/** 快捷启动小组件，展示应用快捷方式并支持拖拽排序。 */
export function ShortcutsWidget({
  apps,
  dragIndex,
  dragOverIndex,
  onOpenApp,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ShortcutsWidgetProps): React.ReactElement {
  const { t } = useTranslation();
  const { setExpandTab } = useIslandStore();

  return (
    <div className="ov-dash-apps-wrap">
      <div className="ov-dash-apps-header">
        <span className="ov-dash-apps-title clickable" onClick={() => setExpandTab('tools')} title={t('overview.shortcuts.editTitle', { defaultValue: '编辑快捷启动' })}>{t('overview.shortcuts.title', { defaultValue: '快捷启动' })}</span>
        <span className="ov-dash-apps-count">{t('overview.shortcuts.count', { defaultValue: '{{count}} 项', count: apps.length })}</span>
      </div>
      <div className="ov-dash-apps">
        {apps.length === 0 && (
          <div className="ov-dash-apps-empty">{t('overview.shortcuts.emptyHint', { defaultValue: '在系统工具中添加' })}</div>
        )}
        {apps.map((app, index) => (
          <div
            key={app.id}
            className={`ov-dash-app-item ${dragOverIndex === index ? 'drag-over' : ''} ${dragIndex === index ? 'dragging' : ''}`}
            onClick={() => onOpenApp(app.path)}
            title={app.name}
            draggable
            onDragStart={(event) => onDragStart(event, index)}
            onDragOver={(event) => onDragOver(event, index)}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={onDragEnd}
          >
            {app.iconBase64 ? (
              <img className="ov-dash-app-icon" src={`data:image/png;base64,${app.iconBase64}`} alt={app.name} />
            ) : (
              <div className="ov-dash-app-icon-placeholder">📂</div>
            )}
            <span className="ov-dash-app-name">{app.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
