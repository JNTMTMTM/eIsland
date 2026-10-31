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
 * @file agentUsageConfig.ts
 * @description Expanded Agent 用量 Tab 的刷新节奏、骨架来源与来源图标映射。
 * @author 鸡哥
 */

import { AgentIcon } from '../../../../../../utils/SvgIcon';
import type { AgentUsageProviderId } from '../../../../../../../preload/types/agentUsage';

export const REFRESH_INTERVAL_MS = 60_000;
export const START_FETCH_DELAY_MS = 200;

/** 首次加载时骨架卡片对应的来源 */
export const SKELETON_PROVIDERS: AgentUsageProviderId[] = ['claude', 'codex'];

/** 来源对应的品牌图标。 */
export const AGENT_USAGE_PROVIDER_ICONS: Record<AgentUsageProviderId, string> = {
  claude: AgentIcon.CLAUDE,
  codex: AgentIcon.CODEX,
};
