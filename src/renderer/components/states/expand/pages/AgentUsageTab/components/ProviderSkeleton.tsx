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
 * @file ProviderSkeleton.tsx
 * @description Expanded Agent 用量页首次加载时的来源骨架卡片。
 * @author 鸡哥
 */

import { AGENT_USAGE_PROVIDER_ICONS, TOKEN_BREAKDOWN_KEYS } from '../config/agentUsageConfig';
import type { ReactElement } from 'react';
import type { ProviderSkeletonProps } from '../types/agentUsageTypes';

/**
 * 渲染单个来源的加载骨架卡片。
 * @description 沿用真实卡片的四行布局，数据到达后切换不会产生位移。
 * @param props - 组件参数
 * @param props.provider - 来源标识，用于保留来源色点
 * @returns 骨架卡片
 */
export function ProviderSkeleton({ provider }: ProviderSkeletonProps): ReactElement {
  return (
    <div className={`au-card au-card--${provider} au-card-skeleton`} aria-hidden="true">
      <img className="au-card-icon" src={AGENT_USAGE_PROVIDER_ICONS[provider]} alt="" draggable={false} />
      <div className="au-card-head">
        <span className="au-card-dot" />
        <span className="au-skeleton-block au-skeleton-name" />
        <span className="au-skeleton-block au-skeleton-model" />
      </div>
      <div className="au-card-summary">
        <span className="au-skeleton-block au-skeleton-today" />
        <span className="au-skeleton-block au-skeleton-meta" />
      </div>
      <div className="au-card-breakdown">
        {TOKEN_BREAKDOWN_KEYS.map((key) => <span key={key} className="au-skeleton-block au-skeleton-cell" />)}
      </div>
      <div className="au-card-quota">
        <span className="au-skeleton-block au-skeleton-bar" />
      </div>
    </div>
  );
}
