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
 * @file volume.monitor.smoke.ts
 * @description Windows 默认播放设备主音量监控手动冒烟测试
 * @author 鸡哥
 */

import type * as volumeTypes from '../';

const volume = require('../') as typeof volumeTypes;
const monitor = new volume.VolumeMonitor();
const durationMs = 15000;

monitor.on('volume-changed', (level: number, timestamp: number) => {
  console.log(`[${new Date(timestamp).toLocaleTimeString()}] Volume: ${level}%`);
});

monitor.on('error', (error: Error) => {
  console.error('[VolumeMonitor]', error);
});

monitor.start();
console.log(`Monitoring volume for ${durationMs / 1000}s. Adjust the system volume now.`);

setTimeout(() => {
  monitor.stop();
  console.log('Volume monitor stopped.');
}, durationMs);