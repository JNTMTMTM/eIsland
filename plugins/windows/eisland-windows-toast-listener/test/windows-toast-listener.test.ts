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
 * @file windows-toast-listener.test.ts
 * @description Windows 通知监听插件单元测试
 * @description 验证通知监听原生模块的导出、基础状态与返回结构
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';

const listener = require('../') as {
  requestAccess: () => 'unspecified' | 'allowed' | 'denied' | 'unknown';
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
  startListening: (callback: (event: { kind: 'added' | 'removed' | 'unknown'; notificationId: number }) => void) => boolean;
  stopListening: () => boolean;
  isListening: () => boolean;
  enableSuppression: () => boolean;
  disableSuppression: () => boolean;
  isSuppressionEnabled: () => boolean;
};

const accessStatuses = ['unspecified', 'allowed', 'denied', 'unknown'];

describe('windows-toast-listener', () => {
  it('exports toast listener methods', () => {
    expect(typeof listener.requestAccess).toBe('function');
    expect(typeof listener.getAccessStatus).toBe('function');
    expect(typeof listener.getNotifications).toBe('function');
    expect(typeof listener.startListening).toBe('function');
    expect(typeof listener.stopListening).toBe('function');
    expect(typeof listener.isListening).toBe('function');
    expect(typeof listener.enableSuppression).toBe('function');
    expect(typeof listener.disableSuppression).toBe('function');
    expect(typeof listener.isSuppressionEnabled).toBe('function');
  });

  it('returns access status and passive notification snapshot shapes', () => {
    const status = listener.getAccessStatus();
    const notifications = listener.getNotifications();

    expect(accessStatuses).toContain(status);
    expect(Array.isArray(notifications)).toBe(true);

    for (const notification of notifications) {
      expect(notification.id).toBeTypeOf('number');
      expect(notification.appUserModelId).toBeTypeOf('string');
      expect(notification.appDisplayName).toBeTypeOf('string');
      expect(notification.title).toBeTypeOf('string');
      expect(notification.body).toBeTypeOf('string');
      expect(Array.isArray(notification.texts)).toBe(true);
      expect(notification.createdAt).toBeTypeOf('number');
    }
  });

  it('reports listener state and validates callback argument', () => {
    listener.stopListening();

    expect(listener.isListening()).toBe(false);
    expect(() => listener.startListening(undefined as unknown as () => void)).toThrow();
    expect(listener.isListening()).toBe(false);
    expect(listener.stopListening()).toBe(false);
  });

  it('manages suppression state independently', () => {
    listener.disableSuppression();
    expect(listener.isSuppressionEnabled()).toBe(false);

    expect(listener.enableSuppression()).toBe(true);
    expect(listener.isSuppressionEnabled()).toBe(true);

    expect(listener.disableSuppression()).toBe(true);
    expect(listener.isSuppressionEnabled()).toBe(false);
  });
});