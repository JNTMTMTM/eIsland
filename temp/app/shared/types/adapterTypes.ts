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
 * @file adapterTypes.ts
 * @description 三层共享的只读状态、版本信息、备份结果与白名单 IPC 契约。
 * @author 鸡哥
 */
/** 迁移状态机阶段；complete 表示本次安装已确认，installed 表示检测到已有兼容版本。 */
export type Phase = 'welcome' | 'inspecting' | 'ready' | 'backing-up' | 'downloading' | 'verifying' | 'prepared' | 'installing' | 'complete' | 'installed' | 'cancelled' | 'error';
/** 更新源标识；local 为离线清单，cos/oss 仅在构建时配置后出现。 */
export type SourceId = 'esa' | 'r2' | 'github' | 'cos' | 'oss' | 'local';
/** 可供选择的更新源。 */
export interface SourceOption { id: SourceId; }
/** 已校验的 Tauri 发布信息；size 与 sha512 为清单可选字段，存在时下载必须匹配。 */
export interface Release { version: string; notes: string; url: string; signature: string; size?: number; sha512?: string; }
/** 注册表登记且目录存在的安装项，runtime 由目录内容判定。 */
export interface Installation { directory: string; version: string; runtime: 'electron' | 'tauri' | 'unknown'; }
/** 正在运行的 eisland.exe 进程（已排除适配器自身）。 */
export interface RunningApp { pid: number; path: string; }
/** 系统检测结果：安装项、运行实例、待备份的数据根目录、新旧数据存储位置与计划安装目录。 */
export interface Inspection {
  installations: Installation[]; running: RunningApp[]; dataRoots: string[];
  legacyStore: string; tauriStore: string; selectedStore: string; targetDirectory: string;
}
/** 已完成校验的备份目录摘要。 */
export interface Backup { directory: string; files: number; bytes: number; }
/** 字节进度；total 为 null 表示总量未知。 */
export interface Progress { done: number; total: number | null; }
/** 主进程发布给 renderer 的完整状态快照。 */
export interface AdapterState {
  phase: Phase; sources: SourceOption[]; source: SourceId; signingConfigured: boolean;
  release: Release | null; inspection: Inspection | null; backup: Backup | null;
  progress: Progress; error: string | null;
}
/** preload 暴露给 renderer 的白名单动作。 */
export interface AdapterApi {
  getState: () => Promise<AdapterState>;
  inspect: (source: SourceId) => Promise<void>;
  chooseLocal: () => Promise<void>;
  prepare: () => Promise<void>;
  install: () => Promise<void>;
  cancel: () => Promise<void>;
  dismissError: () => Promise<void>;
  openBackup: () => Promise<void>;
  launch: () => Promise<void>;
  close: () => Promise<void>;
  onState: (callback: (state: AdapterState) => void) => () => void;
}
