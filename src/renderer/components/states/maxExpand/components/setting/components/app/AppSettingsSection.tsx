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
 * @file AppSettingsSection.tsx
 * @description 设置页面 - 应用设置区块
 * @author 鸡哥
 */

import { useEffect, useRef, useState } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import type { AppSettingsPageKey } from '../../utils/settingsConfig';

interface AppOverviewLayoutConfig {
  left: string;
  right: string;
}

interface AppOverviewWidgetOption {
  value: string;
  label: string;
}

interface AppRunningProcess {
  name: string;
  iconDataUrl?: string;
}

interface AppPositionOffset {
  x: number;
  y: number;
}

interface AppPositionInput {
  x: string;
  y: string;
}

interface AppSettingsSectionProps {
  currentAppSettingsPageLabel: string;
  appSettingsPage: AppSettingsPageKey;
  layoutConfig: AppOverviewLayoutConfig;
  OverviewPreviewComponent: ({ layoutConfig }: { layoutConfig: AppOverviewLayoutConfig }) => ReactElement;
  overviewWidgetOptions: AppOverviewWidgetOption[];
  updateLayout: (side: 'left' | 'right', value: string) => void;
  hideProcessFilter: string;
  setHideProcessFilter: (value: string) => void;
  refreshRunningProcesses: () => Promise<void>;
  hideProcessLoading: boolean;
  hideProcessList: string[];
  toggleHideProcess: (name: string) => void;
  runningProcesses: AppRunningProcess[];
  hideProcessKeyword: string;
  islandPositionOffset: AppPositionOffset;
  applyIslandPositionOffset: (x: number, y: number) => void;
  islandPositionInput: AppPositionInput;
  setIslandPositionInput: Dispatch<SetStateAction<AppPositionInput>>;
  applyIslandPositionInput: () => void;
  islandPositionInputChanged: boolean;
  cancelIslandPositionInput: () => void;
  themeMode: 'dark' | 'light' | 'system';
  setThemeModeState: (mode: 'dark' | 'light' | 'system') => void;
  applyThemeMode: (mode: 'dark' | 'light' | 'system') => Promise<void>;
  islandOpacity: number;
  applyIslandOpacity: (value: number) => void;
  opacitySaveTimerRef: { current: ReturnType<typeof setTimeout> | null };
  setIslandOpacity: (value: number) => void;
  persistIslandOpacity: (value: number) => void;
  expandLeaveIdle: boolean;
  setExpandLeaveIdle: (value: boolean) => void;
  maxExpandLeaveIdle: boolean;
  setMaxExpandLeaveIdle: (value: boolean) => void;
  autostartMode: 'disabled' | 'enabled' | 'high-priority';
  setAutostartMode: (mode: 'disabled' | 'enabled' | 'high-priority') => void;
  appSettingsPages: AppSettingsPageKey[];
  settingsTabLabels: Record<string, string>;
  setAppSettingsPage: (page: AppSettingsPageKey) => void;
}

/**
 * 渲染应用设置区块
 * @param props - 应用设置区域所需参数
 * @returns 应用设置区域
 */
