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
 * @file passiveNotificationSnapshot.ts
 * @description 原生通知测试的权限感知快照读取，区分未授权环境与采集异常。
 * @author 鸡哥
 */

import type { ToastAccessStatus, ToastNotificationSnapshot } from '../index';

interface PassiveNotificationSnapshot {
  accessStatus: ToastAccessStatus;
  notifications: ToastNotificationSnapshot[] | null;
}

/**
 * 读取真实或受控的通知 API；未授权时仅接受原生入口已知的读取错误。
 * @param listener - 提供权限查询和通知读取的插件接口。
 * @returns 通知快照；null 表示未授权导致读取不可用，与空通知列表区分。
 */
export default function readPassiveNotificationSnapshot(
  listener: Pick<typeof import('../index'), 'getAccessStatus' | 'getNotifications'>,
): PassiveNotificationSnapshot {
  const accessStatus = listener.getAccessStatus();
  try {
    const notifications = listener.getNotifications();
    if (!Array.isArray(notifications)) throw new TypeError('getNotifications() must return an array.');
    return { accessStatus, notifications };
  } catch (error) {
    // 已授权的采集失败、加载错误及其他异常都不能被 CI 环境差异掩盖。
    if (!['unspecified', 'denied', 'unknown'].includes(accessStatus)
      || !(error instanceof Error)
      || error.message !== 'Failed to get Windows notifications.') {
      throw error;
    }
    return { accessStatus, notifications: null };
  }
}
