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
 * @file AiSettingsSection.tsx
 * @description 设置页面 - AI 配置区块
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

interface AiSettingsSectionProps {
  aiConfig: {
    apiKey: string;
    endpoint: string;
    workspaces: string[];
  };
  setAiConfig: (config: Partial<AiSettingsSectionProps['aiConfig']>) => void;
  onAddWorkspace: () => void;
  onRemoveWorkspace: (index: number) => void;
  SettingsFieldComponent: (props: {
    label: string;
    value: string;
    placeholder?: string;
    type?: string;
    onChange: (v: string) => void;
  }) => ReactElement;
}

/**
 * 渲染 AI 设置区块
 * @param props - AI 配置和交互参数
 * @returns AI 设置区域
 */
export function AiSettingsSection({
  aiConfig,
  setAiConfig,
  onAddWorkspace,
  onRemoveWorkspace,
  SettingsFieldComponent,
}: AiSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const SettingsField = SettingsFieldComponent;
  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">{t('settings.labels.ai', { defaultValue: 'AI Agent' })}</div>
      <div className="settings-cards">

        {/* 卡片 1:模型凭据 */}
        <div className="settings-card" style={{ opacity: 0.5, pointerEvents: 'none' }} aria-disabled="true">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.ai.credentialsTitle', { defaultValue: '模型凭据' })}</div>
            <div className="settings-card-subtitle">{t('settings.ai.credentialsHint', { defaultValue: '模型凭据已迁移到 Agent 面板配置' })}</div>
          </div>
          <div className="settings-field-group">
            <SettingsField
              label={t('settings.ai.apiKey', { defaultValue: 'API Key' })}
              value={aiConfig.apiKey}
              placeholder="sk-..."
              type="password"
              onChange={(v) => setAiConfig({ apiKey: v })}
            />
            <SettingsField
              label={t('settings.ai.apiEndpoint', { defaultValue: 'API Endpoint' })}
              value={aiConfig.endpoint}
              placeholder="https://api.openai.com/v1"
              onChange={(v) => setAiConfig({ endpoint: v })}
            />
          </div>
        </div>

        {/* 卡片 2:工作区 */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.ai.workspaceTitle', { defaultValue: 'Agent 工作区' })}</div>
            <div className="settings-card-subtitle">{t('settings.ai.workspaceHint', { defaultValue: '配置 Agent 可操作的文件目录,所有文件读写、搜索、命令执行仅限于工作区内' })}</div>
          </div>
          <div className="settings-ai-workspace-area">
            {aiConfig.workspaces.length > 0 && (
              <ul className="settings-ai-workspace-list">
                {aiConfig.workspaces.map((ws, idx) => (
                  <li key={ws} className="settings-ai-workspace-item">
                    <span className="settings-ai-workspace-path" title={ws}>{ws}</span>
                    <button
                      className="settings-ai-workspace-remove-btn"
                      type="button"
                      onClick={() => onRemoveWorkspace(idx)}
                      title={t('settings.ai.workspaceRemove', { defaultValue: '移除' })}
                      aria-label={t('settings.ai.workspaceRemove', { defaultValue: '移除' })}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {aiConfig.workspaces.length === 0 && (
              <div className="settings-ai-workspace-empty">
                {t('settings.ai.workspaceEmpty', { defaultValue: '未配置工作区，Agent 文件操作将被禁止' })}
              </div>
            )}
            <button
              className="settings-ai-workspace-add-btn"
              type="button"
              onClick={onAddWorkspace}
            >
              {t('settings.ai.workspaceAdd', { defaultValue: '+ 添加工作区文件夹' })}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
