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
 * @file electron-builder.config.mjs
 * @description 沿用旧 Electron 安装器标识，使旧 latest.yml 先升级到迁移助手。
 * @author 鸡哥
 */
export default {
  appId: 'com.eisland.app', productName: 'eIsland', executableName: 'eIsland',
  directories: { output: 'dist' },
  files: ['out/**', 'package.json'],
  extraResources: [{ from: 'native/verifier/target/release/eisland-update-verifier.exe', to: 'native/eisland-update-verifier.exe' }, { from: '../../LICENSE', to: 'LICENSE' }],
  asar: true,
  win: { target: ['nsis', 'portable'], icon: '../../resources/icon/eisland_256x256.ico', artifactName: '${productName}-${version}-Setup.${ext}' },
  nsis: { oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true, allowElevation: true, deleteAppDataOnUninstall: false, shortcutName: 'eIsland Migration', runAfterFinish: true },
  portable: { artifactName: 'eIsland-Migration-${version}.${ext}' },
  publish: [{ provider: 'generic', url: 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev' }],
};
