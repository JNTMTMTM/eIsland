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
 * @file CountdownWindow.tsx
 * @description 倒数日/TODOs/设置 独立窗口根组件 — 浏览器风格顶部 Tab 切换
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { TodoTab } from './states/maxExpand/components/TodoTab';
import { CountdownTab } from './states/maxExpand/components/CountdownTab';
import { SettingsTab } from './states/maxExpand/components/SettingsTab';
import windowIcon from '../../../resources/icon/eisland.svg';

type WindowTab = 'todo' | 'countdown' | 'settings';
const ACTIVE_TAB_STORE_KEY = 'countdown-window-active-tab';

const TAB_LIST: { key: WindowTab; label: string }[] = [
  { key: 'todo', label: '待办事项' },
  { key: 'countdown', label: '倒数日' },
  { key: 'settings', label: '设置' },
];

export function CountdownWindow(): ReactElement {
  const [activeTab, setActiveTab] = useState<WindowTab>('todo');

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(ACTIVE_TAB_STORE_KEY).then((tab) => {
      if (cancelled) return;
      if (tab === 'todo' || tab === 'countdown' || tab === 'settings') {
        setActiveTab(tab);
      }
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${ACTIVE_TAB_STORE_KEY}`) {
        if (value === 'todo' || value === 'countdown' || value === 'settings') {
          setActiveTab(value);
        }
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const switchTab = (tab: WindowTab): void => {
    setActiveTab(tab);
    window.api.storeWrite(ACTIVE_TAB_STORE_KEY, tab).catch(() => {});
  };

  return (
    <div className="cw-root">
      {/* 顶部栏：浏览器风格 Tab + 窗口控制 */}
      <div className="cw-chrome">
        <img className="cw-window-icon" src={windowIcon} alt="eIsland" />
        <div className="cw-tabs">
          {TAB_LIST.map((tab) => (
            <button
              key={tab.key}
              className={`cw-tab ${activeTab === tab.key ? 'cw-tab--active' : ''}`}
              onClick={() => switchTab(tab.key)}
              type="button"
            >
              <span className="cw-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>
        <div className="cw-chrome__drag" />
        <div className="cw-chrome__controls">
          <button className="cw-ctrl" type="button" title="最小化" onClick={() => window.api.windowMinimize()}>
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="cw-ctrl" type="button" title="最大化" onClick={() => window.api.windowMaximize()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button className="cw-ctrl cw-ctrl--close" type="button" title="关闭" onClick={() => window.api.windowClose()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="cw-viewport">
        {activeTab === 'todo' && <TodoTab />}
        {activeTab === 'countdown' && <CountdownTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
