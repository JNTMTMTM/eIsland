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
 * @file settingsSubscription.ts
 * @description 设置订阅共享一个 IPC 监听器，并独立管理各回调的生命周期。
 * @author 鸡哥
 */

import { ipcRenderer } from 'electron';

const subscribers = new Set<(channel: string, value: unknown) => void>();
const handler = (event: Electron.IpcRendererEvent, channel: string, value: unknown): void => {
  void event;
  Array.from(subscribers).forEach((subscriber) => {
    if (!subscribers.has(subscriber)) return;
    try {
      subscriber(channel, value);
    } catch (error) {
      console.error('[Preload] settings subscriber failed:', error);
    }
  });
};

/**
 * 订阅设置变化；最后一个订阅取消时释放共享 IPC 监听器。
 * @param callback - 接收设置通道和业务值的回调。
 * @returns 可重复调用的独立取消订阅函数。
 */
export default function subscribeSettings(callback: (channel: string, value: unknown) => void): () => void {
  const subscriber = (channel: string, value: unknown): void => { callback(channel, value); };
  if (subscribers.size === 0) ipcRenderer.on('settings:changed', handler);
  subscribers.add(subscriber);
  return () => {
    if (!subscribers.delete(subscriber)) return;
    if (subscribers.size === 0) ipcRenderer.removeListener('settings:changed', handler);
  };
}
