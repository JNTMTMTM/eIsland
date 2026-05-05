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
 * @file LayoutPreviewSettingsPage.tsx
 * @description 设置页面 - 软件设置总览布局子界面
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppSettingsSectionProps } from './types';

type LayoutPreviewSettingsPageProps = Pick<AppSettingsSectionProps, 'layoutConfig' | 'OverviewPreviewComponent' | 'overviewWidgetOptions' | 'updateLayout'>;

/**
 * 渲染软件设置中的总览布局配置页面
 * @param layoutConfig - 当前总览布局配置
 * @param OverviewPreviewComponent - 总览预览组件
 * @param overviewWidgetOptions - 左右控件可选项
 * @param updateLayout - 更新左右控件布局方法
 * @returns 总览布局设置页面
 */
export function LayoutPreviewSettingsPage({
  layoutConfig,
  OverviewPreviewComponent,
  overviewWidgetOptions,
  updateLayout,
}: LayoutPreviewSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const OverviewPreview = OverviewPreviewComponent;

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.previewTitle', { defaultValue: '总览布局预览' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.previewHint', { defaultValue: '实时显示左右控件组合后的 Expand 态灵动岛样式，切换下方控件可即时预览。' })}</div>
          </div>
          <div className="settings-island-preview-wrap">
            <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
              <OverviewPreview layoutConfig={layoutConfig} />
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.layout.widgetPickerTitle', { defaultValue: '控件组合' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.layout.widgetPickerHint', { defaultValue: '分别选择左右两侧展示的控件，切换后自动保存。' })}</div>
          </div>
          <div className="settings-layout-controls">
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.leftWidget', { defaultValue: '左侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.left === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('left', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-layout-control">
              <span className="settings-layout-control-label">{t('settings.app.layout.rightWidget', { defaultValue: '右侧控件' })}</span>
              <div className="settings-layout-options">
                {overviewWidgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={`settings-layout-btn ${layoutConfig.right === opt.value ? 'active' : ''}`}
                    type="button"
                    onClick={() => updateLayout('right', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
