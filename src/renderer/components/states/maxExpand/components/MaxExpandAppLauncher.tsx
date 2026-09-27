/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file MaxExpandAppLauncher.tsx
 * @description 使用错列圆形图标呈现 MaxExpand 全部应用入口。
 * @author 鸡哥
 */

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_EXPAND_APPS, MAX_EXPAND_APP_TABS } from '../config/appLauncherConfig';
import type { CSSProperties, MouseEvent, ReactElement } from 'react';
import type { MaxExpandTab } from '../../../../store/types';

interface MaxExpandAppLauncherProps {
  onSelectApp: (tab: MaxExpandTab) => void;
}

/**
 * 渲染应用导航页，保留原生按钮的键盘导航与焦点行为。
 * @param props - 应用导航页属性。
 * @param props.onSelectApp - 打开指定 MaxExpand 应用的回调。
 * @returns 应用导航页。
 */
export default function MaxExpandAppLauncher({ onSelectApp }: MaxExpandAppLauncherProps): ReactElement {
  const { t } = useTranslation();
  const handleSelectApp = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    onSelectApp(event.currentTarget.dataset.app as MaxExpandTab);
  }, [onSelectApp]);

  return (
    <section className="max-expand-app-launcher" aria-label={t('maxExpand.appMode.title')}>
      <header className="max-expand-app-launcher-header">
        <h2 className="max-expand-app-launcher-title">{t('maxExpand.appMode.title')}</h2>
        <p className="max-expand-app-launcher-hint">{t('maxExpand.appMode.hint')}</p>
      </header>
      <div className="max-expand-app-launcher-scroll">
        <div className="max-expand-app-launcher-grid">
          {MAX_EXPAND_APP_TABS.map((tab) => {
            const { icon, color } = MAX_EXPAND_APPS[tab];
            const label = t(`maxExpand.nav.${tab}`);

            return (
              <button className="max-expand-app-launcher-item"
                key={tab}
                data-app={tab}
                type="button"
                title={label}
                aria-label={label}
                style={{ '--max-expand-app-color': color } as CSSProperties}
                onClick={handleSelectApp}
              >
                <span className="max-expand-app-launcher-circle">
                  <img className="max-expand-app-icon-img" src={icon} alt="" draggable={false} />
                </span>
                <span className="max-expand-app-launcher-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
