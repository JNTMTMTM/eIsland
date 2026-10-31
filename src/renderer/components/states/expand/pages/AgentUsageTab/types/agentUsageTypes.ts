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
 * @file agentUsageTypes.ts
 * @description Expanded Agent 用量 Tab 的子组件入参与 hook 返回值类型。
 * @author 鸡哥
 */

import type {
  AgentUsageProviderId,
  AgentUsageProviderSnapshot,
  AgentUsageRateLimitWindow,
  AgentUsageSnapshot,
} from '../../../../../../../preload/types/agentUsage';

/** 翻译函数 */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/** QuotaBar 组件入参 */
export interface QuotaBarProps {
  quota: AgentUsageRateLimitWindow;
  now: number;
  t: Translate;
}

/** ProviderCard 组件入参 */
export interface ProviderCardProps {
  provider: AgentUsageProviderSnapshot;
  now: number;
  t: Translate;
}

/** ProviderSkeleton 组件入参 */
export interface ProviderSkeletonProps {
  provider: AgentUsageProviderId;
}

/** useAgentUsageTab hook 返回值类型 */
export interface UseAgentUsageTabReturn {
  snapshot: AgentUsageSnapshot | null;
  failed: boolean;
  loading: boolean;
  handleRefresh: () => void;
}
