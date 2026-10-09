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

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-wifi-helper only supports Windows.');
}

const { callJson } = require('./ffi-loader');
const { WifiMonitor } = require('./wifi-monitor');

/**
 * 获取当前 WiFi 连接状态快照
 * @returns {import('.').WifiInfo | null}
 */
function getWifiInfo() {
  return callJson('wf_get_wifi_info');
}

module.exports = {
  getWifiInfo,
  WifiMonitor,
};
