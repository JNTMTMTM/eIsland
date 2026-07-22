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
 * @file ShapeStep.tsx
 * @description 引导配置 — 灵动岛形态设置步骤组件
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SHAPE_MODE_OPTIONS } from '../config/shapeOptions';
import { useShapeSetting } from '../hooks/useShapeSetting';
import type { ShapeStepProps } from '../types';

/**
 * 灵动岛形态设置步骤组件
 * @description 选择 notch（刘海屏）或 pill（灵动岛）形态
 */
export function ShapeStep({ onNext, onPrev }: ShapeStepProps): ReactElement {
  const { t } = useTranslation();
  const { mode, setMode } = useShapeSetting();

  return (
    <div className="guide-step">
      <div className="guide-step-header">
        <h2>{t('guide.shape.title', { defaultValue: '灵动岛形态' })}</h2>
        <p>{t('guide.shape.subtitle', { defaultValue: '选择灵动岛的外观形态' })}</p>
      </div>
      <div className="guide-shape-content">
        <div className="guide-shape-mode-list">
          {SHAPE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`guide-shape-mode-btn${mode === opt.value ? ' selected' : ''}`}
              onClick={(): void => { setMode(opt.value); }}
            >
              <span>{t(opt.labelKey, { defaultValue: opt.value })}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="guide-step-footer">
        <button className="guide-prev-btn" onClick={onPrev}>
          {t('guide.actions.prev', { defaultValue: '上一步' })}
        </button>
        <button className="guide-next-btn" onClick={onNext}>
          {t('guide.actions.next', { defaultValue: '下一步' })}
        </button>
      </div>
    </div>
  );
}
