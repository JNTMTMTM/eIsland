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
 * @file updater.ts
 * @description 更新模块常量配置
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import type { UpdateSourceKey } from '../types';

/** 默认更新源 */
export const DEFAULT_UPDATE_SOURCE: UpdateSourceKey = 'cloudflare-r2';

/** Cloudflare R2 更新 URL */
export const R2_UPDATE_URL = 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev';

/** ESA CDN 更新 URL */
export const ESA_CDN_URL = 'https://eisland-server-download-cdn.pyisland.com/eisland-update';

/** GitHub 仓库所有者 */
export const GITHUB_OWNER = 'JNTMTMTM';

/** GitHub 仓库名 */
export const GITHUB_REPO = 'eIsland';
