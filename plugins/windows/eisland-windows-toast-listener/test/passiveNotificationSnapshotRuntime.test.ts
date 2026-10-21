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
 */

/**
 * @file passiveNotificationSnapshotRuntime.test.ts
 * @description 模拟 CI 未授权通知读取失败，并验证已授权失败和其他异常不会被吞掉。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import readPassiveNotificationSnapshot from './passiveNotificationSnapshot';
import type { ToastAccessStatus, ToastNotificationSnapshot } from '../index';

/**
 * 构造可切换权限与采集结果的原生接口边界。
 * @param status - 本轮返回的通知访问权限。
 * @returns 权限和通知查询的可观测替身。
 */
function createListener(status: ToastAccessStatus = 'allowed') {
  return {
    getAccessStatus: vi.fn(() => status),
    getNotifications: vi.fn<() => ToastNotificationSnapshot[]>(() => []),
  };
}

describe('passive Windows notification snapshots', () => {
  it.each(['unspecified', 'denied', 'unknown'] as const)('recognizes the CI query error only with %s access', (status) => {
    const listener = createListener(status);
    listener.getNotifications.mockImplementation(() => { throw new Error('Failed to get Windows notifications.'); });
    expect(readPassiveNotificationSnapshot(listener)).toEqual({ accessStatus: status, notifications: null });
    expect(listener.getNotifications).toHaveBeenCalledOnce();
  });

  it.each(['allowed', 'denied'] as const)('preserves a successful query with %s access', (status) => {
    const listener = createListener(status);
    const notifications: ToastNotificationSnapshot[] = [{
      id: 1, appUserModelId: 'fixture', appDisplayName: 'Fixture', title: 'Title', body: 'Body', texts: ['Title', 'Body'], createdAt: 1,
    }];
    listener.getNotifications.mockReturnValue(notifications);
    expect(readPassiveNotificationSnapshot(listener).notifications).toBe(notifications);
  });

  it('still fails when an allowed query throws the same native error', () => {
    const listener = createListener();
    const failure = new Error('Failed to get Windows notifications.');
    listener.getNotifications.mockImplementation(() => { throw failure; });
    expect(() => readPassiveNotificationSnapshot(listener)).toThrow(failure);
  });

  it('does not hide unrelated errors even when access is denied', () => {
    const listener = createListener('denied');
    const failure = new Error('Native binding unavailable');
    listener.getNotifications.mockImplementation(() => { throw failure; });
    expect(() => readPassiveNotificationSnapshot(listener)).toThrow(failure);
  });

  it('does not hide permission query failures', () => {
    const listener = createListener();
    const failure = new Error('Access status unavailable');
    listener.getAccessStatus.mockImplementation(() => { throw failure; });
    expect(() => readPassiveNotificationSnapshot(listener)).toThrow(failure);
    expect(listener.getNotifications).not.toHaveBeenCalled();
  });

  it.each([null, undefined, {}])('rejects an invalid query result even without permission: %s', (result) => {
    const listener = createListener('denied');
    listener.getNotifications.mockReturnValue(result as ToastNotificationSnapshot[]);
    expect(() => readPassiveNotificationSnapshot(listener)).toThrow('getNotifications() must return an array.');
  });

  it('rechecks permission when access changes between polls', () => {
    const listener = createListener('denied');
    listener.getNotifications.mockImplementationOnce(() => { throw new Error('Failed to get Windows notifications.'); });
    expect(readPassiveNotificationSnapshot(listener).notifications).toBeNull();
    listener.getAccessStatus.mockReturnValue('allowed');
    expect(readPassiveNotificationSnapshot(listener)).toEqual({ accessStatus: 'allowed', notifications: [] });
  });
});
