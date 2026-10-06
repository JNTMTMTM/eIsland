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
 * @file windows-toast-listener.suppression.smoke.ts
 * @description 通知抑制功能冒烟测试
 * @description 验证抑制开启时新通知仍可检测但自动从操作中心移除
 * @author 鸡哥
 */

const listener = require('../');

const LISTENER_TIMEOUT_MS = Number.parseInt(process.env.TOAST_LISTENER_TIMEOUT_MS ?? '15000', 10);

type ToastNotificationChangedEvent = {
  kind: 'added' | 'removed' | 'unknown';
  notificationId: number;
};

const main = () => {
  listener.stopListening();

  let accessStatus = listener.getAccessStatus();
  if (accessStatus !== 'allowed') {
    accessStatus = listener.requestAccess();
  }

  if (accessStatus !== 'allowed') {
    console.error('[exit] notification access not granted');
    process.exit(1);
  }

  console.log(`[init] suppression before: ${listener.isSuppressionEnabled()}`);

  listener.enableSuppression();
  console.log(`[init] suppression after enable: ${listener.isSuppressionEnabled()}`);

  listener.startListening((event: ToastNotificationChangedEvent) => {
    console.log(JSON.stringify(event));
  });

  console.log(`[init] listening=${listener.isListening()}, suppression=${listener.isSuppressionEnabled()}`);

  setTimeout(() => {
    listener.disableSuppression();
    listener.stopListening();
    console.log(`[exit] suppression after disable: ${listener.isSuppressionEnabled()}`);
    console.log(`[exit] timeout ${LISTENER_TIMEOUT_MS}ms reached`);
    process.exit(0);
  }, LISTENER_TIMEOUT_MS);
};

void main();
