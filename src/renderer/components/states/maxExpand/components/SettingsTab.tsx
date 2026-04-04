/**
 * @file SettingsTab.tsx
 * @description 最大展开模式 — 设置 Tab
 * @author 鸡哥
 */

import React from 'react';

/**
 * 设置 Tab
 * @description 最大展开模式下的设置面板
 */
export function SettingsTab(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<'app' | 'ai'>('app');

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
            软件设置
          </button>
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
            type="button"
          >
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
              <div className="max-expand-settings-desc">此处用于放置 AI Key、模型、代理等配置。</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
