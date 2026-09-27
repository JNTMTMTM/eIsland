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
 * @file MaxExpandAppLauncher.tsx
 * @description 使用错列圆形图标呈现 MaxExpand 全部应用入口。
 * @author 鸡哥
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MAX_EXPAND_APPS, MAX_EXPAND_APP_TABS } from '../config/appLauncherConfig';
import { getAppLauncherHoverOffsets } from '../utils/appLauncherHover';
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent, ReactElement } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { AppLauncherHoverOffset, MaxExpandAppLauncherProps } from '../types/appLauncherTypes';

/**
 * 渲染应用导航页，保留原生按钮的键盘导航与焦点行为。
 * @param props - 应用导航页属性。
 * @param props.onSelectApp - 打开指定 MaxExpand 应用的回调。
 * @param props.transitionTab - 当前由缩放过渡图标接管显示的应用。
 * @returns 应用导航页。
 */
export default function MaxExpandAppLauncher({ onSelectApp, transitionTab }: MaxExpandAppLauncherProps): ReactElement {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const hoveredAppRef = useRef<MaxExpandTab | null>(null);
  const focusedAppRef = useRef<MaxExpandTab | null>(null);
  const [activeApp, setActiveApp] = useState<MaxExpandTab | null>(null);
  const [offsets, setOffsets] = useState<AppLauncherHoverOffset[]>([]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!activeApp) {
      setOffsets([]);
      return;
    }
    const updateOffsets = (): void => {
      const buttons = Array.from(grid.querySelectorAll<HTMLButtonElement>(':scope > button'));
      // 只测量固定按钮，视觉层的动画不会反过来改变避让计算和鼠标命中。
      const positions = buttons.map((button) => ({
        x: button.offsetLeft + button.offsetWidth / 2,
        y: button.offsetTop + button.offsetHeight / 2,
        width: button.offsetWidth,
      }));
      setOffsets(getAppLauncherHoverOffsets(positions, MAX_EXPAND_APP_TABS.indexOf(activeApp)));
    };
    updateOffsets();
    const observer = new ResizeObserver(updateOffsets);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [activeApp]);

  const handlePointerEnter = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    if (event.pointerType === 'touch') return;
    hoveredAppRef.current = event.currentTarget.dataset.app as MaxExpandTab;
    setActiveApp(hoveredAppRef.current);
  }, []);

  const handlePointerLeave = useCallback((): void => {
    hoveredAppRef.current = null;
    setActiveApp(focusedAppRef.current);
  }, []);

  const handleFocus = useCallback((event: FocusEvent<HTMLButtonElement>): void => {
    if (!event.currentTarget.matches(':focus-visible')) return;
    focusedAppRef.current = event.currentTarget.dataset.app as MaxExpandTab;
    setActiveApp(hoveredAppRef.current ?? focusedAppRef.current);
  }, []);

  const handleBlur = useCallback((): void => {
    focusedAppRef.current = null;
    setActiveApp(hoveredAppRef.current);
  }, []);

  const handleSelectApp = useCallback((event: MouseEvent<HTMLButtonElement>): void => {
    onSelectApp(event.currentTarget.dataset.app as MaxExpandTab);
  }, [onSelectApp]);

  return (
    <section className="max-expand-app-launcher" aria-label={t('maxExpand.appMode.title')}>
      <div className="max-expand-app-launcher-scroll">
        <div className="max-expand-app-launcher-grid" ref={gridRef}>
          {MAX_EXPAND_APP_TABS.map((tab, index) => {
            const { icon, color } = MAX_EXPAND_APPS[tab];
            const label = t(`maxExpand.nav.${tab}`);

            return (
              <button className={`max-expand-app-launcher-item${activeApp === tab ? ' is-active' : ''}`}
                key={tab}
                data-app={tab}
                data-transition-active={transitionTab === tab || undefined}
                type="button"
                title={label}
                aria-label={label}
                style={{
                  '--max-expand-app-color': color,
                  '--max-expand-app-offset-x': `${offsets[index]?.x ?? 0}px`,
                  '--max-expand-app-offset-y': `${offsets[index]?.y ?? 0}px`,
                } as CSSProperties}
                onClick={handleSelectApp}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerCancel={handlePointerLeave}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span className="max-expand-app-launcher-visual">
                  <span className="max-expand-app-launcher-circle">
                    <img className="max-expand-app-icon-img" src={icon} alt="" draggable={false} />
                  </span>
                  <span className="max-expand-app-launcher-label">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
