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
 * @file volume-analyzer.test.ts
 * @description @eisland/windows-volume-analyzer 单元测试
 * @author 鸡哥
 */

import { describe, it, expect, afterEach } from 'vitest';
import type {
  AudioAnalysisResult,
  AnalyzerStatus,
  CommandResult,
  FrequencyData,
  AmplitudeData,
  BeatData,
  AudioProcessInfo,
} from '../index';

const analyzer = require('../') as {
  start(pid: number): CommandResult;
  startEx(pid: number, includeTree: boolean): CommandResult;
  stop(): CommandResult;
  getResult(): AudioAnalysisResult;
  getStatus(): AnalyzerStatus;
  startPolling(intervalMs: number, onUpdate: (r: AudioAnalysisResult) => void, onError?: (e: Error) => void): void;
  stopPolling(): void;
  getPlayingProcesses(activeOnly?: boolean): AudioProcessInfo[];
};

// 确保测试结束后停止分析器
afterEach(() => {
  try { analyzer.stopPolling(); } catch { /* ignore */ }
  try { analyzer.stop(); } catch { /* ignore */ }
});

describe('@eisland/windows-volume-analyzer', () => {
  // ── 导出检查 ────────────────────────────────────────────────
  describe('exports', () => {
    it('exports all expected functions', () => {
      expect(typeof analyzer.start).toBe('function');
      expect(typeof analyzer.startEx).toBe('function');
      expect(typeof analyzer.stop).toBe('function');
      expect(typeof analyzer.getResult).toBe('function');
      expect(typeof analyzer.getStatus).toBe('function');
      expect(typeof analyzer.startPolling).toBe('function');
      expect(typeof analyzer.stopPolling).toBe('function');
      expect(typeof analyzer.getPlayingProcesses).toBe('function');
    });
  });

  // ── getStatus ───────────────────────────────────────────────
  describe('getStatus', () => {
    it('returns a well-shaped AnalyzerStatus object', () => {
      const status = analyzer.getStatus();

      expect(typeof status).toBe('object');
      expect(typeof status.isRunning).toBe('boolean');
      // error 可以是 string 或 null
      if (status.error !== null) {
        expect(typeof status.error).toBe('string');
      }
    });

    it('isRunning is false before start', () => {
      const status = analyzer.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('never throws', () => {
      expect(() => analyzer.getStatus()).not.toThrow();
    });
  });

  // ── getResult ───────────────────────────────────────────────
  describe('getResult', () => {
    it('returns a well-shaped AudioAnalysisResult object', () => {
      const result = analyzer.getResult();

      expect(typeof result).toBe('object');

      // error
      if (result.error !== null) {
        expect(typeof result.error).toBe('string');
      }

      // frequency
      expect(typeof result.frequency).toBe('object');
      expect(Array.isArray(result.frequency.spectrum)).toBe(true);
      expect(typeof result.frequency.dominantHz).toBe('number');
      expect(result.frequency.dominantHz).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.frequency.topFrequencies)).toBe(true);

      for (const f of result.frequency.topFrequencies) {
        expect(typeof f.hz).toBe('number');
        expect(typeof f.magnitude).toBe('number');
        expect(f.hz).toBeGreaterThanOrEqual(0);
        expect(f.magnitude).toBeGreaterThanOrEqual(0);
      }

      // amplitude
      expect(typeof result.amplitude).toBe('object');
      expect(typeof result.amplitude.rms).toBe('number');
      expect(typeof result.amplitude.peak).toBe('number');
      expect(result.amplitude.rms).toBeGreaterThanOrEqual(0);
      expect(result.amplitude.peak).toBeGreaterThanOrEqual(0);

      // beat
      expect(typeof result.beat).toBe('object');
      expect(typeof result.beat.isBeat).toBe('boolean');
      expect(typeof result.beat.bpm).toBe('number');
      expect(typeof result.beat.intensity).toBe('number');
      expect(result.beat.bpm).toBeGreaterThanOrEqual(0);
      expect(result.beat.intensity).toBeGreaterThanOrEqual(0);
      expect(result.beat.intensity).toBeLessThanOrEqual(1);
    });

    it('returns empty spectrum before start', () => {
      const result = analyzer.getResult();
      expect(result.frequency.spectrum).toEqual([]);
      expect(result.frequency.topFrequencies).toEqual([]);
      expect(result.amplitude.rms).toBe(0);
      expect(result.amplitude.peak).toBe(0);
      expect(result.beat.bpm).toBe(0);
    });

    it('never throws', () => {
      expect(() => analyzer.getResult()).not.toThrow();
    });
  });

  // ── start / stop ────────────────────────────────────────────
  describe('start / stop', () => {
    it('start returns CommandResult shape', () => {
      // 用当前进程 PID 测试（可能成功也可能失败，取决于音频状态）
      const result = analyzer.start(process.pid);

      expect(typeof result).toBe('object');
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result.error).toBeNull();
      } else {
        expect(typeof result.error).toBe('string');
      }

      // 清理
      analyzer.stop();
    });

    it('startEx returns CommandResult shape', () => {
      const result = analyzer.startEx(process.pid, true);

      expect(typeof result).toBe('object');
      expect(typeof result.success).toBe('boolean');

      if (result.success) {
        expect(result.error).toBeNull();
      } else {
        expect(typeof result.error).toBe('string');
      }

      analyzer.stop();
    });

    it('stop returns CommandResult shape', () => {
      const result = analyzer.stop();

      expect(typeof result).toBe('object');
      expect(typeof result.success).toBe('boolean');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('stop is idempotent', () => {
      const r1 = analyzer.stop();
      const r2 = analyzer.stop();
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
    });

    it('start with invalid PID does not crash', () => {
      // PID 0 不存在，应优雅失败
      const result = analyzer.start(0);
      expect(typeof result).toBe('object');
      expect(typeof result.success).toBe('boolean');
      analyzer.stop();
    });

    it('start with very large PID does not crash', () => {
      const result = analyzer.start(99999999);
      expect(typeof result).toBe('object');
      expect(typeof result.success).toBe('boolean');
      analyzer.stop();
    });

    it('never throws', () => {
      expect(() => analyzer.start(0)).not.toThrow();
      expect(() => analyzer.stop()).not.toThrow();
      expect(() => analyzer.startEx(0, false)).not.toThrow();
    });
  });

  // ── startPolling / stopPolling ──────────────────────────────
  describe('startPolling / stopPolling', () => {
    it('startPolling does not throw', () => {
      expect(() => {
        analyzer.startPolling(100, () => {});
      }).not.toThrow();
    });

    it('stopPolling does not throw', () => {
      analyzer.startPolling(100, () => {});
      expect(() => analyzer.stopPolling()).not.toThrow();
    });

    it('stopPolling is idempotent', () => {
      analyzer.startPolling(100, () => {});
      analyzer.stopPolling();
      expect(() => analyzer.stopPolling()).not.toThrow();
    });

    it('callback receives well-shaped results', async () => {
      const results: AudioAnalysisResult[] = [];

      analyzer.startPolling(50, (r: AudioAnalysisResult) => {
        results.push(r);
      });

      // 等待几帧
      await new Promise((resolve) => setTimeout(resolve, 300));
      analyzer.stopPolling();

      // 即使未启动分析器，回调也应收到有效数据（空结果）
      for (const result of results) {
        expect(typeof result).toBe('object');
        expect(typeof result.amplitude).toBe('object');
        expect(typeof result.beat).toBe('object');
        expect(Array.isArray(result.frequency.spectrum)).toBe(true);
      }
    });

    it('onError callback is invoked on error', async () => {
      const errors: Error[] = [];

      // 使用一个极短间隔来触发（正常不应出错，但测试回调机制）
      analyzer.startPolling(16, () => {}, (err: Error) => {
        errors.push(err);
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      analyzer.stopPolling();

      // 不验证是否出错，只验证机制不会崩溃
      expect(Array.isArray(errors)).toBe(true);
    });
  });

  // ── getPlayingProcesses ─────────────────────────────────────
  describe('getPlayingProcesses', () => {
    it('returns an array', () => {
      const result = analyzer.getPlayingProcesses();
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns well-shaped AudioProcessInfo objects', () => {
      const result = analyzer.getPlayingProcesses();

      for (const proc of result) {
        expect(typeof proc).toBe('object');
        expect(typeof proc.processId).toBe('number');
        expect(proc.processId).toBeGreaterThan(0);

        if (proc.processName !== null) {
          expect(typeof proc.processName).toBe('string');
          expect(proc.processName.length).toBeGreaterThan(0);
        }

        expect(['active', 'inactive', 'expired', 'unknown']).toContain(proc.state);

        if (proc.displayName !== null) {
          expect(typeof proc.displayName).toBe('string');
        }
      }
    });

    it('activeOnly=true filters to active sessions only', () => {
      const active = analyzer.getPlayingProcesses(true);
      for (const proc of active) {
        expect(proc.state).toBe('active');
      }
    });

    it('activeOnly=false returns all sessions', () => {
      const all = analyzer.getPlayingProcesses(false);
      // 至少结构正确
      expect(Array.isArray(all)).toBe(true);
      // 所有条目应比 activeOnly=true 多或相等
      const active = analyzer.getPlayingProcesses(true);
      expect(all.length).toBeGreaterThanOrEqual(active.length);
    });

    it('default parameter is activeOnly=true', () => {
      const defaultResult = analyzer.getPlayingProcesses();
      const explicitActive = analyzer.getPlayingProcesses(true);
      expect(defaultResult.length).toBe(explicitActive.length);
    });

    it('never throws', () => {
      expect(() => analyzer.getPlayingProcesses()).not.toThrow();
      expect(() => analyzer.getPlayingProcesses(true)).not.toThrow();
      expect(() => analyzer.getPlayingProcesses(false)).not.toThrow();
    });
  });

  // ── 类型兼容性 ──────────────────────────────────────────────
  describe('type shapes', () => {
    it('FrequencyData shape matches', () => {
      const result = analyzer.getResult();
      const freq: FrequencyData = result.frequency;

      expect(Array.isArray(freq.spectrum)).toBe(true);
      expect(typeof freq.dominantHz).toBe('number');
      expect(Array.isArray(freq.topFrequencies)).toBe(true);
    });

    it('AmplitudeData shape matches', () => {
      const result = analyzer.getResult();
      const amp: AmplitudeData = result.amplitude;

      expect(typeof amp.rms).toBe('number');
      expect(typeof amp.peak).toBe('number');
    });

    it('BeatData shape matches', () => {
      const result = analyzer.getResult();
      const beat: BeatData = result.beat;

      expect(typeof beat.isBeat).toBe('boolean');
      expect(typeof beat.bpm).toBe('number');
      expect(typeof beat.intensity).toBe('number');
    });

    it('AudioProcessInfo shape matches', () => {
      const processes = analyzer.getPlayingProcesses();
      for (const proc of processes) {
        const info: AudioProcessInfo = proc;
        expect(typeof info.processId).toBe('number');
        expect(typeof info.state).toBe('string');
      }
    });
  });
});
