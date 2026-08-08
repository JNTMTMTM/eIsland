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

if (process.platform !== 'win32') {
  throw new Error('@eisland/windows-volume-analyzer only supports Windows.');
}

const { analyzer, callJson, getLastError } = require('./ffi-loader');

/** @type {NodeJS.Timer | null} */
let _pollTimer = null;

/** @type {((result: AudioAnalysisResult) => void) | null} */
let _onUpdate = null;

/** @type {((err: Error) => void) | null} */
let _onError = null;

/**
 * 启动进程音频分析
 * @param {number} processId - 目标进程 ID
 * @returns {{ success: boolean, error: string|null }}
 */
function start(processId) {
  const r = analyzer.audio_analyzer_start(processId >>> 0);
  return r === 0
    ? { success: true, error: null }
    : { success: false, error: getLastError() || 'Start failed.' };
}

/**
 * 启动进程音频分析（扩展参数）
 * @param {number} processId - 目标进程 ID
 * @param {boolean} includeProcessTree - 是否包含子进程
 * @returns {{ success: boolean, error: string|null }}
 */
function startEx(processId, includeProcessTree) {
  const r = analyzer.audio_analyzer_start_ex(processId >>> 0, includeProcessTree ? 1 : 0);
  return r === 0
    ? { success: true, error: null }
    : { success: false, error: getLastError() || 'Start failed.' };
}

/**
 * 停止音频分析
 * @returns {{ success: boolean, error: string|null }}
 */
function stop() {
  const r = analyzer.audio_analyzer_stop();
  if (_pollTimer) {
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
  return r === 0
    ? { success: true, error: null }
    : { success: false, error: getLastError() || 'Stop failed.' };
}

/**
 * 获取当前分析结果（同步）
 * @returns {AudioAnalysisResult}
 */
function getResult() {
  const raw = callJson('audio_analyzer_get_result');
  return normalizeResult(raw);
}

/**
 * 获取分析器状态
 * @returns {{ isRunning: boolean, error: string|null }}
 */
function getStatus() {
  const raw = callJson('audio_analyzer_get_status');
  if (!raw) return { isRunning: false, error: null };
  return {
    isRunning: raw.isRunning ?? false,
    error: raw.error ?? null,
  };
}

/**
 * 启动轮询模式：以指定间隔调用 DLL 获取结果并触发回调
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

module.exports = {
  start,
  startEx,
  stop,
  getResult,
  getStatus,
  startPolling,
  stopPolling,
};
