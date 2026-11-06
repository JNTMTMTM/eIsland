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
 * @file serviceTypes.ts
 * @description 主进程的文件、Windows 与安装边界，测试仅替换边界而不执行安装。
 * @author 鸡哥
 */
import type { AdapterState, Backup, Inspection, Progress, Release, SourceId } from '../../shared/types/adapterTypes';
export interface ServiceConfig {
  feeds: Partial<Record<SourceId, string>>; publicKey: string; workRoot: string;
  verifier: string; appData: string; localData: string; ownExecutable: string;
}
export interface MigrationPorts {
  inspect: () => Promise<Inspection>;
  release: (source: SourceId, signal: AbortSignal) => Promise<Release>;
  backup: (roots: string[], destination: string, signal: AbortSignal, progress: (value: Progress) => void) => Promise<Backup>;
  download: (release: Release, destination: string, signal: AbortSignal, progress: (value: Progress) => void, localFile?: string) => Promise<void>;
  verify: (release: Release, file: string, signal: AbortSignal) => Promise<void>;
  install: (file: string, directory: string) => Promise<void>;
  publish: (state: AdapterState) => void;
}
