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
 * @file TrayMenu.tsx
 * @description 自绘托盘菜单：顶部用户信息卡片 + 音乐控制卡片 + 菜单项列表，菜单状态到达前显示骨架屏；渲染完成后上报高度供主进程定位
 * @author 鸡哥
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { TRAY_MENU_ITEMS } from '../config/trayMenuItems';
import { useTrayMenuState } from '../hooks/useTrayMenuState';
import { useTrayNowPlaying } from '../hooks/useTrayNowPlaying';
import { TrayMenuItem } from './TrayMenuItem';
import { TrayMenuSkeleton } from './TrayMenuSkeleton';
import { TrayMusicCard } from './TrayMusicCard';
import { TrayUserCard } from './TrayUserCard';
import '../styles/tray-menu.css';

/**
 * 托盘菜单根组件
 * @returns 菜单元素；首次收到主进程状态前为骨架屏
 */
export function TrayMenu(): ReactElement {
  const { t } = useTranslation();
  const { menuState, user, openCount } = useTrayMenuState();
  const { nowPlaying, loading, togglePlayback, playPrevious, playNext } = useTrayNowPlaying(openCount);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 每次打开都在绘制前测量；等两帧确保新内容已绘制，主进程再把透明窗口显现，避免闪出旧画面。
  useLayoutEffect(() => {
    if (!menuState || !rootRef.current) return undefined;
    const height = rootRef.current.offsetHeight;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => window.api.trayMenuReady(height));
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [menuState, openCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') window.api.trayMenuClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!menuState) return <TrayMenuSkeleton />;

  const visibleItems = TRAY_MENU_ITEMS.filter((item) => item.kind === 'separator' || !item.standaloneOnly || menuState.standaloneMode);

  return (
    <div ref={rootRef} className="tray-menu" role="menu" aria-label={t('tray.menuLabel')}>
      <TrayUserCard user={user} />
      <TrayMusicCard nowPlaying={nowPlaying} loading={loading} onTogglePlayback={togglePlayback} onPrevious={playPrevious} onNext={playNext} />
      <div className="tray-menu-list">
        {visibleItems.map((item) => {
          if (item.kind === 'separator') {
            return <div key={item.id} className="tray-menu-separator" role="separator" />;
          }
          return (
            <TrayMenuItem
              key={item.action}
              label={t(item.labelKey)}
              checked={item.kind === 'toggle' ? menuState.alwaysOnTop : undefined}
              disabled={Boolean(item.requiresWindow) && !menuState.windowAvailable}
              danger={item.danger}
              onSelect={() => window.api.trayMenuAction(item.action)}
            />
          );
        })}
      </div>
    </div>
  );
}
