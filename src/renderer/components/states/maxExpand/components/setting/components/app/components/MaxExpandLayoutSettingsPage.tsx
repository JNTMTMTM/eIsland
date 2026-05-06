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
 * @file MaxExpandLayoutSettingsPage.tsx
 * @description 设置页面 - 全展开界面布局配置子界面（拖拽排序 + 可见性开关）
 * @author 鸡哥
 */

import { useCallback, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { MaxExpandNavLayoutConfig } from '../../../utils/settingsConfig';
import { MAXEXPAND_TAB_LABELS } from '../../../utils/settingsConfig';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';

interface MaxExpandLayoutSettingsPageProps {
  maxExpandNavLayout: MaxExpandNavLayoutConfig;
  updateMaxExpandNavLayout: (layout: MaxExpandNavLayoutConfig) => void;
}

/**
 * 渲染全展开布局配置页面
 * @param maxExpandNavLayout - 当前全展开导航布局配置
 * @param updateMaxExpandNavLayout - 更新布局配置方法
 * @returns 全展开布局设置页面
 */
export function MaxExpandLayoutSettingsPage({
  maxExpandNavLayout,
  updateMaxExpandNavLayout,
}: MaxExpandLayoutSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);

  const getTabLabel = useCallback((id: string): string => {
    return t(`settings.app.maxExpandLayout.tabLabels.${id}`, { defaultValue: MAXEXPAND_TAB_LABELS[id] || id });
  }, [t]);

  const handleDragStart = (idx: number): void => {
    dragIdxRef.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number): void => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDragLeave = (): void => {
    setDragOverIdx(null);
  };

  const handleDrop = (targetIdx: number): void => {
    const sourceIdx = dragIdxRef.current;
    if (sourceIdx === null || sourceIdx === targetIdx) {
      setDragOverIdx(null);
      dragIdxRef.current = null;
      return;
    }
    const updated = [...maxExpandNavLayout];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);
    updateMaxExpandNavLayout(updated);
    setDragOverIdx(null);
    dragIdxRef.current = null;
  };

  const handleDragEnd = (): void => {
    setDragOverIdx(null);
    dragIdxRef.current = null;
  };

  const toggleVisible = (idx: number): void => {
    const updated = [...maxExpandNavLayout];
    updated[idx] = { ...updated[idx], visible: !updated[idx].visible };
    updateMaxExpandNavLayout(updated);
  };

  const moveItem = (idx: number, direction: 'up' | 'down'): void => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= maxExpandNavLayout.length) return;
    const updated = [...maxExpandNavLayout];
    [updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]];
    updateMaxExpandNavLayout(updated);
  };

  const visibleCount = maxExpandNavLayout.filter((item) => item.visible).length;

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        {/* 预览区域 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.maxExpandLayout.previewTitle', { defaultValue: '全展开导航预览' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.maxExpandLayout.previewHint', { defaultValue: '预览底部导航点的排列顺序，灰色表示已隐藏的页面。' })}</div>
          </div>
          <div className="maxexpand-layout-preview-wrap">
            <div className="maxexpand-layout-preview-dots">
              <div className="maxexpand-layout-preview-dot maxexpand-layout-preview-dot--fixed" title={t('settings.app.maxExpandLayout.backLabel', { defaultValue: '返回' })}>
                <span className="maxexpand-layout-dot-label">{t('settings.app.maxExpandLayout.backLabel', { defaultValue: '返回' })}</span>
              </div>
              {maxExpandNavLayout.map((item) => (
                <div
                  key={item.id}
                  className={`maxexpand-layout-preview-dot${item.visible ? '' : ' maxexpand-layout-preview-dot--hidden'}`}
                  title={getTabLabel(item.id)}
                >
                  <span className="maxexpand-layout-dot-label">{getTabLabel(item.id)}</span>
                </div>
              ))}
              <div className="maxexpand-layout-preview-dot maxexpand-layout-preview-dot--fixed" title={t('settings.app.maxExpandLayout.settingsLabel', { defaultValue: '设置' })}>
                <span className="maxexpand-layout-dot-label">{t('settings.app.maxExpandLayout.settingsLabel', { defaultValue: '设置' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 排序与可见性配置 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.maxExpandLayout.orderTitle', { defaultValue: '页面排序与可见性' })}</div>
            <div className="settings-card-subtitle">
              {t('settings.app.maxExpandLayout.orderHint', { defaultValue: '拖拽调整页面顺序，点击开关切换是否显示。当前显示 {{count}} / {{total}} 个页面。', count: visibleCount, total: maxExpandNavLayout.length })}
            </div>
          </div>
          <div className="maxexpand-layout-list">
            {maxExpandNavLayout.map((item, idx) => (
              <div
                key={item.id}
                className={`maxexpand-layout-item${dragOverIdx === idx ? ' maxexpand-layout-item--drag-over' : ''}${!item.visible ? ' maxexpand-layout-item--disabled' : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(idx)}
                onDragEnd={handleDragEnd}
              >
                <img src={SvgIcon.DRAG} alt="" className="maxexpand-layout-item-handle-icon" />
                <span className="maxexpand-layout-item-index">{idx + 1}</span>
                <span className="maxexpand-layout-item-label">{getTabLabel(item.id)}</span>
                <div className="maxexpand-layout-item-actions">
                  <button
                    className="maxexpand-layout-item-move-btn"
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, 'up')}
                    title={t('settings.app.maxExpandLayout.moveUp', { defaultValue: '上移' })}
                  >
                    <img src={SvgIcon.MOVE_UP} alt="" className="maxexpand-layout-item-btn-icon" />
                  </button>
                  <button
                    className="maxexpand-layout-item-move-btn"
                    type="button"
                    disabled={idx === maxExpandNavLayout.length - 1}
                    onClick={() => moveItem(idx, 'down')}
                    title={t('settings.app.maxExpandLayout.moveDown', { defaultValue: '下移' })}
                  >
                    <img src={SvgIcon.MOVE_DOWN} alt="" className="maxexpand-layout-item-btn-icon" />
                  </button>
                  <button
                    className={`maxexpand-layout-item-toggle${item.visible ? ' maxexpand-layout-item-toggle--on' : ''}`}
                    type="button"
                    onClick={() => toggleVisible(idx)}
                    title={item.visible
                      ? t('settings.app.maxExpandLayout.hideTab', { defaultValue: '隐藏此页面' })
                      : t('settings.app.maxExpandLayout.showTab', { defaultValue: '显示此页面' })
                    }
                  >
                    <img src={item.visible ? SvgIcon.VISIBLE : SvgIcon.INVISIBLE} alt="" className="maxexpand-layout-item-btn-icon" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
