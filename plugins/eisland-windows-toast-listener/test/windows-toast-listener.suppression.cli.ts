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
 * @file windows-toast-listener.suppression.cli.ts
 * @description 通知抑制独立 CLI 测试
 * @description 流程: 发送通知 → 等待检测 → 开启抑制 → 发送通知 → 验证自动移除 → 关闭抑制
 * @author 鸡哥
 */

const listener = require('../');

const POLL_INTERVAL_MS = Number.parseInt(process.env.TOAST_LISTENER_POLL_INTERVAL_MS ?? '200', 10);

type ToastNotificationChangedEvent = {
  kind: 'added' | 'removed' | 'unknown';
  notificationId: number;
};

type ToastNotificationSnapshot = {
  id: number;
  title: string;
  body: string;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function sendTestNotification(tag: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const { execFile } = require('node:child_process');
    const ps = [
      `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;`,
      `[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null;`,
      `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument;`,
      `$xml.LoadXml('<toast><visual><binding template="ToastGeneric"><text>${tag}</text><text>suppression test</text></binding></visual></toast>');`,
      `$toast = [Windows.UI.Notifications.ToastNotification]::new($xml);`,
      `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('eIsland').Show($toast);`,
    ].join(' ');

    execFile('powershell', ['-Command', ps], (err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function findNotification(titleKeyword: string): ToastNotificationSnapshot | undefined {
  const notifications = listener.getNotifications() as ToastNotificationSnapshot[];
  return notifications.find((n) => n.title.includes(titleKeyword));
}

const main = async () => {
  listener.stopListening();
  listener.disableSuppression();

  let accessStatus = listener.getAccessStatus();
  if (accessStatus !== 'allowed') {
    accessStatus = listener.requestAccess();
  }
  if (accessStatus !== 'allowed') {
    console.error('[FAIL] notification access not granted');
    process.exit(1);
  }

  const events: ToastNotificationChangedEvent[] = [];
  listener.startListening((event: ToastNotificationChangedEvent) => {
    events.push({ ...event });
  });

  console.log('--- phase 1: suppression OFF ---');

  await sendTestNotification('CLI-TEST-1');
  await wait(POLL_INTERVAL_MS * 4);

  const snapshot1 = findNotification('CLI-TEST-1');
  console.log(`[1] notification found: ${snapshot1 !== undefined}`);
  if (!snapshot1) {
    console.error('[FAIL] notification not detected without suppression');
    process.exit(1);
  }
  console.log(`[1] title="${snapshot1.title}" id=${snapshot1.id}`);

  console.log('--- phase 2: suppression ON ---');

  listener.enableSuppression();
  console.log(`[2] suppression=${listener.isSuppressionEnabled()}`);

  events.length = 0;
  await sendTestNotification('CLI-TEST-2');
  await wait(POLL_INTERVAL_MS * 12);

  const addedEvent = events.find((e) => e.kind === 'added');
  console.log(`[2] added event received: ${addedEvent !== undefined}`);
  if (!addedEvent) {
    console.error('[FAIL] callback should still fire when suppression is on');
    process.exit(1);
  }

  const snapshot2 = findNotification('CLI-TEST-2');
  console.log(`[2] visible in getNotifications: ${snapshot2 !== undefined}`);
  if (snapshot2) {
    console.error('[FAIL] notification should be hidden from getNotifications when suppressed');
    process.exit(1);
  }

  console.log('--- phase 3: suppression OFF again ---');

  listener.disableSuppression();
  console.log(`[3] suppression=${listener.isSuppressionEnabled()}`);

  events.length = 0;
  await sendTestNotification('CLI-TEST-3');
  await wait(POLL_INTERVAL_MS * 12);

  const snapshot3 = findNotification('CLI-TEST-3');
  console.log(`[3] notification found: ${snapshot3 !== undefined}`);
  if (!snapshot3) {
    console.error('[FAIL] notification not detected after disabling suppression');
    process.exit(1);
  }
  console.log(`[3] title="${snapshot3.title}" id=${snapshot3.id}`);

  listener.stopListening();

  console.log('--- PASS ---');
  console.log('suppression ON:  callback fires + notification removed');
  console.log('suppression OFF: callback fires + notification persists');
  process.exit(0);
};

void main();
