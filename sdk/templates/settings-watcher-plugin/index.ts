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
 * @file index.ts
 * @description Settings Watcher 插件模板入口
 * @description 演示设置订阅、事件通知与计数持久化
 * @author 鸡哥
 */

interface PluginNotifyPayload {
  title: string;
  message: string;
  level?: 'info' | 'success' | 'warning' | 'error';
}

interface PluginContext {
  pluginId: string;
  manifest: { name: string };
  api: {
    ui: {
      notify(payload: PluginNotifyPayload): Promise<void>;
    };
    storage: {
      get(key: string): Promise<unknown>;
      set(key: string, value: unknown): Promise<boolean>;
    };
    events: {
      onSettingsChanged(callback: (channel: string, value: unknown) => void | Promise<void>): () => void;
    };
  };
}

let disposeSettingsListener: (() => void) | null = null;

/**
 * 激活 Settings Watcher 插件
 * @param context - 插件运行上下文
 * @returns 无返回值
 */
export async function activate(context: PluginContext): Promise<void> {
  const startCountRaw = await context.api.storage.get('activateCount');
  const startCount = typeof startCountRaw === 'number' ? startCountRaw : 0;
  await context.api.storage.set('activateCount', startCount + 1);

  await context.api.ui.notify({
    title: 'Settings Watcher',
    message: `Activated: ${context.manifest.name}`,
    level: 'success',
  });

  disposeSettingsListener = context.api.events.onSettingsChanged(async (channel, value) => {
    const changesRaw = await context.api.storage.get('settingsChangeCount');
    const changes = typeof changesRaw === 'number' ? changesRaw : 0;
    await context.api.storage.set('settingsChangeCount', changes + 1);

    if (channel === 'store:theme-mode') {
      await context.api.ui.notify({
        title: 'Theme Changed',
        message: `New value: ${String(value)}`,
        level: 'info',
      });
    }
  });
}

/**
 * 停用 Settings Watcher 插件并清理订阅
 * @returns 无返回值
 */
export async function deactivate(): Promise<void> {
  if (typeof disposeSettingsListener === 'function') {
    disposeSettingsListener();
    disposeSettingsListener = null;
  }
}
