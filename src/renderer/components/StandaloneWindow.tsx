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
 * @file StandaloneWindow.tsx
 * @description 倒数日/TODOs/设置 独立窗口根组件 — 浏览器风格顶部 Tab 切换
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TodoTab } from './states/maxExpand/components/TodoTab';
import { CountdownTab } from './states/maxExpand/components/CountdownTab';
import { SettingsTab } from './states/maxExpand/components/SettingsTab';
import { LoginContent } from './states/login/LoginContent';
import { RegisterContent } from './states/register/RegisterContent';
import useIslandStore from '../store/slices';
import windowIcon from '../../../resources/icon/eisland.svg';

type WindowTab = 'todo' | 'countdown' | 'settings';
const ACTIVE_TAB_STORE_KEY = 'standalone-window-active-tab';
const LEGACY_ACTIVE_TAB_STORE_KEY = 'countdown-window-active-tab';
const ISLAND_BG_IMAGE_STORE_KEY = 'island-bg-image';
const ISLAND_BG_OPACITY_STORE_KEY = 'island-bg-opacity';
const LOCAL_ISLAND_BG_SYNC_EVENT = 'island-bg-local-sync';

function isDirectBgImageUrl(image: string): boolean {
  return image.startsWith('data:')
    || image.startsWith('http://')
    || image.startsWith('https://')
    || image.startsWith('blob:')
    || image.startsWith('file:')
    || image.startsWith('/')
    || image.startsWith('./')
    || image.startsWith('../')
    || image.startsWith('assets/');
}

const TAB_LIST: { key: WindowTab; labelKey: string }[] = [
  { key: 'todo', labelKey: 'standalone.tabs.todo' },
  { key: 'countdown', labelKey: 'standalone.tabs.countdown' },
  { key: 'settings', labelKey: 'standalone.tabs.settings' },
];

/**
 * 独立窗口根组件
 * @description 提供待办、倒数日与设置三个页签的窗口化视图
 */
export function StandaloneWindow(): ReactElement {
  const { t } = useTranslation();
  const state = useIslandStore((s) => s.state);
  const [activeTab, setActiveTab] = useState<WindowTab>('todo');
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImageOpacity, setBgImageOpacity] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    const applyBgImage = (imageValue: unknown): void => {
      const image = typeof imageValue === 'string' ? imageValue : null;
      if (!image) {
        setBgImageUrl(null);
        return;
      }
      if (isDirectBgImageUrl(image)) {
        setBgImageUrl(image);
        return;
      }
      window.api.loadWallpaperFile?.(image).then((dataUrl) => {
        if (cancelled) return;
        setBgImageUrl(dataUrl ?? null);
      }).catch(() => {});
    };

    const applyBgOpacity = (opacityValue: unknown): void => {
      const safe = typeof opacityValue === 'number' && Number.isFinite(opacityValue)
        ? Math.max(0, Math.min(100, Math.round(opacityValue)))
        : 30;
      setBgImageOpacity(safe);
    };

    window.api.storeRead(ACTIVE_TAB_STORE_KEY).then((tab) => {
      if (cancelled) return;
      if (tab === 'todo' || tab === 'countdown' || tab === 'settings') {
        setActiveTab(tab);
        return;
      }
      window.api.storeRead(LEGACY_ACTIVE_TAB_STORE_KEY).then((legacyTab) => {
        if (cancelled) return;
        if (legacyTab === 'todo' || legacyTab === 'countdown' || legacyTab === 'settings') {
          setActiveTab(legacyTab);
        }
      }).catch(() => {});
    }).catch(() => {});

    window.api.storeRead(ISLAND_BG_IMAGE_STORE_KEY).then((image) => {
      if (cancelled) return;
      applyBgImage(image);
    }).catch(() => {});

    window.api.storeRead(ISLAND_BG_OPACITY_STORE_KEY).then((opacity) => {
      if (cancelled) return;
      applyBgOpacity(opacity);
    }).catch(() => {});

    const unsub = window.api.onSettingsChanged((channel: string, value: unknown) => {
      if (cancelled) return;
      if (channel === `store:${ACTIVE_TAB_STORE_KEY}`) {
        if (value === 'todo' || value === 'countdown' || value === 'settings') {
          setActiveTab(value);
        }
      }
      if (channel === `store:${ISLAND_BG_IMAGE_STORE_KEY}`) {
        applyBgImage(value);
      }
      if (channel === `store:${ISLAND_BG_OPACITY_STORE_KEY}`) {
        applyBgOpacity(value);
      }
    });

    const localBgSyncHandler = (event: Event): void => {
      const customEvent = event as CustomEvent<{ image?: string | null; opacity?: number }>;
      const detail = customEvent.detail;
      if (!detail || typeof detail !== 'object') return;
      if ('image' in detail) {
        applyBgImage(detail.image ?? null);
      }
      if ('opacity' in detail) {
        applyBgOpacity(detail.opacity);
      }
    };
    window.addEventListener(LOCAL_ISLAND_BG_SYNC_EVENT, localBgSyncHandler as EventListener);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener(LOCAL_ISLAND_BG_SYNC_EVENT, localBgSyncHandler as EventListener);
    };
  }, []);

  const switchTab = (tab: WindowTab): void => {
    setActiveTab(tab);
    window.api.storeWrite(ACTIVE_TAB_STORE_KEY, tab).catch(() => {});
  };

  return (
    <div className="cw-root">
      <div
        className="cw-bg-layer"
        style={{
          backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
          opacity: bgImageUrl ? bgImageOpacity / 100 : 0,
        }}
      />
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
              <span className="cw-tab__label">{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>
        <div className="cw-chrome__drag" />
        <div className="cw-chrome__controls">
          <button className="cw-ctrl" type="button" title={t('standalone.controls.minimize')} onClick={() => window.api.windowMinimize()}>
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="cw-ctrl" type="button" title={t('standalone.controls.maximize')} onClick={() => window.api.windowMaximize()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/></svg>
          </button>
          <button className="cw-ctrl cw-ctrl--close" type="button" title={t('standalone.controls.close')} onClick={() => window.api.windowClose()}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="cw-viewport">
        {activeTab === 'todo' && <TodoTab />}
        {activeTab === 'countdown' && <CountdownTab />}
        {activeTab === 'settings' && state === 'login' && <LoginContent />}
        {activeTab === 'settings' && state === 'register' && <RegisterContent />}
        {activeTab === 'settings' && state !== 'login' && state !== 'register' && <SettingsTab />}
      </div>
    </div>
  );
}
