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
 * @file systemHandlers.test.ts
 * @description 单元测试文件
 * @author 鸡哥
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as si from 'systeminformation';

vi.mock('@eisland/windows-performance-monitor', () => ({ default: {
  getCpu: () => { throw new Error('native unavailable'); },
  getMemory: () => { throw new Error('native unavailable'); },
  getTemperature: () => ({ isAvailable: false, readings: [], maxTemperatureCelsius: null }),
} }));

const { handleMock, onMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
  onMock: vi.fn(),
}));
const { execMock } = vi.hoisted(() => ({ execMock: vi.fn() }));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
    on: onMock,
  },
}));

vi.mock('child_process', () => ({
  exec: execMock,
}));

vi.mock('systeminformation', () => ({
  cpu: vi.fn(async () => ({ manufacturer: 'X', brand: 'Y', cores: 4, physicalCores: 2, speed: 3.2, speedMax: 4.0 })),
  currentLoad: vi.fn(async () => ({ currentLoad: 40, cpus: [{ load: 30 }, { load: 50 }] })),
  cpuTemperature: vi.fn(async () => ({ main: 55, max: 66, cores: [50, 60] })),
  mem: vi.fn(async () => ({ total: 1000, used: 400, available: 600 })),
  graphics: vi.fn(async () => ({ controllers: [{ vendor: 'N', model: 'G', utilizationGpu: 70, vram: 2048, temperatureGpu: 65 }] })),
  fsSize: vi.fn(async () => [{ size: 1000, used: 200, mount: 'C:', fs: 'NTFS' }]),
  diskLayout: vi.fn(async () => [{ temperature: 42 }]),
}));

import { registerSystemIpcHandlers, resetPerformanceCachesForTesting } from '../system';

