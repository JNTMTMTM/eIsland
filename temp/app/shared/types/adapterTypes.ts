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
export type Phase = 'welcome' | 'inspecting' | 'ready' | 'backing-up' | 'downloading' | 'verifying' | 'prepared' | 'installing' | 'complete' | 'installed' | 'cancelled' | 'error';
export type SourceId = 'esa' | 'r2' | 'github' | 'cos' | 'oss' | 'local';
export interface SourceOption { id: SourceId; }
export interface Release { version: string; notes: string; url: string; signature: string; size?: number; sha512?: string; }
export interface Installation { directory: string; version: string; runtime: 'electron' | 'tauri' | 'unknown'; }
export interface RunningApp { pid: number; path: string; }
export interface Inspection {
  installations: Installation[]; running: RunningApp[]; dataRoots: string[];
  legacyStore: string; tauriStore: string; selectedStore: string; targetDirectory: string;
}
export interface Backup { directory: string; files: number; bytes: number; }
export interface Progress { done: number; total: number | null; }
export interface AdapterState {
  phase: Phase; sources: SourceOption[]; source: SourceId; signingConfigured: boolean;
  release: Release | null; inspection: Inspection | null; backup: Backup | null;
  progress: Progress; error: string | null;
}
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
