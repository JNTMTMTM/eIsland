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
 * @file AnimationSettingsPage.tsx
 * @description 设置页面 - 软件设置动画子界面
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../../../../../../store/slices';

/**
 * 渲染软件动画设置页面
 * @returns 动画设置页面
 */
export function AnimationSettingsPage(): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="max-expand-settings-section">
      <div className="settings-cards">
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.springTitle', { defaultValue: '灵动岛弹性动画 (立即生效)' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.springHint', { defaultValue: '关闭后，展开和收起动画将变得更加平滑内敛，消除弹跳感' })}</div>
          </div>
          <div className="settings-card-inline-row">
            <label className="settings-card-check">
              <input
                type="checkbox"
                checked={useIslandStore.getState().springAnimation}
                onChange={(e) => {
                  const next = e.target.checked;
                  useIslandStore.getState().setSpringAnimation(next);
                  window.api.springAnimationSet(next).catch(() => {});
                }}
              />
              {t('settings.app.animation.springToggle', { defaultValue: '启用弹性动画' })}
            </label>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">{t('settings.app.animation.animSpeedTitle', { defaultValue: '灵动岛动画速度 (立即生效)' })}</div>
            <div className="settings-card-subtitle">{t('settings.app.animation.animSpeedHint', { defaultValue: '控制灵动岛状态切换时的过渡动画快慢' })}</div>
          </div>
          <div className="settings-card-inline-row">
            {(['slow', 'medium', 'fast'] as const).map((speed) => (
              <label className="settings-card-check" key={speed}>
                <input
                  type="radio"
                  name="animation-speed"
                  checked={useIslandStore.getState().animationSpeed === speed}
                  onChange={() => {
                    useIslandStore.getState().setAnimationSpeed(speed);
                    window.api.animationSpeedSet(speed).catch(() => {});
                  }}
                />
                {t(`settings.app.animation.animSpeed_${speed}`, {
                  defaultValue: speed === 'slow' ? '慢' : speed === 'medium' ? '中' : '快',
                })}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