describe('system ipc handlers', () => {
  const handleHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const onHandlers = new Map<string, (...args: unknown[]) => unknown>();
  const originalPlatformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform');
  type PerformanceSnapshotAssertShape = {
    cpu: { loadPercent: number };
    memory: { totalBytes: number };
    gpu?: { model?: string };
    disk: { totalBytes: number };
  };

  beforeEach(() => {
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });

    resetPerformanceCachesForTesting();
    handleHandlers.clear();
    onHandlers.clear();
    handleMock.mockReset();
    onMock.mockReset();
    execMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handleHandlers.set(channel, handler);
    });
    onMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      onHandlers.set(channel, handler);
    });
  });

  afterAll(() => {
    if (originalPlatformDescriptor) {
      Object.defineProperty(process, 'platform', originalPlatformDescriptor);
      return;
    }
    Reflect.deleteProperty(process, 'platform');
  });

  it('registers handlers and delegates process/window queries', async () => {
    const queryRunningNonSystemProcessNames = vi.fn(async () => ['a.exe']);
    const queryRunningNonSystemProcessesWithIcons = vi.fn(async () => [{ name: 'a.exe', iconDataUrl: null }]);
    const queryOpenWindowsWithIcons = vi.fn(async () => [{ id: '1', title: 't', processName: 'a', processPath: null, processId: 1, iconDataUrl: null }]);
    const queryFocusedWindow = vi.fn(async () => null);

    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames,
      queryRunningNonSystemProcessesWithIcons,
      queryOpenWindowsWithIcons,
      queryFocusedWindow,
    });

    await expect(handleHandlers.get('system:running-processes:get')?.()).resolves.toEqual(['a.exe']);
    await expect(handleHandlers.get('system:running-processes:with-icons:get')?.()).resolves.toEqual([{ name: 'a.exe', iconDataUrl: null }]);
    await expect(handleHandlers.get('system:open-windows:with-icons:get')?.()).resolves.toHaveLength(1);
    await expect(handleHandlers.get('system:focused-window:get')?.()).resolves.toBeNull();
  });

  it('returns performance snapshot payload', async () => {
    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames: vi.fn(async () => []),
      queryRunningNonSystemProcessesWithIcons: vi.fn(async () => []),
      queryOpenWindowsWithIcons: vi.fn(async () => []),
      queryFocusedWindow: vi.fn(async () => null),
    });

    const snapshot = await handleHandlers.get('system:performance-snapshot:get')?.({}, { cpu: 'cpu:0', gpu: 'gpu:0', disk: 'fs:0' }) as PerformanceSnapshotAssertShape;

    expect(snapshot.cpu.loadPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot.memory.totalBytes).toBe(1000);
    expect(snapshot.gpu?.model).toBe('G');
    expect(snapshot.disk.totalBytes).toBe(1000);
  });

  it('opens task manager event on win32', () => {
    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames: vi.fn(async () => []),
      queryRunningNonSystemProcessesWithIcons: vi.fn(async () => []),
      queryOpenWindowsWithIcons: vi.fn(async () => []),
      queryFocusedWindow: vi.fn(async () => null),
    });

    onHandlers.get('system:open-task-manager')?.();
    expect(execMock).toHaveBeenCalledWith('taskmgr');
  });

  it('does not open task manager on non-win32 and catches exec errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames: vi.fn(async () => []),
      queryRunningNonSystemProcessesWithIcons: vi.fn(async () => []),
      queryOpenWindowsWithIcons: vi.fn(async () => []),
      queryFocusedWindow: vi.fn(async () => null),
    });

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });
    onHandlers.get('system:open-task-manager')?.();
    expect(execMock).not.toHaveBeenCalled();

    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true,
    });
    execMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    onHandlers.get('system:open-task-manager')?.();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('returns empty process/window payloads on non-win32', async () => {
    const queryRunningNonSystemProcessNames = vi.fn(async () => ['a.exe']);
    const queryRunningNonSystemProcessesWithIcons = vi.fn(async () => [{ name: 'a.exe', iconDataUrl: null }]);
    const queryOpenWindowsWithIcons = vi.fn(async () => [{ id: '1', title: 't', processName: 'a', processPath: null, processId: 1, iconDataUrl: null }]);
    const queryFocusedWindow = vi.fn(async () => ({
      id: '1', title: 't', processName: 'a', processPath: null, processId: 1, iconDataUrl: null,
    }));

    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames,
      queryRunningNonSystemProcessesWithIcons,
      queryOpenWindowsWithIcons,
      queryFocusedWindow,
    });

    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true,
    });

    await expect(handleHandlers.get('system:running-processes:get')?.()).resolves.toEqual([]);
    await expect(handleHandlers.get('system:running-processes:with-icons:get')?.()).resolves.toEqual([]);
    await expect(handleHandlers.get('system:open-windows:with-icons:get')?.()).resolves.toEqual([]);
    await expect(handleHandlers.get('system:focused-window:get')?.()).resolves.toBeNull();

    expect(queryRunningNonSystemProcessNames).not.toHaveBeenCalled();
    expect(queryRunningNonSystemProcessesWithIcons).not.toHaveBeenCalled();
    expect(queryOpenWindowsWithIcons).not.toHaveBeenCalled();
    expect(queryFocusedWindow).not.toHaveBeenCalled();
  });

  it('falls back safely when performance providers fail', async () => {
    registerSystemIpcHandlers({
      queryRunningNonSystemProcessNames: vi.fn(async () => []),
      queryRunningNonSystemProcessesWithIcons: vi.fn(async () => []),
      queryOpenWindowsWithIcons: vi.fn(async () => []),
      queryFocusedWindow: vi.fn(async () => null),
    });

    vi.mocked(si.currentLoad).mockRejectedValueOnce(new Error('load fail'));
    vi.mocked(si.graphics).mockRejectedValueOnce(new Error('gpu fail'));
    vi.mocked(si.fsSize).mockRejectedValueOnce(new Error('fs fail'));

    const snapshot = await handleHandlers.get('system:performance-snapshot:get')?.({}, {
      cpu: 'cpu:999',
      gpu: 'gpu:999',
      disk: 'fs:999',
    }) as PerformanceSnapshotAssertShape;

    expect(snapshot.cpu.loadPercent).toBe(0);
    expect(snapshot.gpu ?? null).toBeNull();
    expect(snapshot.disk.totalBytes).toBe(0);
  });
});
