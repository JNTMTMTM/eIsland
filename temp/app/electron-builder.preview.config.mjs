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
 * @file electron-builder.preview.config.mjs
 * @description 缺少正式密钥时仅生成明确标记的离线预览包，绝不生成可发布的 latest.yml。
 * @author 鸡哥
 */
import production from './electron-builder.config.mjs';
export default {
  ...production, publish: null,
  appId: 'com.pyisland.migration.preview', productName: 'eIsland Migration PREVIEW', executableName: 'eIsland-Migration-PREVIEW',
  directories: { output: 'test-results/preview' },
  win: { ...production.win, artifactName: 'eIsland-Migration-PREVIEW-${version}-Setup.${ext}' },
  portable: { artifactName: 'eIsland-Migration-PREVIEW-${version}.${ext}' },
  nsis: { ...production.nsis, shortcutName: 'eIsland Migration PREVIEW', runAfterFinish: false },
};
