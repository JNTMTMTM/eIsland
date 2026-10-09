/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file worker.cjs
 * @description Worker 强制退出测试，同时保留监听与后台查询。
 * @author 鸡哥
 */
const { workerData } = require('node:worker_threads');
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
const { MediaClient, MediaMonitor } = require('../../index');
const client = new MediaClient({ resourceDirectory: workerData, timeoutMs: 30000 });
const monitor = new MediaMonitor(client);
monitor.on('error', () => monitor.stop());
monitor.start();
client.refresh().catch(() => {});
