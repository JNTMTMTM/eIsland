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
 * @file WelcomeStep.tsx
 * @description 引导配置 — 欢迎完成步骤组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { WelcomeStepProps } from '../types';

/**
 * 欢迎完成步骤组件
 * @description 引导完成，欢迎用户使用 eIsland
 */
export function WelcomeStep({ onComplete, onPrev }: WelcomeStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="guide-step">
      <div className="guide-step-header">
        <h2>{t('guide.welcome.title', { defaultValue: '欢迎使用 eIsland' })}</h2>
        <p>{t('guide.welcome.subtitle', { defaultValue: '配置完成，开始体验灵动岛吧' })}</p>
      </div>
      <div className="guide-welcome-video">
        <video
          src="../video/sign.webm"
          autoPlay
          muted
          playsInline
        />
      </div>
      <div className="guide-step-footer">
        <button className="guide-prev-btn" onClick={onPrev}>
          {t('guide.actions.prev', { defaultValue: '上一步' })}
        </button>
        <button className="guide-next-btn" onClick={onComplete}>
          {t('guide.actions.start', { defaultValue: '开始使用' })}
        </button>
      </div>
    </div>
  );
}
