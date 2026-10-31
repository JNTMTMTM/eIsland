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

// -- Data Types --

export interface StartupItem {
  /** Registry value name, or file name (without extension) in Startup folder */
  name: string;
  /** Command line (registry) or full file path (Startup folder) */
  command: string | null;
  location: 'registry' | 'startupFolder';
  /** Registry key path or Startup folder path */
  source: string;
  scope: 'user' | 'machine';
  /** false when disabled via Task Manager (StartupApproved) */
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
  /** Full task path, e.g. "\\Microsoft\\Windows\\Defrag\\ScheduledDefrag" */
  path: string;
  folder: string;
  state: 'unknown' | 'disabled' | 'queued' | 'ready' | 'running';
  enabled: boolean;
  author: string | null;
  description: string | null;
  /** Local time "yyyy-MM-ddTHH:mm:ss", null if never run */
  lastRunTime: string | null;
  /** Local time "yyyy-MM-ddTHH:mm:ss", null if not scheduled */
  nextRunTime: string | null;
  /** HRESULT of last run (0 = success, 267011 = not yet run) */
  lastTaskResult: number;
  actions: ScheduledTaskAction[];
}

export interface ServiceInfo {
  name: string | null;
  displayName: string | null;
  description: string | null;
  /** e.g. "Running", "Stopped" */
  state: string | null;
  /** e.g. "Auto", "Manual", "Disabled", "Boot", "System" */
  startMode: string | null;
  delayedAutoStart: boolean | null;
  pathName: string | null;
  startName: string | null;
  processId: number | null;
  serviceType: string | null;
}

// -- Query Functions --

/** Get startup items (registry Run/RunOnce keys and Startup folders) */
export function getStartupItems(): StartupItem[];

/** Get scheduled tasks (all folders, including hidden tasks) */
export function getScheduledTasks(): ScheduledTaskInfo[];

/** Get Windows services */
export function getServices(): ServiceInfo[];
