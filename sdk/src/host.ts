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
 * @file host.ts
 * @description eIsland 插件宿主最小 runtime
 * @description 提供插件挂载、卸载与切换的基础生命周期控制
 * @author 鸡哥
 */

import type { EIslandPluginApi, EIslandPluginContext, EIslandPluginModule, PluginManifest } from './types';

/**
 * 插件挂载参数
 */
export interface PluginMountOptions {
  pluginId: string;
  manifest: PluginManifest;
  module: EIslandPluginModule;
  mountEl: HTMLElement;
  api: EIslandPluginApi;
}

interface ActivePluginSession {
  pluginId: string;
  module: EIslandPluginModule;
  mountEl: HTMLElement;
}

/**
 * eIsland 插件宿主运行时
 */
export class PluginHostRuntime {
  private activeSession: ActivePluginSession | null = null;

  /**
   * 挂载插件到目标容器
   * @description 若已有激活插件，会先执行卸载再挂载新插件
   * @param options - 插件挂载参数
   * @returns 无返回值
   */
  async mount(options: PluginMountOptions): Promise<void> {
    await this.unmount();

    options.mountEl.innerHTML = '';

    const context: EIslandPluginContext = {
      pluginId: options.pluginId,
      manifest: options.manifest,
      mountEl: options.mountEl,
      api: options.api,
    };

    await options.module.activate(context);

    this.activeSession = {
      pluginId: options.pluginId,
      module: options.module,
      mountEl: options.mountEl,
    };
  }

  /**
   * 卸载当前激活插件
   * @description 会调用插件 deactivate 并清空挂载容器
   * @returns 无返回值
   */
  async unmount(): Promise<void> {
    if (!this.activeSession) {
      return;
    }

    try {
      if (this.activeSession.module.deactivate) {
        await this.activeSession.module.deactivate();
      }
    } finally {
      this.activeSession.mountEl.innerHTML = '';
      this.activeSession = null;
    }
  }

  /**
   * 获取当前激活插件 ID
   * @returns 当前激活插件 ID，无激活插件时返回 null
   */
  getActivePluginId(): string | null {
    return this.activeSession ? this.activeSession.pluginId : null;
  }
}
