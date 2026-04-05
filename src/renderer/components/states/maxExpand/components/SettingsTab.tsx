/**
 * @file SettingsTab.tsx
 * @description 最大展开模式 — 设置 Tab
 * @author 鸡哥
 */

import React, { useState, useRef, useEffect } from 'react';
import useIslandStore from '../../../../store/slices';
import avatarImg from '../../../../assets/avatar/T.jpg';
import type { OverviewWidgetType, OverviewLayoutConfig } from '../../expand/components/OverviewTab';
import { OVERVIEW_WIDGET_OPTIONS } from '../../expand/components/OverviewTab';

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
/** 设置页侧边栏 Tab 顺序 */
const SETTINGS_TABS: ('app' | 'ai' | 'about')[] = ['app', 'ai', 'about'];

const LAYOUT_STORE_KEY = 'overview-layout';
const DEFAULT_LAYOUT: OverviewLayoutConfig = { left: 'shortcuts', right: 'todo' };

export function SettingsTab(): React.ReactElement {
  const [activeTab, setActiveTab] = React.useState<'app' | 'ai' | 'about'>('app');
  const { aiConfig, setAiConfig } = useIslandStore();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const [layoutConfig, setLayoutConfig] = useState<OverviewLayoutConfig>(DEFAULT_LAYOUT);

  /** 加载总览布局配置 */
  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(LAYOUT_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (data && typeof data === 'object' && 'left' in (data as object) && 'right' in (data as object)) {
        setLayoutConfig(data as OverviewLayoutConfig);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const updateLayout = (side: 'left' | 'right', value: OverviewWidgetType): void => {
    const updated = { ...layoutConfig, [side]: value };
    setLayoutConfig(updated);
    window.api.storeWrite(LAYOUT_STORE_KEY, updated).catch(() => {});
  };

  /** 滚轮切换设置侧边栏 Tab */
  useEffect(() => {
    const el = settingsRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.settings-field-input')) return;
      if (target.closest('.settings-field-textarea')) return;
      if (target.closest('.settings-about')) return;
      e.preventDefault();
      e.stopPropagation();
      const cur = activeTabRef.current;
      const idx = SETTINGS_TABS.indexOf(cur);
      let nextIdx: number;
      if (e.deltaY > 0) {
        nextIdx = Math.min(idx + 1, SETTINGS_TABS.length - 1);
      } else {
        nextIdx = Math.max(idx - 1, 0);
      }
      if (nextIdx !== idx) setActiveTab(SETTINGS_TABS[nextIdx]);
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

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
    <div className="max-expand-settings" ref={settingsRef}>
      <div className="max-expand-settings-layout">
        <div className="max-expand-settings-sidebar">
          <div className="max-expand-settings-sidebar-title">设置</div>
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
          <button
            className={`max-expand-settings-sidebar-item ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            type="button"
          >
            <span className="sidebar-dot" />
            关于软件
          </button>
        </div>

        <div className="max-expand-settings-panel">
          {activeTab === 'app' && (
            <div className="max-expand-settings-section">
              <div className="max-expand-settings-title">软件设置</div>
              <div className="settings-field-group">
                <div className="settings-layout-section">
                  <div className="settings-layout-label">总览布局</div>
                  <div className="settings-layout-desc">自定义总览页左右两侧显示的控件，中间时间栏固定不可更改。</div>
                  <div className="settings-layout-slots">
                    <div className="settings-layout-slot">
                      <span className="settings-layout-slot-label">左侧控件</span>
                      <div className="settings-layout-options">
                        {OVERVIEW_WIDGET_OPTIONS.map(opt => (
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
                    <div className="settings-layout-slot settings-layout-slot-center">
                      <span className="settings-layout-slot-label">中间</span>
                      <div className="settings-layout-fixed">时间（固定）</div>
                    </div>
                    <div className="settings-layout-slot">
                      <span className="settings-layout-slot-label">右侧控件</span>
                      <div className="settings-layout-options">
                        {OVERVIEW_WIDGET_OPTIONS.map(opt => (
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
          {activeTab === 'about' && (
            <div className="max-expand-settings-section settings-about">
              <div className="max-expand-settings-title">关于软件</div>

              {/* 作者信息 */}
              <div className="settings-about-author">
                <img className="settings-about-avatar" src={avatarImg} alt="作者头像" />
                <div className="settings-about-author-info">
                  <div className="settings-about-name">
                    <a className="settings-about-github" href="https://github.com/JNTMTMTM" target="_blank" rel="noreferrer" title="GitHub 主页">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </a>
                    鸡哥 <span className="settings-about-id">JNTMTMTM</span>
                  </div>
                  <div className="settings-about-version">eIsland v26.0.6</div>
                </div>
              </div>

              {/* 免费声明 */}
              <div className="settings-about-notice">
                本软件开源免费，如果你在任何地方付费购买了本软件，请立即退款并给差评。
              </div>

              {/* 链接 */}
              <div className="settings-about-links">
                <div className="settings-about-row">
                  <span className="settings-about-label">官网</span>
                  <a className="settings-about-link" href="https://www.pyisland.com" target="_blank" rel="noreferrer">www.pyisland.com</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">文档站</span>
                  <a className="settings-about-link" href="https://docs.pyisland.com" target="_blank" rel="noreferrer">docs.pyisland.com</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">开源代码</span>
                  <a className="settings-about-link" href="https://github.com/JNTMTMTM/eIsland" target="_blank" rel="noreferrer">github.com/JNTMTMTM/eIsland</a>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">开源协议</span>
                  <span className="settings-about-value">GPL-3.0</span>
                </div>
                <div className="settings-about-row">
                  <span className="settings-about-label">图标库</span>
                  <a className="settings-about-link" href="https://www.iconfont.cn/" target="_blank" rel="noreferrer">iconfont.cn</a>
                </div>
              </div>

              {/* 开源依赖 */}
              <div className="settings-about-deps">
                <div className="settings-about-deps-title">开源框架 & 依赖</div>
                <div className="settings-about-deps-grid">
                  <span className="settings-about-dep">Electron</span>
                  <span className="settings-about-dep">React</span>
                  <span className="settings-about-dep">TypeScript</span>
                  <span className="settings-about-dep">Zustand</span>
                  <span className="settings-about-dep">Tailwind CSS</span>
                  <span className="settings-about-dep">Vite</span>
                  <span className="settings-about-dep">electron-vite</span>
                  <span className="settings-about-dep">electron-builder</span>
                  <span className="settings-about-dep">react-markdown</span>
                  <span className="settings-about-dep">remark-gfm</span>
                  <span className="settings-about-dep">node-nowplaying</span>
                  <span className="settings-about-dep">openmeteo</span>
                  <span className="settings-about-dep">lunar-javascript</span>
                  <span className="settings-about-dep">lyric-resolver</span>
                  <span className="settings-about-dep">colorthief</span>
                  <span className="settings-about-dep">lucide-react</span>
                  <span className="settings-about-dep">@electron-toolkit</span>
                  <span className="settings-about-dep">@tailwindcss/vite</span>
                  <span className="settings-about-dep">@vitejs/plugin-react</span>
                  <span className="settings-about-dep">PostCSS</span>
                  <span className="settings-about-dep">Autoprefixer</span>
                </div>
              </div>

              {/* 版权信息 */}
              <div className="settings-about-footer">
                <div className="settings-about-copyright">© pyisland.com 版权所有</div>
                <div className="settings-about-slogan">算法诠释一切 质疑即是认可</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
