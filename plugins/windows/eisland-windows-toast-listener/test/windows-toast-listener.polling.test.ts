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
 * @file windows-toast-listener.polling.test.ts
 * @description Windows 通知监听插件轮询单元测试
 * @description 验证通知监听原生模块在连续轮询场景下保持可用结构
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

const listener = require('../') as {
  getAccessStatus: () => 'unspecified' | 'allowed' | 'denied' | 'unknown';
  getNotifications: () => Array<{
    id: number;
    appUserModelId: string;
    appDisplayName: string;
    title: string;
    body: string;
    texts: string[];
    createdAt: number;
  }>;
  stopListening: () => boolean;
  isListening: () => boolean;
};

const POLL_TIMES = 5;
const POLL_INTERVAL_MS = 20;
const accessStatuses = ['unspecified', 'allowed', 'denied', 'unknown'];

const wait = (delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs));

type ToastPollingSnapshot = {
  index: number;
  accessStatus: string;
  isListening: boolean;
  notificationCount: number;
};

function takeSnapshot(index: number): ToastPollingSnapshot {
  const accessStatus = listener.getAccessStatus();
  const notifications = listener.getNotifications();
  const isListening = listener.isListening();

  expect(accessStatuses).toContain(accessStatus);
  expect(Array.isArray(notifications)).toBe(true);
  expect(isListening).toBeTypeOf('boolean');

  for (const notification of notifications) {
    expect(notification.id).toBeTypeOf('number');
    expect(notification.appUserModelId).toBeTypeOf('string');
    expect(notification.appDisplayName).toBeTypeOf('string');
    expect(notification.title).toBeTypeOf('string');
    expect(notification.body).toBeTypeOf('string');
    expect(Array.isArray(notification.texts)).toBe(true);
    expect(notification.createdAt).toBeTypeOf('number');
  }

  return {
    index,
    accessStatus,
    isListening,
    notificationCount: notifications.length,
  };
}

describe('windows-toast-listener polling', () => {
  it('keeps access status, listener state, and notification snapshots valid during polling', { timeout: 30000 }, async () => {
    listener.stopListening();

    const snapshots: ToastPollingSnapshot[] = [];

    for (let index = 0; index < POLL_TIMES; index += 1) {
      snapshots.push(takeSnapshot(index));

      if (index < POLL_TIMES - 1) {
        await wait(POLL_INTERVAL_MS);
      }
    }

    expect(snapshots).toHaveLength(POLL_TIMES);
    expect(snapshots.every((snapshot) => snapshot.index >= 0)).toBe(true);
    expect(snapshots.every((snapshot) => accessStatuses.includes(snapshot.accessStatus))).toBe(true);
    expect(snapshots.every((snapshot) => typeof snapshot.notificationCount === 'number')).toBe(true);
  });
});