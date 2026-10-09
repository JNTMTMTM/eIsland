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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-volume-analyzer only supports Windows.');
}

const { findExe, callExe, toUnpackedPath } = require('./ffi-loader');
const { spawn } = require('node:child_process');

/** @type {import('child_process').ChildProcess | null} */
let _captureProcess = null;

/** @type {AudioAnalysisResult} */
let _latestResult = null;

/** @type {string} */
let _buffer = '';

/** @type {((result: AudioAnalysisResult) => void) | null} */
let _onUpdate = null;

/** @type {((err: Error) => void) | null} */
let _onError = null;

/** @type {string|null} */
let _lastError = null;

/** @type {NodeJS.Timeout | null} */
let _pollTimer = null;

/**
 * 启动进程音频分析
 * @param {number} processId - 目标进程 ID
 * @param {boolean} [includeProcessTree=true] - 是否包含子进程
 * @returns {{ success: boolean, error: string|null }}
 */
function start(processId, includeProcessTree) {
  if (!Number.isSafeInteger(processId) || processId <= 0 || processId > 0xffffffff) {
    return { success: false, error: 'processId must be a positive 32-bit integer.' };
  }

  if (_captureProcess) {
    stop();
  }

  const exePath = findExe();
  if (!exePath) {
    const error = 'Analyzer EXE not found. Run "npm run build" first.';
    _lastError = error;
    return { success: false, error };
  }

  const args = ['capture', String(processId >>> 0)];
  if (includeProcessTree !== false) {
    args.push('--include-tree');
  }

  try {
    const captureProcess = spawn(toUnpackedPath(exePath), args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    _captureProcess = captureProcess;
    _buffer = '';
    _latestResult = null;
    _lastError = null;

    captureProcess.stdout.on('data', (chunk) => {
      _buffer += chunk.toString();
      const lines = _buffer.split('\n');
      _buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const result = normalizeResult(JSON.parse(trimmed));
          _latestResult = result;
          if (result.error) _lastError = result.error;
        } catch {
          // Ignore non-JSON output
        }
      }
    });

    captureProcess.stderr.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (!message) return;
      _lastError = message;
      if (_onError) _onError(new Error(message));
    });

    captureProcess.on('error', (error) => {
      if (_captureProcess === captureProcess) _captureProcess = null;
      _lastError = error.message;
      if (_onError) _onError(error);
    });

    captureProcess.on('close', () => {
      if (_captureProcess === captureProcess) _captureProcess = null;
      _buffer = '';
    });

    return { success: true, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    _lastError = error;
    return { success: false, error };
  }
}

/**
 * 启动进程音频分析（扩展参数）
 * @param {number} processId - 目标进程 ID
 * @param {boolean} includeProcessTree - 是否包含子进程
 * @returns {{ success: boolean, error: string|null }}
 */
function startEx(processId, includeProcessTree) {
  return start(processId, includeProcessTree);
}

/**
 * 停止音频分析
 * @returns {{ success: boolean, error: string|null }}
 */
function stop() {
  stopPolling();

  if (_captureProcess) {
    const proc = _captureProcess;
    _captureProcess = null;

    try {
      proc.stdin.end('\n');
    } catch { /* ignore */ }

    const killTimer = setTimeout(() => {
      if (!proc.killed) proc.kill();
    }, 1000);
    killTimer.unref();
  }

  _latestResult = null;
  return { success: true, error: null };
}

/**
 * 获取当前分析结果
 * @returns {AudioAnalysisResult}
 */
function getResult() {
  if (_latestResult) return _latestResult;
  return emptyResult;
}

/**
 * 获取分析器状态
 * @returns {{ isRunning: boolean, error: string|null }}
 */
function getStatus() {
  return {
    isRunning: _captureProcess !== null,
    error: _lastError,
  };
}

/**
 * 启动轮询模式：以指定间隔触发回调
 * @param {number} intervalMs - 轮询间隔（毫秒），默认 50
 * @param {(result: AudioAnalysisResult) => void} onUpdate - 结果更新回调
 * @param {(err: Error) => void} [onError] - 错误回调
 */
function startPolling(intervalMs, onUpdate, onError) {
  stopPolling();
  _onUpdate = onUpdate;
  _onError = onError || null;

  _pollTimer = setInterval(() => {
    try {
      const result = getResult();
      if (_onUpdate) _onUpdate(result);
    } catch (err) {
      if (_onError) _onError(err);
    }
  }, Math.max(16, intervalMs || 50));
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  _onUpdate = null;
  _onError = null;
}

/** 空结果常量 */
const emptyResult = Object.freeze({
  error: null,
  frequency: Object.freeze({
    spectrum: [],
    dominantHz: 0,
    topFrequencies: [],
  }),
  amplitude: Object.freeze({
    rms: 0,
    peak: 0,
  }),
  beat: Object.freeze({
    isBeat: false,
    bpm: 0,
    intensity: 0,
  }),
});

/**
 * 标准化分析结果
 * @param {object|null} raw
 * @returns {AudioAnalysisResult}
 */
function normalizeResult(raw) {
  if (!raw || typeof raw !== 'object') return emptyResult;
  return {
    error: raw.error ?? null,
    frequency: {
      spectrum: Array.isArray(raw.frequency?.spectrum) ? raw.frequency.spectrum : [],
      dominantHz: raw.frequency?.dominantHz ?? 0,
      topFrequencies: Array.isArray(raw.frequency?.topFrequencies)
        ? raw.frequency.topFrequencies
        : [],
    },
    amplitude: {
      rms: raw.amplitude?.rms ?? 0,
      peak: raw.amplitude?.peak ?? 0,
    },
    beat: {
      isBeat: raw.beat?.isBeat ?? false,
      bpm: raw.beat?.bpm ?? 0,
      intensity: raw.beat?.intensity ?? 0,
    },
  };
}

/**
 * 获取当前正在播放音频的进程列表
 * @param {boolean} [activeOnly=true] - true=仅返回正在播放的进程
 * @returns {AudioProcessInfo[]}
 */
function getPlayingProcesses(activeOnly) {
  const args = ['processes'];
  if (activeOnly === false) args.push('--all');

  const raw = callExe(args);
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    processId: p.processId ?? 0,
    processName: p.processName ?? null,
    state: p.state ?? 'unknown',
    displayName: p.displayName ?? null,
  }));
}

module.exports = {
  start,
  startEx,
  stop,
  getResult,
  getStatus,
  startPolling,
  stopPolling,
  getPlayingProcesses,
};
