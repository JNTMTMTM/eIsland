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
 * @file MaxExpandContent.tsx
 * @description 最大展开模式内容组件，独立于 Expanded 的大面板，包含 AI 对话和设置 Tab
 * @author 鸡哥
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import type { MaxExpandTab } from '../../../store/types';
import '../../../styles/settings/settings.css';
import { AiChatTab } from './components/AiChatTab';
import { TodoTab } from './components/TodoTab';
import { UrlFavoritesTab } from './components/UrlFavoritesTab';
import { LocalFileSearchTab } from './components/LocalFileSearchTab';
import { ClipboardHistoryTab } from './components/ClipboardHistoryTab';
import { AlbumTab } from './components/AlbumTab';
import { MailTab } from './components/MailTab';
import { SettingsTab } from './components/SettingsTab';
import { CountdownTab } from './components/CountdownTab';
import { MemoTab } from './components/MemoTab';

/** 导航点标识 — 含特殊动作：expanded 返回 */
type NavDotId = MaxExpandTab | 'expanded';

/** 导航点配置 */
const NAV_DOTS: NavDotId[] = ['expanded', 'todo', 'urlFavorites', 'album', 'mail', 'localFileSearch', 'clipboardHistory', 'aiChat', 'memo', 'countdown', 'settings'];

/**
 * 最大展开模式内容组件
 * @description 包含 AI 对话窗口和设置面板，底部导航点切换 Tab 或返回 expanded
 */
/** 独立窗口模式下从灵动岛中移除的 Tab */
const STANDALONE_HIDDEN_TABS: Set<NavDotId> = new Set(['todo', 'countdown', 'urlFavorites', 'album', 'mail', 'localFileSearch', 'clipboardHistory', 'memo', 'settings']);

/** 启动时读取一次，整个生命周期内不再变化（重启后生效） */
let _startupMode: 'integrated' | 'standalone' = 'integrated';
let _startupModeResolved = false;
const _startupModeReady: Promise<void> = (window.api?.storeRead?.('standalone-window-mode') ?? Promise.resolve(null))
  .then((data: unknown) => {
    if (data === 'standalone') {
      _startupMode = 'standalone';
      return;
    }
    return window.api?.storeRead?.('countdown-window-mode').then((legacyMode: unknown) => {
      if (legacyMode === 'standalone') _startupMode = 'standalone';
    }).catch(() => {});
  })
  .catch(() => {})
  .finally(() => { _startupModeResolved = true; });

/**
 * 最大展开模式内容组件
 * @description 渲染最大展开态的 Tab 内容与底部导航点
 */
