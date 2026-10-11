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
 * @file scheduleDeadline.ts
 * @description 使用主进程到期事件，避免后台节流导致提醒丢失。
 * @author 鸡哥
 */

let sequence = 0;

/**
 * 调度一次到期回调；取消会撤销主进程任务及监听器。
 * @param deadline - 毫秒时间戳。
 * @param callback - 到期时执行的回调。
 * @returns 取消方法。
 */
export default function scheduleDeadline(deadline: number, callback: () => void): () => void {
  const id = 'reminder-' + (++sequence);
  let active = true;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  const fire = (): void => {
    if (!active) return;
    active = false;
    clearTimeout(fallback);
    unsubscribe?.();
    callback();
  };
  const useFallback = (): void => {
    if (active) fallback = setTimeout(fire, Math.max(0, deadline - Date.now()));
  };
  if (window.api?.scheduleWakeup && window.api?.onSettingsChanged) {
    unsubscribe = window.api.onSettingsChanged((channel, value) => {
      if (channel === 'runtime:wakeup' && value === id) fire();
    });
    window.api.scheduleWakeup(id, deadline).then((ok) => { if (!ok) useFallback(); }).catch(useFallback);
  } else useFallback();
  return () => {
    active = false;
    clearTimeout(fallback);
    unsubscribe?.();
    void window.api?.scheduleWakeup?.(id, null).catch(() => {});
  };
}
