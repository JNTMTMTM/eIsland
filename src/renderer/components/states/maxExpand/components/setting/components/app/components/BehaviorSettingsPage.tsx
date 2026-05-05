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
 * @file BehaviorSettingsPage.tsx
 * @description 设置页面 - 软件设置交互行为子界面
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../../store/slices';
import { SvgIcon } from '../../../../../../../../utils/SvgIcon';
import type { AppSettingsSectionProps } from './types';

type HoverScreenshotMode = 'region' | 'display';

const HOVER_SCREENSHOT_MODE_STORE_KEY = 'hover-screenshot-mode';

type BehaviorSettingsPageProps = Pick<
  AppSettingsSectionProps,
  'expandLeaveIdle' | 'setExpandLeaveIdle' | 'maxExpandLeaveIdle' | 'setMaxExpandLeaveIdle'
>;

/**
 * 渲染软件交互行为设置页面
 * @param expandLeaveIdle - Expand 态鼠标离开自动收回开关
 * @param setExpandLeaveIdle - 更新 Expand 态自动收回开关
 * @param maxExpandLeaveIdle - MaxExpand 态鼠标离开自动收回开关
 * @param setMaxExpandLeaveIdle - 更新 MaxExpand 态自动收回开关
 * @returns 交互行为设置页面
 */
export function BehaviorSettingsPage({
  expandLeaveIdle,
  setExpandLeaveIdle,
  maxExpandLeaveIdle,
  setMaxExpandLeaveIdle,
}: BehaviorSettingsPageProps): ReactElement {
  const { t } = useTranslation();
  const setNotification = useIslandStore((s) => s.setNotification);

  const [standaloneWindowMode, setStandaloneWindowMode] = useState<'integrated' | 'standalone'>('integrated');
  const [hoverScreenshotMode, setHoverScreenshotMode] = useState<HoverScreenshotMode>('region');
  const [idleClickExpand, setIdleClickExpand] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead('standalone-window-mode').then((data) => {
      if (cancelled) return;
      if (data === 'standalone') {
        setStandaloneWindowMode('standalone');
        return;
      }
      window.api.storeRead('countdown-window-mode').then((legacyData) => {
        if (cancelled) return;
        if (legacyData === 'standalone') setStandaloneWindowMode('standalone');
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.idleClickExpandGet().then((v) => {
      if (cancelled) return;
      setIdleClickExpand(v);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.api.storeRead(HOVER_SCREENSHOT_MODE_STORE_KEY).then((data) => {
      if (cancelled) return;
      if (data === 'display') {
        setHoverScreenshotMode('display');
        return;
      }
      setHoverScreenshotMode('region');
    }).catch(() => {
      if (cancelled) return;
      setHoverScreenshotMode('region');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStandaloneWindowModeChange = (mode: 'integrated' | 'standalone'): void => {
    setStandaloneWindowMode(mode);
    window.api.storeWrite('standalone-window-mode', mode).catch(() => {});

    const restartRequiredNotification = {
      title: t('settings.app.notifications.configChanged.title', { defaultValue: '配置变更' }),
      body: t('settings.app.notifications.configChanged.body', { defaultValue: '待办事项/倒数日/设置打开方式已变更。' }),
      icon: SvgIcon.SETTING,
      type: 'restart-required',
    } as const;

    setNotification(restartRequiredNotification);
    window.api.settingsPreview('notification:show', restartRequiredNotification).catch(() => {});
  };

  const handleHoverScreenshotModeChange = (mode: HoverScreenshotMode): void => {
    setHoverScreenshotMode(mode);
    window.api.storeWrite(HOVER_SCREENSHOT_MODE_STORE_KEY, mode).catch(() => {});
  };

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.mouseLeaveTitle', { defaultValue: '鼠标移开自动收回' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.mouseLeaveHint', { defaultValue: '启用后，鼠标离开灵动岛时将自动回到空闲状态（若正在播放音乐则切到歌词态）' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={expandLeaveIdle}
                onChange={(e) => {
                  setExpandLeaveIdle(e.target.checked);
                  window.api.expandMouseleaveIdleSet(e.target.checked).catch(() => {});
                }}
              />
              {t('settings.app.behavior.expandLeaveToggle', { defaultValue: '展开态（Expand）鼠标移开后自动收回' })}
            </label>
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={maxExpandLeaveIdle}
                onChange={(e) => {
                  setMaxExpandLeaveIdle(e.target.checked);
                  window.api.maxexpandMouseleaveIdleSet(e.target.checked).catch(() => {});
                }}
              />
              {t('settings.app.behavior.maxExpandLeaveToggle', { defaultValue: '最大展开态（MaxExpand）鼠标移开后自动收回' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.idleClickExpandTitle', { defaultValue: '空闲态点击展开' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.idleClickExpandHint', { defaultValue: '启用后，鼠标悬停在灵动岛上不会自动展开，需要点击才能展开，后续交互不受影响' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={idleClickExpand}
                onChange={(e) => {
                  setIdleClickExpand(e.target.checked);
                  window.api.idleClickExpandSet(e.target.checked).catch(() => {});
                }}
              />
              {t('settings.app.behavior.idleClickExpandToggle', { defaultValue: '空闲状态下点击展开（禁用悬停自动展开）' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.windowModeTitle', { defaultValue: '待办事项 / 倒数日 / 设置 打开方式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.windowModeHint', { defaultValue: '选择点击导航时，在灵动岛内显示还是打开独立窗口' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="standalone-window-mode"
                checked={standaloneWindowMode === 'integrated'}
                onChange={() => {
                  handleStandaloneWindowModeChange('integrated');
                }}
              />
              {t('settings.app.behavior.integratedMode', { defaultValue: '集成在灵动岛中' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="standalone-window-mode"
                checked={standaloneWindowMode === 'standalone'}
                onChange={() => {
                  handleStandaloneWindowModeChange('standalone');
                }}
              />
              {t('settings.app.behavior.standaloneMode', { defaultValue: '独立窗口' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.behavior.hoverScreenshotModeTitle', { defaultValue: '悬停界面截图按钮模式' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.behavior.hoverScreenshotModeHint', { defaultValue: '配置 hover 界面的截图按钮触发选区截图或显示器截图' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="radio"
                name="hover-screenshot-mode"
                checked={hoverScreenshotMode === 'region'}
                onChange={() => {
                  handleHoverScreenshotModeChange('region');
                }}
              />
              {t('settings.app.behavior.hoverScreenshotModeRegion', { defaultValue: '选区截图' })}
            </label>
            <label className="settings-card-check">
              <input
                type="radio"
                name="hover-screenshot-mode"
                checked={hoverScreenshotMode === 'display'}
                onChange={() => {
                  handleHoverScreenshotModeChange('display');
                }}
              />
              {t('settings.app.behavior.hoverScreenshotModeDisplay', { defaultValue: '显示器截图' })}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