export function AppSettingsSection(props: AppSettingsSectionProps): ReactElement {
  const {
    currentAppSettingsPageLabel,
    appSettingsPage,
    layoutConfig,
    OverviewPreviewComponent,
    overviewWidgetOptions,
    updateLayout,

    hideProcessFilter,
    setHideProcessFilter,
    refreshRunningProcesses,
    hideProcessLoading,
    hideProcessList,
    toggleHideProcess,
    runningProcesses,
    hideProcessKeyword,

    islandPositionOffset,
    applyIslandPositionOffset,
    islandPositionInput,
    setIslandPositionInput,
    applyIslandPositionInput,
    islandPositionInputChanged,
    cancelIslandPositionInput,

    themeMode,
    setThemeModeState,
    applyThemeMode,
    islandOpacity,
    applyIslandOpacity,
    opacitySaveTimerRef,
    setIslandOpacity,
    persistIslandOpacity,

    expandLeaveIdle,
    setExpandLeaveIdle,
    maxExpandLeaveIdle,
    setMaxExpandLeaveIdle,

    autostartMode,
    setAutostartMode,

    appSettingsPages,
    settingsTabLabels,
    setAppSettingsPage,
  } = props;

  const OverviewPreview = OverviewPreviewComponent;
  const [clearLogsStatus, setClearLogsStatus] = useState<'idle' | 'clearing' | string>('idle');
  const clearLogsResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearLogsResetTimerRef.current) {
        clearTimeout(clearLogsResetTimerRef.current);
        clearLogsResetTimerRef.current = null;
      }
    };
  }, []);

  const scheduleClearLogsStatusReset = (): void => {
    if (clearLogsResetTimerRef.current) {
      clearTimeout(clearLogsResetTimerRef.current);
    }
    clearLogsResetTimerRef.current = setTimeout(() => {
      setClearLogsStatus('idle');
      clearLogsResetTimerRef.current = null;
    }, 3000);
  };

  return (
    <div className="max-expand-settings-section">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>软件设置</span>
        <span className="settings-app-title-sub">- {currentAppSettingsPageLabel}</span>
      </div>

      <div className="settings-app-pages-layout">
        <div className="settings-app-page-main">
          {appSettingsPage === 'layout-preview' && (
            <div className="settings-island-preview-section">
              <div className="settings-island-preview-label">总览布局预览</div>
              <div className="settings-island-preview-wrap">
                <div className="settings-island-shell" key={`${layoutConfig.left}-${layoutConfig.right}`}>
                  <OverviewPreview layoutConfig={layoutConfig} />
                </div>
              </div>

              <div className="settings-layout-controls">
                <div className="settings-layout-control">
                  <span className="settings-layout-control-label">左侧控件</span>
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
                  <span className="settings-layout-control-label">右侧控件</span>
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
          )}

          {appSettingsPage === 'hide-process-list' && (
            <div className="settings-hide-processes">
              <div className="settings-music-hint">识别到以下进程运行时，将立即隐藏灵动岛。新增进程下次重启生效，删除进程立即生效。</div>
              <div className="settings-hide-process-toolbar">
                <input
                  className="settings-whitelist-input"
                  type="text"
                  placeholder="搜索进程名（如 WeChat.exe）"
                  value={hideProcessFilter}
                  onChange={(e) => setHideProcessFilter(e.target.value)}
                />
                <button
                  className="settings-whitelist-add-btn"
                  type="button"
                  onClick={() => {
                    refreshRunningProcesses().catch(() => {});
                  }}
                  disabled={hideProcessLoading}
                >
                  {hideProcessLoading ? '刷新中…' : '刷新进程'}
                </button>
              </div>

              <div className="settings-hide-selected">
                {hideProcessList.length === 0 ? (
                  <span className="settings-hide-selected-empty">暂无隐藏进程</span>
                ) : hideProcessList.map((name: string) => (
                  <button
                    key={name}
                    className="settings-hide-selected-item"
                    type="button"
                    onClick={() => toggleHideProcess(name)}
                    title="移除该进程"
                  >
                    {name} ×
                  </button>
                ))}
              </div>

              <div className="settings-hide-process-list">
                {runningProcesses
                  .filter((process) => process.name.toLowerCase().includes(hideProcessKeyword))
                  .map((process) => {
                    const name = process.name;
                    const selected = hideProcessList.some((item: string) => item.trim().toLowerCase() === name.trim().toLowerCase());
                    const fallbackText = name.charAt(0).toUpperCase();
                    return (
                      <button
                        key={name}
                        className={`settings-hide-process-item ${selected ? 'active' : ''}`}
                        type="button"
                        onClick={() => toggleHideProcess(name)}
                      >
                        <span className={`settings-hide-process-check ${selected ? 'active' : ''}`}>{selected ? '✓' : ''}</span>
                        <span className="settings-hide-process-icon" aria-hidden="true">
                          {process.iconDataUrl ? (
                            <img src={process.iconDataUrl} alt="" />
                          ) : (
                            <span>{fallbackText || '•'}</span>
                          )}
                        </span>
                        <span className="settings-hide-process-name">{name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {appSettingsPage === 'position' && (
            <div className="max-expand-settings-section">
              <div className="settings-music-section">
                <div className="settings-music-label">灵动岛位置偏移</div>
                <div className="settings-music-hint">调整后立即生效并自动保存，重启后会按该位置校准。</div>

                <div className="settings-hotkey-row">
                  <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x - 10, islandPositionOffset.y)}>左移 10</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x + 10, islandPositionOffset.y)}>右移 10</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y - 10)}>上移 10</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(islandPositionOffset.x, islandPositionOffset.y + 10)}>下移 10</button>
                </div>

                <div className="settings-hotkey-row">
                  <label className="settings-field" style={{ flex: 1 }}>
                    <span className="settings-field-label">水平偏移 X（px）</span>
                    <input
                      className="settings-field-input"
                      type="number"
                      min={-2000}
                      max={2000}
                      value={islandPositionInput.x}
                      onChange={(e) => {
                        setIslandPositionInput((prev) => ({ ...prev, x: e.target.value }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyIslandPositionInput();
                        }
                      }}
                    />
                  </label>
                  <label className="settings-field" style={{ flex: 1 }}>
                    <span className="settings-field-label">垂直偏移 Y（px）</span>
                    <input
                      className="settings-field-input"
                      type="number"
                      min={-1200}
                      max={1200}
                      value={islandPositionInput.y}
                      onChange={(e) => {
                        setIslandPositionInput((prev) => ({ ...prev, y: e.target.value }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyIslandPositionInput();
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="settings-hotkey-row">
                  <button className="settings-hotkey-btn" type="button" onClick={applyIslandPositionInput} disabled={!islandPositionInputChanged}>应用</button>
                  <button className="settings-hotkey-btn" type="button" onClick={cancelIslandPositionInput} disabled={!islandPositionInputChanged}>取消</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => applyIslandPositionOffset(0, 0)}>重置为默认位置</button>
                </div>
              </div>
            </div>
          )}

          {appSettingsPage === 'theme' && (
            <div className="max-expand-settings-section">
              <div className="settings-music-section">
                <div className="settings-music-label">主题模式</div>
                <div className="settings-music-hint">选择深色、浅色或跟随系统主题，切换后立即生效</div>
                <div className="settings-lyrics-source-options">
                  {([
                    { value: 'dark', label: '深色模式' },
                    { value: 'light', label: '浅色模式' },
                    { value: 'system', label: '跟随系统' },
                  ] as Array<{ value: 'dark' | 'light' | 'system'; label: string }>).map((opt) => (
                    <button
                      key={opt.value}
                      className={`settings-lyrics-source-btn ${themeMode === opt.value ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        setThemeModeState(opt.value);
                        applyThemeMode(opt.value).catch(() => {});
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="settings-music-label" style={{ marginTop: 14 }}>灵动岛透明度</div>
                <div className="settings-music-hint">数值越低越透明（10% - 100%），调整后立即生效</div>
                <div className="settings-opacity-slider-row">
                  <input
                    className="settings-opacity-slider"
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={islandOpacity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      const safe = Number.isFinite(v) ? Math.max(10, Math.min(100, Math.round(v))) : 100;
                      setIslandOpacity(safe);
                      applyIslandOpacity(safe);
                      if (opacitySaveTimerRef.current) {
                        clearTimeout(opacitySaveTimerRef.current);
                      }
                      opacitySaveTimerRef.current = setTimeout(() => {
                        persistIslandOpacity(safe);
                        opacitySaveTimerRef.current = null;
                      }, 220);
                    }}
                    onBlur={() => {
                      if (opacitySaveTimerRef.current) {
                        clearTimeout(opacitySaveTimerRef.current);
                        opacitySaveTimerRef.current = null;
                      }
                      persistIslandOpacity(islandOpacity);
                    }}
                  />
                  <span className="settings-opacity-slider-value">{islandOpacity}%</span>
                </div>
              </div>
            </div>
          )}

          {appSettingsPage === 'behavior' && (
            <div className="max-expand-settings-section">
              <div className="settings-music-section">
                <div className="settings-music-label">鼠标移开自动收回 (重启后生效)</div>
                <div className="settings-music-hint">启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）</div>
                <div className="settings-hotkey-row" style={{ alignItems: 'center', marginTop: 8 }}>
                  <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={expandLeaveIdle}
                      onChange={(e) => {
                        setExpandLeaveIdle(e.target.checked);
                        window.api.expandMouseleaveIdleSet(e.target.checked).catch(() => {});
                      }}
                    />
                    展开态（Expand）鼠标移开后自动收回
                  </label>
                </div>
                <div className="settings-hotkey-row" style={{ alignItems: 'center', marginTop: 6 }}>
                  <label className="settings-music-hint" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={maxExpandLeaveIdle}
                      onChange={(e) => {
                        setMaxExpandLeaveIdle(e.target.checked);
                        window.api.maxexpandMouseleaveIdleSet(e.target.checked).catch(() => {});
                      }}
                    />
                    最大展开态（MaxExpand）鼠标移开后自动收回
                  </label>
                </div>
              </div>
            </div>
          )}

          {appSettingsPage === 'autostart' && (
            <div className="max-expand-settings-section">
              <div className="settings-music-section">
                <div className="settings-music-label">实用工具</div>
                <div className="settings-music-hint">常用应用操作与日志工具</div>
                <div className="settings-hotkey-row" style={{ marginTop: 8, gap: 8 }}>
                  <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.quitApp(); }}>关闭灵动岛</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.restartApp().catch(() => {}); }}>重启灵动岛</button>
                  <button className="settings-hotkey-btn" type="button" onClick={() => { window.api.openLogsFolder().catch(() => {}); }}>打开日志文件夹</button>
                  <button
                    className="settings-hotkey-btn"
                    type="button"
                    disabled={clearLogsStatus === 'clearing'}
                    onClick={() => {
                      setClearLogsStatus('clearing');
                      window.api.clearLogsCache().then((res) => {
                        if (res.success) {
                          const kb = (res.freedBytes / 1024).toFixed(1);
                          setClearLogsStatus(`已清理 ${kb} KB`);
                        } else {
                          setClearLogsStatus('清理失败');
                        }
                        scheduleClearLogsStatusReset();
                      }).catch(() => {
                        setClearLogsStatus('清理失败');
                        scheduleClearLogsStatusReset();
                      });
                    }}
                  >
                    {clearLogsStatus === 'clearing' ? '清理中…' : clearLogsStatus === 'idle' ? '清理日志缓存' : clearLogsStatus}
                  </button>
                </div>

                <div className="settings-music-label" style={{ marginTop: 12 }}>开机自启</div>
                <div className="settings-music-hint">设置系统启动时是否自动运行灵动岛</div>
                <div className="settings-lyrics-source-options" style={{ marginTop: 8 }}>
                  {([
                    { value: 'disabled', label: '禁用' },
                    { value: 'enabled', label: '启用' },
                    { value: 'high-priority', label: '高优先级' },
                  ] as Array<{ value: 'disabled' | 'enabled' | 'high-priority'; label: string }>).map((opt) => (
                    <button
                      key={opt.value}
                      className={`settings-lyrics-source-btn ${autostartMode === opt.value ? 'active' : ''}`}
                      type="button"
                      onClick={() => {
                        setAutostartMode(opt.value);
                        window.api.autostartSet(opt.value).catch(() => {});
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="settings-music-hint" style={{ marginTop: 8 }}>
                  {autostartMode === 'disabled' && '当前已禁用开机自启。'}
                  {autostartMode === 'enabled' && '系统登录后将自动启动灵动岛。'}
                  {autostartMode === 'high-priority' && '以高优先级启动，更早完成加载。'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-app-page-dots" aria-label="软件设置分页">
          {appSettingsPages.map((page) => (
            <button
              key={page}
              className={`settings-app-page-dot ${appSettingsPage === page ? 'active' : ''}`}
              data-label={settingsTabLabels[page]}
              type="button"
              onClick={() => setAppSettingsPage(page)}
              title={settingsTabLabels[page]}
              aria-label={settingsTabLabels[page]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
