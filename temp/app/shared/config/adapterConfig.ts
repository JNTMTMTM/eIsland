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
 * @file adapterConfig.ts
 * @description 兼容版本、应用标识、官方公开更新源及数据与网络上限。
 * @author 鸡哥
 */
export const ADAPTER_VERSION = '27.0.2';
export const MINIMUM_TAURI_VERSION = '27.0.3';
export const LEGACY_APP_ID = 'com.eisland.app';
export const TAURI_APP_ID = 'com.pyisland.eisland';
export const MAX_INSTALLER_BYTES = 2 * 1024 ** 3;
export const MAX_BACKUP_BYTES = 8 * 1024 ** 3;
export const MAX_BACKUP_FILES = 100000;
export const FEEDS = {
  esa: 'https://eisland-server-download-cdn.pyisland.com/eisland-update/tauri/latest.json',
  r2: 'https://pub-4c1e73c3c2004901aecd6ca014cb16bd.r2.dev/eisland-update/tauri/latest.json',
  github: 'https://github.com/JNTMTMTM/eIsland/releases/latest/download/tauri-latest.json',
};
export const IPC = {
  state: 'adapter:state', changed: 'adapter:changed', inspect: 'adapter:inspect', local: 'adapter:local',
  prepare: 'adapter:prepare', install: 'adapter:install', cancel: 'adapter:cancel',
  dismissError: 'adapter:dismiss-error',
  backup: 'adapter:backup', launch: 'adapter:launch', close: 'adapter:close',
};
