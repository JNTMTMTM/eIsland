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

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EXE_NAME = 'eIslandStartupReader.exe';
const RID = `win-${process.arch === 'ia32' ? 'x86' : process.arch}`;

// SelfContained 构建会输出到 RID 子目录，同时保留无 RID 目录以兼容旧版 SDK
const helperCandidates = [
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', RID, EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Release', 'net10.0', EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', RID, EXE_NAME),
  path.join(__dirname, 'src', 'bin', 'Debug', 'net10.0', EXE_NAME),
];

/** @type {string | null | undefined} — undefined = not yet resolved */
let cachedHelperPath;

/**
 * Find helper EXE path (cached after first resolution)
 * @returns {string | null}
 */
function findHelper() {
  if (cachedHelperPath !== undefined) {
    return cachedHelperPath;
  }
  cachedHelperPath = helperCandidates.find((c) => fs.existsSync(c)) ?? null;
  return cachedHelperPath;
}

/**
 * Synchronously call helper EXE
 * @param {string[]} args
 * @param {number} timeout
 * @returns {any | null}
 */
function callHelper(args, timeout = 15000) {
  const helperPath = findHelper();
  if (!helperPath) {
    console.error(
      '[eisland-windows-startup-helper] Helper executable not found. Searched candidates:',
      helperCandidates,
    );
    return null;
  }

  const result = childProcess.spawnSync(helperPath, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout,
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    console.error(
      '[eisland-windows-startup-helper] Failed to spawn helper process',
      { helperPath, args, error: result.error },
    );
    return null;
  }

  if (result.status !== 0) {
    console.error(
      '[eisland-windows-startup-helper] Helper exited with non-zero status',
      { helperPath, args, status: result.status, signal: result.signal, stderr: result.stderr },
    );
    return null;
  }

  if (!result.stdout) {
    console.error(
      '[eisland-windows-startup-helper] Helper produced no stdout',
      { helperPath, args, status: result.status, signal: result.signal, stderr: result.stderr },
    );
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout.trim());
    if (!Array.isArray(parsed)) {
      console.error(
        '[eisland-windows-startup-helper] Helper returned non-array JSON payload',
        { helperPath, args, stdout: result.stdout },
      );
      return null;
    }
    return parsed;
  } catch (error) {
    console.error(
      '[eisland-windows-startup-helper] Failed to parse JSON from helper stdout',
      { helperPath, args, error, stdout: result.stdout },
    );
    return null;
  }
}

/**
 * Get startup items (registry Run/RunOnce keys and Startup folders)
 * @returns {Array<import('.').StartupItem>}
 */
function getStartupItems() {
  return callHelper(['startup']) ?? [];
}

/**
 * Get scheduled tasks (all folders, including hidden tasks)
 * @returns {Array<import('.').ScheduledTaskInfo>}
 */
function getScheduledTasks() {
  return callHelper(['tasks']) ?? [];
}

/**
 * Get Windows services
 * @returns {Array<import('.').ServiceInfo>}
 */
function getServices() {
  return callHelper(['services']) ?? [];
}

module.exports = {
  getStartupItems,
  getScheduledTasks,
  getServices,
  /** Reset cached helper path — for testing only */
  __resetHelperCache() {
    cachedHelperPath = undefined;
  },
};
