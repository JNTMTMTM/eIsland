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
 * @file main.mjs
 * @description 先隔离测试数据和网络，再加载真实 Electron 主进程入口。
 * @author 鸡哥
 */

import { isAbsolute } from 'node:path';
import { app, session } from 'electron';

const userData = process.env.EISLAND_E2E_USER_DATA;
if (!userData || !isAbsolute(userData)) {
  throw new Error('EISLAND_E2E_USER_DATA must be an absolute test profile path.');
}
app.setPath('userData', userData);
app.setPath('sessionData', userData);

// 所有窗口共用的主进程网络边界也被隔离，不能只拦截 renderer.fetch。
app.on('ready', () => {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => callback({ cancel: details.url.startsWith('http') }),
  );
});

// 必须在加载业务模块前设置路径，避免其初始化读取真实用户数据。
import('../src/main/index').catch((error) => {
  console.error(error);
  app.exit(1);
});
