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

/** Notch 形态预览 SVG — 刘海屏贴于屏幕顶部 */
function NotchPreview(): ReactElement {
  return (
    <svg className="guide-shape-preview-svg" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 屏幕边框 */}
      <rect x="1" y="1" width="118" height="78" rx="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* 刘海屏形态 — 贴顶，底部圆角，顶部直角 */}
      <path d="M30 0 H90 V11 Q90 22 79 22 H41 Q30 22 30 11 Z" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

/** Pill 形态预览 SVG — 胶囊悬浮于屏幕中央 */
function PillPreview(): ReactElement {
  return (
    <svg className="guide-shape-preview-svg" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 屏幕边框 */}
      <rect x="1" y="1" width="118" height="78" rx="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* 胶囊形态 — 全圆角，居中悬浮 */}
      <rect x="30" y="24" width="60" height="22" rx="11" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
}

/** 形态预览组件映射 */
const SHAPE_PREVIEW: Record<string, () => ReactElement> = {
  notch: NotchPreview,
  pill: PillPreview,
};

/**
 * 灵动岛形态设置步骤组件
 * @description 选择 notch（刘海屏）或 pill（灵动岛）形态，带可视化预览
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
        <div className="guide-shape-card-list">
          {SHAPE_MODE_OPTIONS.map((opt) => {
            const Preview = SHAPE_PREVIEW[opt.value];
            return (
              <button
                key={opt.value}
                className={`guide-shape-card${mode === opt.value ? ' selected' : ''}`}
                onClick={(): void => { setMode(opt.value); }}
              >
                <div className="guide-shape-preview">
                  {Preview && <Preview />}
                </div>
                <span className="guide-shape-card-label">
                  {t(opt.labelKey, { defaultValue: opt.value })}
                </span>
                <span className="guide-shape-card-desc">
                  {t(opt.descKey, { defaultValue: '' })}
                </span>
              </button>
            );
          })}
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
