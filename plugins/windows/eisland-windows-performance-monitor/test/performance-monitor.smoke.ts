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
 * @file performance-monitor.smoke.ts
 * @description Windows 性能采集插件冒烟测试
 * @description 快速验证 CPU、内存与温度采集方法是否可用
 * @author 鸡哥
 */

const monitor = require('../');

const snapshot = {
  cpu: monitor.getCpu(),
  memory: monitor.getMemory(),
  temperature: monitor.getTemperature(),
  hardwareList: monitor.getHardwareList(),
};

console.log(JSON.stringify(snapshot, null, 2));