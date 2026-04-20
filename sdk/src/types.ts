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
 * @file types.ts
 * @description eIsland 插件 SDK 类型定义
 * @description 定义插件清单、权限模型与运行时 API 接口
 * @author 鸡哥
 */

/**
 * 插件权限标识枚举
 */
export type PluginPermission =
  | 'storage'
  | 'http'
  | 'notify'
  | 'settings.read'
  | 'settings.subscribe'
  | 'wallpaper.apply'
  | 'media.control'
  | 'clipboard.read'
  | 'clipboard.write'
  | 'window.control';

/**
 * 插件网络访问策略
 */
export interface PluginNetworkPolicy {
  allowDomains: string[];
}

/**
 * 插件宿主版本要求
 */
export interface PluginEngineRequirement {
  eisland: string;
}

/**
 * 插件清单结构
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entry: string;
  description?: string;
  author?: string;
  homepage?: string;
  icon?: string;
  permissions: PluginPermission[];
  network?: PluginNetworkPolicy;
  engines: PluginEngineRequirement;
  minimumHostApiVersion?: number;
}

/**
 * 单条清单校验错误
 */
export interface PluginValidationError {
  field: string;
  message: string;
}

/**
 * 清单校验返回结果
 */
export interface PluginValidationResult {
  ok: boolean;
  errors: PluginValidationError[];
}

/**
 * 插件 HTTP 请求参数
 */
export interface PluginHttpRequest {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

/**
 * 插件 HTTP 响应结构
 */
export interface PluginHttpResponse {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * 插件本地存储 API
 */
export interface PluginStorageApi {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  keys(): Promise<string[]>;
}

/**
 * 插件网络请求 API
 */
export interface PluginHttpApi {
  fetch(url: string, request?: PluginHttpRequest): Promise<PluginHttpResponse>;
}

/**
 * 插件 UI 反馈 API
 */
export interface PluginUiApi {
  notify(payload: { title: string; message: string; level?: 'info' | 'success' | 'warning' | 'error' }): Promise<void>;
}

/**
 * 插件事件订阅 API
 */
export interface PluginEventsApi {
  onSettingsChanged(
    callback: (channel: string, value: unknown) => void
  ): () => void;
}

/**
 * 插件可调用宿主 API 聚合
 */
export interface EIslandPluginApi {
  storage: PluginStorageApi;
  http: PluginHttpApi;
  ui: PluginUiApi;
  events: PluginEventsApi;
}

/**
 * 插件激活上下文
 */
export interface EIslandPluginContext {
  pluginId: string;
  manifest: PluginManifest;
  api: EIslandPluginApi;
}

/**
 * 插件模块生命周期接口
 */
export interface EIslandPluginModule {
  activate(context: EIslandPluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
