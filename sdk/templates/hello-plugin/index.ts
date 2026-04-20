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
 * @description Hello 插件模板入口
 * @description 演示基础通知与本地计数存储能力
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
  };
}

/**
 * 激活 Hello 插件
 * @param context - 插件运行上下文
 * @returns 无返回值
 */
export async function activate(context: PluginContext): Promise<void> {
  await context.api.ui.notify({
    title: 'Hello Plugin',
    message: `Activated: ${context.manifest.name}`,
    level: 'success',
  });

  const countRaw = await context.api.storage.get('launchCount');
  const count = typeof countRaw === 'number' ? countRaw : 0;
  await context.api.storage.set('launchCount', count + 1);
}

/**
 * 停用 Hello 插件
 * @returns 无返回值
 */
export async function deactivate(): Promise<void> {
  // optional cleanup
}
