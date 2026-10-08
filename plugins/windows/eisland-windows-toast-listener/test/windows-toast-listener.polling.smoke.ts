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
 * @file windows-toast-listener.polling.smoke.ts
 * @description Windows 通知监听插件轮询冒烟测试
 * @description 连续读取通知监听权限、监听状态与通知快照并输出轮询结果
 * @author 鸡哥
 */

const listener = require('../');
const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

const POLL_TIMES = Number.parseInt(process.env.TOAST_LISTENER_POLL_TIMES ?? '50', 10);
const POLL_INTERVAL_MS = Number.parseInt(process.env.TOAST_LISTENER_POLL_INTERVAL_MS ?? '100', 10);

type ToastNotificationSnapshot = {
  id: number;
  appUserModelId: string;
  appDisplayName: string;
  title: string;
  body: string;
  texts: string[];
  createdAt: number;
};

function takeSnapshot(index: number) {
  const notifications = listener.getNotifications() as ToastNotificationSnapshot[];

  return {
    index,
    accessStatus: listener.getAccessStatus() as string,
    isListening: listener.isListening() as boolean,
    notificationCount: notifications.length,
    notifications,
  };
}

const main = async () => {
  listener.stopListening();

  for (let index = 0; index < POLL_TIMES; index += 1) {
    const snapshot = takeSnapshot(index);
    console.log(JSON.stringify(snapshot, null, 2));

    if (index < POLL_TIMES - 1) {
      await wait(POLL_INTERVAL_MS);
    }
  }
};

void main();