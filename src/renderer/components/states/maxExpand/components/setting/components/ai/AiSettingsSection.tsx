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

import { useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { AiSettingsPageDots } from './AiSettingsPageDots';
import type { AiSettingsPageKey } from '../../utils/settingsConfig';
import { SvgIcon } from '../../../../../../../utils/SvgIcon';
import { getOllamaModels, detectOllamaBaseUrl } from '../../../../../../../api/ai/ollamaLocalAgent';

interface AiSettingsSectionProps {
  currentAiSettingsPageLabel: string;
  aiSettingsPage: AiSettingsPageKey;
  aiConfig: {
    apiKey: string;
    endpoint: string;
    model: string;
    customApiModel: string;
    workspaces: string[];
    r1pxcAvatar: string;
    ollamaModel: string;
    ollamaBaseUrl: string;
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
  aiSettingsPages: AiSettingsPageKey[];
  aiSettingsPageLabels: Record<string, string>;
  setAiSettingsPage: (page: AiSettingsPageKey) => void;
  isProUser: boolean;
}

/**
 * 渲染 AI 设置区块
 * @param props - AI 配置和交互参数
 * @returns AI 设置区域
 */
export function AiSettingsSection({
  currentAiSettingsPageLabel,
  aiSettingsPage,
  aiConfig,
  setAiConfig,
  onAddWorkspace,
  onRemoveWorkspace,
  SettingsFieldComponent,
  aiSettingsPages,
  aiSettingsPageLabels,
  setAiSettingsPage,
  isProUser,
}: AiSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const SettingsField = SettingsFieldComponent;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string>('');

  // ── Ollama 设置页状态 ──
  const [ollamaModelsList, setOllamaModelsList] = useState<string[]>([]);
  const [ollamaFetching, setOllamaFetching] = useState<boolean>(false);
  const [ollamaDetecting, setOllamaDetecting] = useState<boolean>(false);
  const [ollamaModelsHint, setOllamaModelsHint] = useState<string>('');
  const [ollamaDetectHint, setOllamaDetectHint] = useState<string>('');
  const [agentModelsList, setAgentModelsList] = useState<string[]>([]);
  const [agentModelsFetching, setAgentModelsFetching] = useState<boolean>(false);
  const [agentModelsHint, setAgentModelsHint] = useState<string>('');

  const resolveAgentModelsUrl = (rawEndpoint: string): string => {
    const endpoint = rawEndpoint.trim().replace(/\/+$/, '');
    if (!endpoint) {
      return '';
    }
    if (endpoint.endsWith('/v1/models') || endpoint.endsWith('/models')) {
      return endpoint;
    }
    if (endpoint.endsWith('/v1/chat/completions')) {
      return endpoint.replace(/\/v1\/chat\/completions$/, '/v1/models');
    }
    if (endpoint.endsWith('/chat/completions')) {
      return endpoint.replace(/\/chat\/completions$/, '/models');
    }
    if (endpoint.endsWith('/v1')) {
      return `${endpoint}/models`;
    }
    return `${endpoint}/v1/models`;
  };

  const handleFetchAgentModels = async (): Promise<void> => {
    const endpoint = aiConfig.endpoint?.trim() || '';
    if (!endpoint) {
      setAgentModelsList([]);
      setAgentModelsHint(t('settings.ai.agentModelFetchNeedEndpoint', { defaultValue: '请先填写 API Endpoint' }));
      return;
    }
    const modelsUrl = resolveAgentModelsUrl(endpoint);
    setAgentModelsFetching(true);
    setAgentModelsHint('');
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const apiKey = aiConfig.apiKey?.trim() || '';
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      const response = await fetch(modelsUrl, { method: 'GET', headers });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json() as {
        data?: Array<{ id?: unknown }>;
      };
      const list = Array.isArray(payload?.data)
        ? payload.data
          .map((item) => (typeof item?.id === 'string' ? item.id.trim() : ''))
          .filter((item) => item.length > 0)
        : [];
      setAgentModelsList(list);
      setAgentModelsHint(
        list.length > 0
          ? t('settings.ai.agentModelFetchOk', { defaultValue: '已获取 {{count}} 个模型', count: list.length })
          : t('settings.ai.agentModelFetchEmpty', { defaultValue: '未获取到模型，请检查接口是否支持 /models' }),
      );
    } catch {
      setAgentModelsList([]);
      setAgentModelsHint(t('settings.ai.agentModelFetchFail', { defaultValue: '获取模型列表失败，请检查 Endpoint / Key' }));
    } finally {
      setAgentModelsFetching(false);
    }
  };

  const handleFetchOllamaModels = async (): Promise<void> => {
    setOllamaFetching(true);
    setOllamaModelsHint('');
    try {
      const baseUrl = aiConfig.ollamaBaseUrl?.trim() || undefined;
      const list = await getOllamaModels(baseUrl);
      setOllamaModelsList(list);
      if (list.length === 0) {
        setOllamaModelsHint(t('settings.ai.ollamaFetchEmpty', { defaultValue: '未检测到本地 Ollama 模型' }));
      } else {
        setOllamaModelsHint(t('settings.ai.ollamaFetchOk', {
          defaultValue: '已找到 {{count}} 个本地模型',
          count: list.length,
        }));
      }
    } catch {
      setOllamaModelsList([]);
      setOllamaModelsHint(t('settings.ai.ollamaFetchFail', { defaultValue: '获取模型列表失败，请检查 Ollama 服务' }));
    } finally {
      setOllamaFetching(false);
    }
  };

  const handleDetectOllamaPort = async (): Promise<void> => {
    setOllamaDetecting(true);
    setOllamaDetectHint('');
    try {
      const detected = await detectOllamaBaseUrl();
      if (detected) {
        setAiConfig({ ollamaBaseUrl: detected });
        setOllamaDetectHint(t('settings.ai.ollamaDetectOk', {
          defaultValue: '已检测到 {{url}}',
          url: detected,
        }));
      } else {
        setOllamaDetectHint(t('settings.ai.ollamaDetectFail', {
          defaultValue: '未检测到运行中的 Ollama 服务，请确认已启动 ollama serve',
        }));
      }
    } finally {
      setOllamaDetecting(false);
    }
  };

  const readAvatarFile = (file: File): void => {
    if (!file.type.startsWith('image/')) {
      setAvatarUploadError(t('settings.ai.r1pxcAvatarFileTypeError', { defaultValue: '请选择图片文件（png/jpg/webp 等）' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        setAvatarUploadError(t('settings.ai.r1pxcAvatarReadError', { defaultValue: '头像读取失败，请换一张图片重试' }));
        return;
      }
      setAvatarUploadError('');
      setAiConfig({ r1pxcAvatar: result });
    };
    reader.onerror = () => {
      setAvatarUploadError(t('settings.ai.r1pxcAvatarReadError', { defaultValue: '头像读取失败，请换一张图片重试' }));
    };
    reader.readAsDataURL(file);
  };

  const renderGeneralPage = (): ReactElement => (
    <div className="settings-cards">
      {/* 卡片 1:模型凭据 */}
      <div className="settings-card" style={isProUser ? undefined : { opacity: 0.5, pointerEvents: 'none' }} aria-disabled={!isProUser}>
        <div className="settings-card-header">
          <div className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={SvgIcon.PRO} alt="PRO" width={16} height={16} style={{ flexShrink: 0 }} />
            {t('settings.ai.credentialsTitle', { defaultValue: '模型凭据' })}
          </div>
          <div className="settings-card-subtitle">{t('settings.ai.credentialsHint', { defaultValue: '用于 Agent 中转调用的自定义 API 凭据（可选）' })}</div>
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
          <SettingsField
            label={t('settings.ai.agentModel', { defaultValue: 'Agent 模型' })}
            value={aiConfig.customApiModel}
            placeholder="gpt-4o-mini"
            onChange={(v) => setAiConfig({ customApiModel: v })}
          />
          <button
            className="settings-ai-workspace-add-btn"
            type="button"
            disabled={agentModelsFetching}
            onClick={() => void handleFetchAgentModels()}
            style={{ marginTop: -4 }}
          >
            {agentModelsFetching
              ? t('settings.ai.agentModelFetching', { defaultValue: '正在获取…' })
              : t('settings.ai.agentModelFetchBtn', { defaultValue: '获取可用模型' })}
          </button>
          {agentModelsHint && (
            <div style={{ fontSize: 11, color: 'rgba(var(--color-text-rgb), 0.5)', marginTop: -2 }}>
              {agentModelsHint}
            </div>
          )}
          {agentModelsList.length > 0 && (
            <div className="settings-field" style={{ marginTop: 2 }}>
              <label className="settings-field-label">
                {t('settings.ai.agentModelDropdown', { defaultValue: '模型下拉选择' })}
              </label>
              <select
                className="settings-field-input"
                value={agentModelsList.includes(aiConfig.customApiModel) ? aiConfig.customApiModel : ''}
                onChange={(event) => {
                  const nextModel = event.target.value;
                  if (nextModel) {
                    setAiConfig({ customApiModel: nextModel });
                  }
                }}
              >
                <option value="">{t('settings.ai.agentModelSelectPlaceholder', { defaultValue: '请选择模型' })}</option>
                {agentModelsList.map((modelItem) => (
                  <option key={modelItem} value={modelItem}>
                    {modelItem}
                  </option>
                ))}
              </select>
            </div>
          )}
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
  );

  const renderR1pxcPage = (): ReactElement => (
    <div className="settings-cards">
      {/* r1pxc Agent 头像配置 */}
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">{t('settings.ai.r1pxcConfigTitle', { defaultValue: 'r1pxc Agent 头像配置' })}</div>
          <div className="settings-card-subtitle">{t('settings.ai.r1pxcConfigHint', { defaultValue: '支持拖入图片或从文件资源管理器选择，不支持 URL' })}</div>
        </div>
        <div className="settings-field-group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                readAvatarFile(file);
              }
              event.currentTarget.value = '';
            }}
          />
          <div
            className="settings-r1pxc-avatar-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                readAvatarFile(file);
              }
            }}
          >
            {aiConfig.r1pxcAvatar ? (
              <div className="settings-r1pxc-avatar-preview">
                <img
                  className="settings-r1pxc-avatar-img"
                  src={aiConfig.r1pxcAvatar}
                  alt="r1pxc-avatar"
                />
                <span className="settings-r1pxc-avatar-hint">
                  {t('settings.ai.r1pxcAvatarReplace', { defaultValue: '点击或拖入图片以替换头像' })}
                </span>
              </div>
            ) : (
              <span className="settings-r1pxc-avatar-hint">
                {t('settings.ai.r1pxcAvatarUploadHint', { defaultValue: '拖入图片，或点击从文件资源管理器选择' })}
              </span>
            )}
          </div>
          {avatarUploadError && (
            <div className="settings-r1pxc-avatar-error">
              {avatarUploadError}
            </div>
          )}
          {aiConfig.r1pxcAvatar && (
            <button
              className="settings-r1pxc-avatar-clear-btn"
              type="button"
              onClick={() => {
                setAvatarUploadError('');
                setAiConfig({ r1pxcAvatar: '' });
              }}
            >
              {t('settings.ai.r1pxcAvatarClear', { defaultValue: '清除头像' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderOllamaPage = (): ReactElement => (
    <div className="settings-cards">
      <div className="settings-card" style={isProUser ? undefined : { opacity: 0.5, pointerEvents: 'none' }} aria-disabled={!isProUser}>
        <div className="settings-card-header">
          <div className="settings-card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={SvgIcon.PRO} alt="PRO" width={16} height={16} style={{ flexShrink: 0 }} />
            {t('settings.ai.ollamaTitle', { defaultValue: 'Ollama 本地模型' })}
          </div>
          <div className="settings-card-subtitle">{t('settings.ai.ollamaHint', { defaultValue: '配置本地 Ollama 服务地址与默认模型，在模型下拉中选择 ollama 即可使用' })}</div>
        </div>
        <div className="settings-field-group">
          {/* 模型名称 + 获取按钮 */}
          <SettingsField
            label={t('settings.ai.ollamaModel', { defaultValue: '模型名称' })}
            value={aiConfig.ollamaModel}
            placeholder="qwen3:8b"
            onChange={(v) => setAiConfig({ ollamaModel: v })}
          />
          <button
            className="settings-ai-workspace-add-btn"
            type="button"
            disabled={ollamaFetching}
            onClick={() => void handleFetchOllamaModels()}
            style={{ marginTop: -4 }}
          >
            {ollamaFetching
              ? t('settings.ai.ollamaFetching', { defaultValue: '正在获取…' })
              : t('settings.ai.ollamaFetchBtn', { defaultValue: '获取本地模型列表' })}
          </button>
          {ollamaModelsHint && (
            <div style={{ fontSize: 11, color: 'rgba(var(--color-text-rgb), 0.5)', marginTop: -2 }}>
              {ollamaModelsHint}
            </div>
          )}
          {ollamaModelsList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {ollamaModelsList.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`settings-ollama-model-chip${aiConfig.ollamaModel === m ? ' active' : ''}`}
                  onClick={() => setAiConfig({ ollamaModel: m })}
                  title={m}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* 服务地址 + 自动检测按钮 */}
          <SettingsField
            label={t('settings.ai.ollamaBaseUrl', { defaultValue: '服务地址' })}
            value={aiConfig.ollamaBaseUrl}
            placeholder="http://localhost:11434"
            onChange={(v) => setAiConfig({ ollamaBaseUrl: v })}
          />
          <button
            className="settings-ai-workspace-add-btn"
            type="button"
            disabled={ollamaDetecting}
            onClick={() => void handleDetectOllamaPort()}
            style={{ marginTop: -4 }}
          >
            {ollamaDetecting
              ? t('settings.ai.ollamaDetecting', { defaultValue: '正在检测…' })
              : t('settings.ai.ollamaDetectBtn', { defaultValue: '自动检测 Ollama 端口' })}
          </button>
          {ollamaDetectHint && (
            <div style={{ fontSize: 11, color: 'rgba(var(--color-text-rgb), 0.5)', marginTop: -2 }}>
              {ollamaDetectHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCurrentPage = (): ReactElement | null => {
    switch (aiSettingsPage) {
      case 'general':
        return renderGeneralPage();
      case 'r1pxc':
        return renderR1pxcPage();
      case 'ollama':
        return renderOllamaPage();
      default:
        return null;
    }
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.ai', { defaultValue: 'AI Agent' })}</span>
        <span className="settings-app-title-sub">- {currentAiSettingsPageLabel}</span>
      </div>
      <div className="settings-app-pages-layout">
        <div className="settings-app-page-main">{renderCurrentPage()}</div>

        <AiSettingsPageDots
          aiSettingsPage={aiSettingsPage}
          aiSettingsPages={aiSettingsPages}
          settingsTabLabels={aiSettingsPageLabels}
          setAiSettingsPage={setAiSettingsPage}
        />
      </div>
    </div>
  );
}
