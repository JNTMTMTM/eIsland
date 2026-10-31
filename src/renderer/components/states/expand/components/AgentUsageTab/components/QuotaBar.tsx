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
 * @file QuotaBar.tsx
 * @description Expanded Agent 用量卡片中的单个额度窗口进度条。
 * @author 鸡哥
 */

import { effectivePercent, quotaLevel, resetLabel, windowLabel } from '../utils/agentUsageUtils';
import type { ReactElement } from 'react';
import type { QuotaBarProps } from '../types/agentUsageTypes';

/**
 * 渲染额度窗口进度条。
 * @param props - 组件参数
 * @param props.quota - 额度窗口
 * @param props.now - 快照生成时间
 * @param props.t - 翻译函数
 * @returns 额度行
 */
export function QuotaBar({ quota, now, t }: QuotaBarProps): ReactElement {
  const percent = effectivePercent(quota, now);
  const level = quotaLevel(percent);
  const resetText = resetLabel(quota.resetsAt, now, t);
  return (
    <div className="au-quota">
      <span className="au-quota-label">{windowLabel(quota.windowMinutes, t)}</span>
      <div className="au-quota-track">
        <div className={`au-quota-fill${level ? ` au-quota-fill--${level}` : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="au-quota-value">{`${Math.round(percent)}%`}</span>
      {resetText && <span className="au-quota-reset">{resetText}</span>}
    </div>
  );
}
