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
 * @file index.d.ts
 * @description 启动项、计划任务、服务查询 helper 的公开类型声明
 * @author 鸡哥
 */

// -- 数据类型 --

export interface StartupItem {
  /** 注册表值名称，或启动文件夹中的文件名（不含扩展名） */
  name: string;
  /** 命令行（注册表）或完整文件路径（启动文件夹） */
  command: string | null;
  location: 'registry' | 'startupFolder';
  /** 注册表键路径或启动文件夹路径 */
  source: string;
  scope: 'user' | 'machine';
  /** 在任务管理器中被禁用（StartupApproved）时为 false */
  enabled: boolean;
}

export interface ScheduledTaskAction {
  type: 'exec' | 'comHandler' | 'email' | 'showMessage' | 'unknown';
  path: string | null;
  arguments: string | null;
  workingDirectory: string | null;
}

export interface ScheduledTaskInfo {
  name: string;
  /** 完整任务路径，如 "\Microsoft\Windows\Defrag\ScheduledDefrag" */
  path: string;
  folder: string;
  state: 'unknown' | 'disabled' | 'queued' | 'ready' | 'running';
  enabled: boolean;
  author: string | null;
  description: string | null;
  /** 本地时间 "yyyy-MM-ddTHH:mm:ss"（与区域设置无关），从未运行时为 null */
  lastRunTime: string | null;
  /** 本地时间 "yyyy-MM-ddTHH:mm:ss"（与区域设置无关），无计划时为 null */
  nextRunTime: string | null;
  /** 上次运行的 HRESULT（0 = 成功，267011 = 尚未运行） */
  lastTaskResult: number;
  actions: ScheduledTaskAction[];
}

export interface ServiceInfo {
  name: string | null;
  displayName: string | null;
  description: string | null;
  /** 如 "Running"、"Stopped" */
  state: string | null;
  /** 如 "Auto"、"Manual"、"Disabled"、"Boot"、"System" */
  startMode: string | null;
  delayedAutoStart: boolean | null;
  pathName: string | null;
  startName: string | null;
  processId: number | null;
  serviceType: string | null;
}

/** 单个位置的读取失败（如无权限），出现时说明 items 不完整 */
export interface QueryError {
  /** 失败位置：注册表键、启动文件夹、任务目录 / 任务路径，或 "service:<服务名>" */
  source: string;
  /** 系统返回的错误信息 */
  message: string;
}

/** 查询结果：errors 为空表示结果完整 */
export interface QueryResult<T> {
  items: T[];
  errors: QueryError[];
}

/** helper 缺失、启动失败、非零退出、超时或输出非法 JSON 时，查询以此错误 reject */
export class StartupHelperError extends Error {
  name: 'StartupHelperError';
}

// -- 查询函数 --

/**
 * 异步获取启动项（注册表 Run / RunOnce 键与启动文件夹）
 * @returns 启动项及无法读取的位置；helper 不可用或调用失败时以 StartupHelperError reject
 */
export function getStartupItems(): Promise<QueryResult<StartupItem>>;

/**
 * 异步获取计划任务（遍历全部目录，包含隐藏任务）
 * @returns 计划任务及无法读取的目录 / 任务；helper 不可用或调用失败时以 StartupHelperError reject
 */
export function getScheduledTasks(): Promise<QueryResult<ScheduledTaskInfo>>;

/**
 * 异步获取 Windows 服务
 * @returns 服务列表及配置读取失败的服务；helper 不可用或调用失败时以 StartupHelperError reject
 */
export function getServices(): Promise<QueryResult<ServiceInfo>>;

/**
 * 清除缓存的 helper 路径，仅供测试使用
 * @returns 无返回值
 */
export function __resetHelperCache(): void;
