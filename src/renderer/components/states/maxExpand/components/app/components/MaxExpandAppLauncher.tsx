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
import { APP_LAUNCHER_LONG_PRESS_MS, MAX_EXPAND_APPS } from '../config/appLauncherConfig';
import useAppLauncherDrag from '../hooks/useAppLauncherDrag';
import useAppLauncherLayout from '../hooks/useAppLauncherLayout';
import { getAppLauncherHoverOffsets } from '../utils/appLauncherHover';
import type { CSSProperties, FocusEvent, MouseEvent, PointerEvent, ReactElement } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';
import type { AppLauncherHoverOffset, MaxExpandAppLauncherProps } from '../types/appLauncherTypes';

/**
 * 渲染应用导航页，保留原生按钮的键盘导航与焦点行为。
 * @param props - 应用导航页属性。
 * @param props.onSelectApp - 打开指定 MaxExpand 应用的回调。
 * @param props.transitionTab - 当前在网格内执行缩放挤压的应用。
 * @param props.interactive - 是否允许在当前导航页长按排序。
 * @returns 应用导航页。
 */
export default function MaxExpandAppLauncher({ onSelectApp, transitionTab, interactive = true }: MaxExpandAppLauncherProps): ReactElement {
  const { t } = useTranslation();
  const gridRef = useRef<HTMLDivElement>(null);
  const hoveredAppRef = useRef<MaxExpandTab | null>(null);
  const focusedAppRef = useRef<MaxExpandTab | null>(null);
  const [activeApp, setActiveApp] = useState<MaxExpandTab | null>(null);
  const [offsets, setOffsets] = useState<AppLauncherHoverOffset[]>([]);
  const { tabs, ready, saving, saveFailed, moveApp } = useAppLauncherLayout();
  const { pressedTab, drag, onPointerDown, onPointerMove, onPointerUp, cancelDrag, consumeClick } = useAppLauncherDrag(
    gridRef, interactive && !transitionTab && ready && !saving, moveApp,
  );
  const dragging = drag !== null;

  useLayoutEffect(() => {
    const grid = gridRef.current;
    // 切页期间由缩放动画接管位移，保留开始时的悬停位置以免跳动。
    if (!grid || transitionTab) return;
    if (!activeApp || dragging) {
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
      setOffsets(getAppLauncherHoverOffsets(positions, tabs.indexOf(activeApp)));
    };
    updateOffsets();
    const observer = new ResizeObserver(updateOffsets);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [activeApp, transitionTab, dragging, tabs]);

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
    if (consumeClick(event.detail === 0)) {
      event.preventDefault();
      return;
    }
    onSelectApp(event.currentTarget.dataset.app as MaxExpandTab);
  }, [consumeClick, onSelectApp]);

  return (
    <section className="max-expand-app-launcher" data-dragging={dragging || undefined}
      data-saving={saving || undefined}
      aria-label={t('maxExpand.appMode.title')}
    >
      <div className="max-expand-app-launcher-scroll">
        <div className="max-expand-app-launcher-grid" ref={gridRef}>
          {tabs.map((tab, index) => {
            const { icon } = MAX_EXPAND_APPS[tab];
            const label = t(`maxExpand.nav.${tab}`);
            const hoverOffset = dragging ? drag.offsets[index] : offsets[index];
            const itemOffset = drag?.tab === tab ? drag : hoverOffset;

            return (
              <button className={`max-expand-app-launcher-item${activeApp === tab ? ' is-active' : ''}`}
                key={tab}
                data-app={tab}
                data-transition-active={transitionTab === tab || undefined}
                data-drag-source={drag?.tab === tab || undefined}
                data-hold-complete={pressedTab === tab && drag?.tab === tab || undefined}
                type="button"
                title={label}
                aria-label={label}
                style={{
                  '--max-expand-app-hold-duration': `${APP_LAUNCHER_LONG_PRESS_MS}ms`,
                  '--max-expand-app-offset-x': `${itemOffset?.x ?? 0}px`,
                  '--max-expand-app-offset-y': `${itemOffset?.y ?? 0}px`,
                } as CSSProperties}
                onClick={handleSelectApp}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={cancelDrag}
                onLostPointerCapture={cancelDrag}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <span className="max-expand-app-launcher-visual">
                  <span className="max-expand-app-launcher-circle">
                    <img className="max-expand-app-icon-img" src={icon} alt="" draggable={false} />
                    {pressedTab === tab && (
                      <svg className="max-expand-app-hold-progress" viewBox="0 0 72 72" aria-hidden="true">
                        <circle className="max-expand-app-hold-track" cx="36" cy="36" r="34" />
                        <circle className="max-expand-app-hold-fill" cx="36" cy="36" r="34" pathLength="100" />
                      </svg>
                    )}
                  </span>
                  <span className="max-expand-app-launcher-label">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {saveFailed && (
        <p className="max-expand-app-launcher-error" role="status">
          {t('maxExpand.appMode.saveOrderFailed')}
        </p>
      )}
    </section>
  );
}
