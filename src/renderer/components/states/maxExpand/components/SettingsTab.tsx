/**
 * @file SettingsTab.tsx
 * @description 最大展开模式 — 设置 Tab
 * @author 鸡哥
 */

import React, { useState, useRef } from 'react';
import useIslandStore from '../../../../store/slices';

/** 单行配置项 */
function SettingsField({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <input
        className="settings-field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * 设置 Tab
 * @description 最大展开模式下的设置面板
 */
export function SettingsTab(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<'app' | 'ai'>('app');
  const { aiConfig, setAiConfig } = useIslandStore();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const startEditPrompt = (): void => {
    setPromptDraft(aiConfig.systemPrompt);
    setEditingPrompt(true);
    requestAnimationFrame(() => promptRef.current?.focus());
  };

  const savePrompt = (): void => {
    setAiConfig({ systemPrompt: promptDraft });
    setEditingPrompt(false);
  };

  return (
    <div className="max-expand-settings">
      <div className="max-expand-settings-header">
        <div className="max-expand-settings-header-title">设置</div>
      </div>

      <div className="max-expand-settings-layout">
        <div className="max-expand-settings-sidebar">
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'app' ? 'active' : ''}`}
            onClick={() => setActiveTab('app')}
            type="button"
          >
            <span className="sidebar-dot" />
            软件设置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
            <span className="sidebar-dot" />
            AI配置
          </button>
        </div>

        <div className="max-expand-settings-panel">
          {activeTab === 'app' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">软件设置</div>
              <div className="max-expand-settings-desc">此处用于放置软件相关配置项。</div>
            </div>
          )}
          {activeTab === 'ai' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">AI配置</div>
              <div className="settings-field-group">
                <SettingsField
                  label="API Key"
                  value={aiConfig.apiKey}
                  placeholder="sk-..."
                  type="password"
                  onChange={(v) => setAiConfig({ apiKey: v })}
                />
                <SettingsField
                  label="API Endpoint"
                  value={aiConfig.endpoint}
                  placeholder="https://api.openai.com/v1"
                  onChange={(v) => setAiConfig({ endpoint: v })}
                />
                <SettingsField
                  label="模型"
                  value={aiConfig.model}
                  placeholder="gpt-4o-mini"
                  onChange={(v) => setAiConfig({ model: v })}
                />
                <SettingsField
                  label="MCP Endpoint"
                  value={aiConfig.mcpEndpoint}
                  placeholder="http://localhost:3000/mcp (可选)"
                  onChange={(v) => setAiConfig({ mcpEndpoint: v })}
                />
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
                        <div className="settings-prompt-text">
                          {aiConfig.systemPrompt || <span className="settings-prompt-empty">未设置</span>}
                        </div>
                        <button className="settings-prompt-btn edit" onClick={startEditPrompt} type="button" title="编辑 Prompt">编辑</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
