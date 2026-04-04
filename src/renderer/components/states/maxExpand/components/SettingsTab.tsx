/**
 * @file SettingsTab.tsx
 * @description 最大展开模式 — 设置 Tab
 * @author 鸡哥
 */

import React from 'react';
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

/** 多行配置项 */
function SettingsTextarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <textarea
        className="settings-field-textarea"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
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
                <SettingsTextarea
                  label="System Prompt"
                  value={aiConfig.systemPrompt}
                  placeholder="你是一个有用的助手。"
                  onChange={(v) => setAiConfig({ systemPrompt: v })}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