export function MaxExpandContent(): React.ReactElement {
  const { t } = useTranslation();
  const { setExpanded, maxExpandTab: activeTab, setMaxExpandTab: setActiveTab } = useIslandStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [tabAnimation, setTabAnimation] = useState(true);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('maxexpand-tab-animation').then((v: unknown) => {
      if (cancelled) return;
      if (v === false) setTabAnimation(false);
    }).catch(() => {});
    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === 'settings:maxexpand-tab-animation') setTabAnimation(value !== false);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  const [countdownMode, setCountdownMode] = useState<'integrated' | 'standalone'>(
    _startupModeResolved ? _startupMode : 'integrated'
  );

  useEffect(() => {
    let cancelled = false;
    _startupModeReady.then(() => {
      if (cancelled) return;
      setCountdownMode(_startupMode);
      if (_startupMode === 'standalone' && STANDALONE_HIDDEN_TABS.has(activeTabRef.current)) {
        setActiveTab('aiChat');
      }
    });
    return () => { cancelled = true; };
  }, [setActiveTab]);

  /** 独立窗口模式下过滤掉的导航点 */
  const filteredNavDots = useMemo(() => {
    const getNavLabel = (id: NavDotId): string => t(`maxExpand.nav.${id}`, {
      defaultValue: id === 'expanded'
        ? '返回'
        : id === 'todo'
          ? '待办'
            : id === 'urlFavorites'
              ? 'URL 收藏'
              : id === 'album'
                ? '相册'
              : id === 'mail'
                ? '邮箱'
              : id === 'localFileSearch'
                ? '文件查找'
              : id === 'clipboardHistory'
                ? '剪贴板'
            : id === 'aiChat'
              ? 'AI 对话'
              : id === 'memo'
                ? '备忘录'
              : id === 'countdown'
                ? '倒数日'
                : '设置',
    });
    if (countdownMode === 'standalone') {
      return NAV_DOTS.filter(d => !STANDALONE_HIDDEN_TABS.has(d)).map((id) => ({ id, label: getNavLabel(id) }));
    }
    return NAV_DOTS.map((id) => ({ id, label: getNavLabel(id) }));
  }, [countdownMode, t]);
  const filteredNavDotsRef = useRef(filteredNavDots);
  filteredNavDotsRef.current = filteredNavDots;

  /** 切换 Tab */
  const navigateTab = useCallback((id: NavDotId): void => {
    if (id === 'expanded') { setExpanded(); return; }
    const curIdx = NAV_DOTS.indexOf(activeTabRef.current);
    const nextIdx = NAV_DOTS.indexOf(id as NavDotId);
    setSlideDir(nextIdx >= curIdx ? 'right' : 'left');
    setActiveTab(id);
  }, [setExpanded, setActiveTab]);

  /** 滚轮切换 Tab */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement;
      if (target.closest('.expand-todo-list')) return;
      if (target.closest('.url-favorites-list')) return;
      if (target.closest('.url-favorites-input')) return;
      if (target.closest('.album-grid')) return;
      if (target.closest('.album-viewer-canvas')) return;
      if (target.closest('.album-meta-panel')) return;
      if (target.closest('.album-sort-select')) return;
      if (target.closest('.local-file-search-results')) return;
      if (target.closest('.local-file-search-root-input')) return;
      if (target.closest('.local-file-search-query-input')) return;
      if (target.closest('.clipboard-history-list')) return;
      if (target.closest('.max-expand-settings')) return;
      if (target.closest('.countdown-calendar-wrap')) return;
      if (target.closest('.cd-cards-wrap')) return;
      if (target.closest('.cd-editor-form')) return;
      if (target.closest('.cd-color-picker-popup')) return;
      if (target.closest('.max-expand-chat-messages')) return;
      if (target.closest('.max-expand-chat-session-sidebar')) return;
      if (target.closest('.max-expand-chat-session-list')) return;
      if (target.closest('.max-expand-chat-web-access-panel')) return;
      if (target.closest('.max-expand-chat-web-access-card')) return;
      if (target.closest('.max-expand-chat-local-tool-access-card')) return;
      if (target.closest('.max-expand-chat-input')) return;
      if (target.closest('.settings-mail-tab-inbox-list')) return;
      if (target.closest('.settings-mail-tab-reader')) return;
      if (target.closest('.settings-field-input')) return;
      if (target.closest('.settings-field-textarea')) return;
      if (target.closest('.memo-tab-container')) return;
      e.preventDefault();

      const dots = filteredNavDotsRef.current;
      const cur = activeTabRef.current;
      const currentIndex = dots.findIndex(d => d.id === cur);
      let nextId: NavDotId;
      if (e.deltaY > 0) {
        nextId = dots[(currentIndex + 1) % dots.length].id;
      } else {
        nextId = dots[(currentIndex - 1 + dots.length) % dots.length].id;
      }
      navigateTab(nextId);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setExpanded]);

  /** 导航点点击 */
  const handleNavClick = (id: NavDotId): void => {
    navigateTab(id);
  };

  return (
    <div className="settings-content" ref={contentRef}>
      {/* Tab 内容区域 */}
      <div className="max-expand-tab-content" onClick={(e) => e.stopPropagation()}>
        <div className={`max-expand-tab-transition${tabAnimation ? ` max-expand-tab-slide-${slideDir}` : ''}`} key={activeTab}>
          {activeTab === 'aiChat' && <AiChatTab />}
          {activeTab === 'todo' && <TodoTab />}
          {activeTab === 'urlFavorites' && <UrlFavoritesTab />}
          {activeTab === 'localFileSearch' && <LocalFileSearchTab />}
          {activeTab === 'clipboardHistory' && <ClipboardHistoryTab />}
          {activeTab === 'album' && <AlbumTab />}
          {activeTab === 'mail' && <MailTab />}
          {activeTab === 'memo' && <MemoTab />}
          {activeTab === 'countdown' && <CountdownTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>

      {/* 底部导航点 */}
      <div className="settings-nav-dots" onClick={(e) => e.stopPropagation()}>
        {filteredNavDots.map(({ id, label }) => (
          <button
            key={id}
            className={`settings-nav-dot ${activeTab === id ? 'active' : ''}`}
            onClick={() => handleNavClick(id)}
            title={label}
            aria-label={t('maxExpand.nav.switchTo', { defaultValue: '切换到{{label}}', label })}
          />
        ))}
      </div>
    </div>
  );
}
