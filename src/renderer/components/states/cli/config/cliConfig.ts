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
 * @file cliConfig.ts
 * @description CLI 状态的完整面板目标页与 Claude Code 授权按钮配置。
 * @author 鸡哥
 */

import type { MaxExpandTab } from '../../../../store/types';
import type { CliPermissionOption } from '../types/cliTypes';

/** 点击状态主体进入的最大展开页 */
export const CLI_PANEL_TAB: MaxExpandTab = 'cli';

/** 授权按钮，按拒绝、批准、永久批准的顺序展示 */
export const CLI_PERMISSION_OPTIONS: readonly CliPermissionOption[] = [
  { decision: 'deny', labelKey: 'cli.permission.deny', defaultLabel: '拒绝' },
  { decision: 'allow', labelKey: 'cli.permission.allow', defaultLabel: '批准' },
  { decision: 'always', labelKey: 'cli.permission.always', defaultLabel: '永久批准' },
];
