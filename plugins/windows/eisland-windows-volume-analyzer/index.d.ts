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

/** 频率峰值 */
export interface FrequencyPeak {
  /** 频率 (Hz) */
  hz: number;
  /** 幅度 */
  magnitude: number;
}

/** 频率分析数据 */
export interface FrequencyData {
  /** 频谱幅度数组（降采样到 512 bins） */
  spectrum: number[];
  /** 主频率 (Hz) */
  dominantHz: number;
  /** 幅度最高的频率峰值列表 */
  topFrequencies: FrequencyPeak[];
}

/** 振幅分析数据 */
export interface AmplitudeData {
  /** 均方根振幅 */
  rms: number;
  /** 峰值振幅 */
  peak: number;
}

/** 节拍检测数据 */
export interface BeatData {
  /** 当前帧是否有节拍 */
  isBeat: boolean;
  /** 检测到的 BPM */
  bpm: number;
  /** 节拍强度 (0.0 ~ 1.0) */
  intensity: number;
}

/** 完整音频分析结果 */
export interface AudioAnalysisResult {
  /** 错误信息，null 表示正常 */
  error: string | null;
  /** 频率分析 */
  frequency: FrequencyData;
  /** 振幅分析 */
  amplitude: AmplitudeData;
  /** 节拍检测 */
  beat: BeatData;
}

/** 分析器状态 */
export interface AnalyzerStatus {
  /** 是否正在运行 */
  isRunning: boolean;
  /** 错误信息 */
  error: string | null;
}

/** 命令结果 */
export interface CommandResult {
  success: boolean;
  error: string | null;
}

/** 音频进程信息 */
export interface AudioProcessInfo {
  /** 进程 ID */
  processId: number;
  /** 进程名称（不含 .exe） */
  processName: string | null;
  /** 会话状态：active / inactive / expired */
  state: 'active' | 'inactive' | 'expired' | 'unknown';
  /** 会话显示名称 */
  displayName: string | null;
}

// ── 命令函数 ──────────────────────────────────────────────────

/**
 * 启动进程音频分析
 * @param processId - 目标进程 ID
 * @param includeProcessTree - 是否包含子进程音频（默认 true）
 */
export function start(processId: number, includeProcessTree?: boolean): CommandResult;

/**
 * 启动进程音频分析（扩展参数）
 * @param processId - 目标进程 ID
 * @param includeProcessTree - 是否包含子进程音频
 */
export function startEx(processId: number, includeProcessTree: boolean): CommandResult;

/** 停止音频分析 */
export function stop(): CommandResult;

/**
 * 获取当前分析结果（同步）
 * 返回最新的频谱、振幅、节拍数据
 */
export function getResult(): AudioAnalysisResult;

/** 获取分析器状态 */
export function getStatus(): AnalyzerStatus;

/**
 * 启动轮询模式：以指定间隔获取分析结果并触发回调
 * @param intervalMs - 轮询间隔（毫秒），最小 16
 * @param onUpdate - 结果更新回调
 * @param onError - 错误回调
 */
export function startPolling(
  intervalMs: number,
  onUpdate: (result: AudioAnalysisResult) => void,
  onError?: (err: Error) => void
): void;

/** 停止轮询 */
export function stopPolling(): void;

/**
 * 获取当前正在播放音频的进程列表（同步）
 * 通过 WASAPI 音频会话枚举实现
 * @param activeOnly - true（默认）= 仅返回正在播放的进程，false = 返回所有有音频会话的进程
 */
export function getPlayingProcesses(activeOnly?: boolean): AudioProcessInfo[];
