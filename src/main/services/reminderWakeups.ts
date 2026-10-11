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
 * @file reminderWakeups.ts
 * @description 主进程统一管理到期唤醒，不依赖隐藏页面定时器。
 * @author 鸡哥
 */

import { app, ipcMain, powerMonitor } from 'electron';
import type { WebContents } from 'electron';

/** 注册每窗口有界、共享一个定时器的提醒调度。 */
export function registerReminderWakeups(): void {
  const clients = new Map<WebContents, Map<string, number>>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timezoneOffset = new Date().getTimezoneOffset();
  const schedule = (): void => {
    clearTimeout(timer);
    timer = undefined;
    let earliest = Infinity;
    const currentOffset = new Date().getTimezoneOffset();
    const timezoneChanged = currentOffset !== timezoneOffset;
    timezoneOffset = currentOffset;
    clients.forEach((deadlines, sender) => {
      if (sender.isDestroyed()) { clients.delete(sender); return; }
      // 先通知重算本地闹钟，保证旧到期事件随后到达时已被渲染进程撤销。
      if (timezoneChanged) sender.send('settings:changed', 'runtime:clock-changed', timezoneOffset);
      deadlines.forEach((deadline, id) => {
        if (deadline <= Date.now()) {
          deadlines.delete(id);
          sender.send('settings:changed', 'runtime:wakeup', id);
        } else earliest = Math.min(earliest, deadline);
      });
    });
    // 有任务时最长一分钟检测校时与时区变化，空闲时完全不唤醒；恢复系统也立即检测。
    if (Number.isFinite(earliest)) timer = setTimeout(schedule, Math.min(60_000, earliest - Date.now()));
  };
  ipcMain.handle('runtime:schedule-wakeup', (event, id: unknown, deadline: unknown) => {
    if (typeof id !== 'string' || id.length > 100 || !id.length) return false;
    if (deadline !== null && (typeof deadline !== 'number' || !Number.isFinite(deadline))) return false;
    let deadlines = clients.get(event.sender);
    if (!deadlines && deadline !== null) {
      deadlines = new Map();
      clients.set(event.sender, deadlines);
      event.sender.once('destroyed', () => { clients.delete(event.sender); schedule(); });
      event.sender.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
        if (isMainFrame && !isInPlace) { clients.get(event.sender)?.clear(); schedule(); }
      });
    }
    if (deadline === null) deadlines?.delete(id);
    else if (deadlines && (deadlines.has(id) || deadlines.size < 64)) deadlines.set(id, deadline as number);
    else return false;
    schedule();
    return true;
  });
  powerMonitor.on('resume', schedule);
  app.once('before-quit', () => { clearTimeout(timer); clients.clear(); powerMonitor.removeListener('resume', schedule); });
}
