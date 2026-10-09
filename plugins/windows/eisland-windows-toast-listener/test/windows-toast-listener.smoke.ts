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
 * @file windows-toast-listener.smoke.ts
 * @description Windows 通知监听插件冒烟测试
 * @description 快速验证通知监听原生模块的基础导出与状态读取是否可用
 * @author 鸡哥
 */

const listener = require('../');

const snapshot = {
  accessStatus: listener.getAccessStatus(),
  isListening: listener.isListening(),
  notifications: listener.getNotifications(),
};

console.log(JSON.stringify(snapshot, null, 2));