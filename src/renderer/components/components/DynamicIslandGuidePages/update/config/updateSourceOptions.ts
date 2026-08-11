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
 * @file updateSourceOptions.ts
 * @description 引导更新源选择步骤 — 更新源选项配置
 * @author 鸡哥
 */

import { UPDATE_SOURCES } from '../../../../states/maxExpand/components/setting/config/settingsTabConfig';
import { ServiceIcon, SvgIcon } from '../../../../../utils/SvgIcon';
import type { UpdateSourceOption } from '../types';

/** 更新源图标映射 */
const UPDATE_SOURCE_ICON_MAP: Record<string, string> = {
  'cloudflare-r2': ServiceIcon.CLOUDFLARE,
  'esa-cdn': ServiceIcon.ALIBABACLOUD,
  'github': SvgIcon.GITHUB,
};

/** 更新源选项列表（复用设置页配置，引导页暂不展示 PRO 专用源） */
export const UPDATE_SOURCE_OPTIONS: UpdateSourceOption[] = UPDATE_SOURCES
  .filter((s) => !s.proOnly)
  .map((s) => ({
    key: s.key,
    label: s.label,
    proOnly: s.proOnly ?? false,
    icon: UPDATE_SOURCE_ICON_MAP[s.key],
  }));

/** 更新源持久化存储键 */
export const UPDATE_SOURCE_STORE_KEY = 'update-source';

/** 默认更新源（首次使用时的预选值） */
export const DEFAULT_UPDATE_SOURCE = 'esa-cdn';
