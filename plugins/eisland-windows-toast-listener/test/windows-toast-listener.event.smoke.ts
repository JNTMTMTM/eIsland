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
 * @file windows-toast-listener.event.smoke.ts
 * @description Windows 通知监听插件事件驱动冒烟测试
 * @description 注册实时监听，收到通知变更时立即回调并输出完整快照
 * @author 鸡哥
 */

const listener = require('../');

const LISTENER_TIMEOUT_MS = Number.parseInt(process.env.TOAST_LISTENER_TIMEOUT_MS ?? '30000', 10);

type ToastNotificationSnapshot = {
  id: number;
  appUserModelId: string;
  appDisplayName: string;
  title: string;
  body: string;
  texts: string[];
  createdAt: number;
};

type ToastNotificationChangedEvent = {
  kind: 'added' | 'removed' | 'unknown';
  notificationId: number;
};

function printSnapshot(label: string, event: ToastNotificationChangedEvent) {
  const notifications = listener.getNotifications() as ToastNotificationSnapshot[];
  const target = notifications.find((n) => n.id === event.notificationId);

  console.log(JSON.stringify({
    label,
    event,
    matched: target ?? null,
    totalNotifications: notifications.length,
  }, null, 2));
}

const main = () => {
  listener.stopListening();

  let accessStatus = listener.getAccessStatus();
  console.log(`[init] accessStatus=${accessStatus}, isListening=${listener.isListening()}`);

  if (accessStatus !== 'allowed') {
    console.log('[init] requesting access...');
    accessStatus = listener.requestAccess();
    console.log(`[init] accessStatus=${accessStatus}`);
  }

  if (accessStatus !== 'allowed') {
    console.error('[exit] notification access not granted, aborting');
    process.exit(1);
  }

  const started = listener.startListening((event: ToastNotificationChangedEvent) => {
    printSnapshot('changed', event);
  });

  console.log(`[init] startListening=${started}, isListening=${listener.isListening()}`);

  setTimeout(() => {
    listener.stopListening();
    console.log(`[exit] timeout ${LISTENER_TIMEOUT_MS}ms reached, listener stopped`);
    process.exit(0);
  }, LISTENER_TIMEOUT_MS);
};

void main();
