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
 * @file countdownReminders.ts
 * @description 倒数日提醒到期判定与周期去重键。
 * @author 鸡哥
 */

import { diffDays, occurrenceDate, isArchived } from './countdownUtils';
import type { CountdownItem } from '../types/countdownTypes';

/**
 * 获取当天九点之后应提示的事件；错过的往日提醒不补发。
 * @param items - 已保存事件
 * @param sent - 当天已发送的提醒键
 * @param now - 当前本地时间
 * @returns 待发送事件和持久化去重键
 */
export function dueCountdownReminders(items: CountdownItem[], sent: string[], now = new Date()): Array<{ item: CountdownItem; key: string }> {
  if (now.getHours() < 9) return [];
  return items.flatMap((item) => {
    if (isArchived(item, now)) return [];
    const date = occurrenceDate(item, now);
    const days = diffDays(date, now);
    if (![0, 1, 7].includes(days) || !item.reminderDays?.includes(days)) return [];
    const key = `${item.id}:${date}:${days}`;
    return sent.includes(key) ? [] : [{ item, key }];
  });
}
