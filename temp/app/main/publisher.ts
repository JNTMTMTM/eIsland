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
 * @file publisher.ts
 * @description 发布预检与程序复用同一套清单、下载及签名验证逻辑，不导入 Electron。
 * @author 鸡哥
 */
export { ReleaseService, parseRelease } from './services/releaseService';
export { default as verifyInstaller } from './services/verificationService';
export const BUILT_PUBLIC_KEY = __ADAPTER_PUBLIC_KEY__;
