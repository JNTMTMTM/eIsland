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

import type { ReactElement, RefObject } from 'react';

interface AiSettingsSectionProps {
  aiConfig: {
    apiKey: string;
    endpoint: string;
    model: string;
    mcpEndpoint: string;
    systemPrompt: string;
  };
  editingPrompt: boolean;
  promptDraft: string;
  promptRef: RefObject<HTMLTextAreaElement | null>;
  setAiConfig: (config: any) => void;
  setPromptDraft: (v: string) => void;
  savePrompt: () => void;
  startEditPrompt: () => void;
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
  editingPrompt,
  promptDraft,
  promptRef,
  setAiConfig,
  setPromptDraft,
  savePrompt,
  startEditPrompt,
  SettingsFieldComponent,
}: AiSettingsSectionProps): ReactElement {
  const SettingsField = SettingsFieldComponent;
  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title">AI Agent</div>
      <div className="settings-field-group">
        <SettingsField label="API Key" value={aiConfig.apiKey} placeholder="sk-..." type="password" onChange={(v) => setAiConfig({ apiKey: v })} />
        <SettingsField label="API Endpoint" value={aiConfig.endpoint} placeholder="https://api.openai.com/v1" onChange={(v) => setAiConfig({ endpoint: v })} />
        <SettingsField label="模型" value={aiConfig.model} placeholder="gpt-4o-mini" onChange={(v) => setAiConfig({ model: v })} />
        <SettingsField label="MCP Endpoint" value={aiConfig.mcpEndpoint} placeholder="http://localhost:3000/mcp (可选)" onChange={(v) => setAiConfig({ mcpEndpoint: v })} />
        <div className="settings-field">
          <span className="settings-field-label">System Prompt</span>
          <div className="settings-prompt-area">
            {editingPrompt ? (
              <>
                <textarea
                  ref={promptRef}
                  className="settings-field-textarea"
                  placeholder="你是一个有用的助手。"
                  value={promptDraft}
                  onChange={(e) => setPromptDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); savePrompt(); }
                  }}
                  rows={3}
                />
                <button className="settings-prompt-btn save" onClick={savePrompt} type="button" title="保存 (Ctrl+Enter)">保存</button>
              </>
            ) : (
              <>
                <div className="settings-prompt-text">{aiConfig.systemPrompt || <span className="settings-prompt-empty">未设置</span>}</div>
                <button className="settings-prompt-btn edit" onClick={startEditPrompt} type="button" title="编辑 Prompt">编辑</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
