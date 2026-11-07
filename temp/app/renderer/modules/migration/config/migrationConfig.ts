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
 * @file migrationConfig.ts
 * @description 导航步骤与可取消阶段的界面配置。
 * @author 鸡哥
 */
import alibabaCloudIcon from '../../../../public/svg/ALIBABACLOUD.svg?url&no-inline';
import cloudflareIcon from '../../../../public/svg/CLOUDFLARE.svg?url&no-inline';
import githubIcon from '../../../../public/svg/GITHUB.svg?url&no-inline';
import tencentCloudIcon from '../../../../public/svg/TENCENTCLOUD.svg?url&no-inline';
import chinaFlag from '../../../../public/svg/CHN.svg?url&no-inline';
import usaFlag from '../../../../public/svg/USA.svg?url&no-inline';
import japanFlag from '../../../../public/svg/JP.svg?url&no-inline';
import type { Phase, SourceId } from '../../../../shared/types/adapterTypes';
export const LANGUAGES = [
  { code: 'zh-CN', icon: chinaFlag },
  { code: 'zh-TW', icon: chinaFlag },
  { code: 'en-US', icon: usaFlag },
  { code: 'ja-JP', icon: japanFlag },
];
export const BUSY_PHASES: Phase[] = ['inspecting', 'backing-up', 'downloading', 'verifying', 'installing'];
export const STEPS = ['welcome', 'review', 'protect', 'finish'];
/** 在线源图标；可见源由主进程的 state.sources 决定。 */
export const SOURCE_ICONS: Partial<Record<SourceId, string>> = {
  esa: alibabaCloudIcon,
  r2: cloudflareIcon,
  github: githubIcon,
  cos: tencentCloudIcon,
  oss: alibabaCloudIcon,
};
