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
 * @file systemPerformanceSupplement.test.ts
 * @description 系统原生亮度音量控制、性能缓存并发、硬件缺失与选择边界测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSystemIpcHandlers, resetPerformanceCachesForTesting } from '../system';
type HandlerFixture = (...requestArguments: unknown[]) => unknown;
interface DeferredFixture { promise: Promise<Record<string, unknown>>; resolve: (value: Record<string, unknown>) => void; }
const io = vi.hoisted(() => ({
  handlers: new Map<string, HandlerFixture>(),
  cpu: vi.fn<() => Promise<Record<string, unknown>>>(), load: vi.fn<() => Promise<Record<string, unknown>>>(),
  temperature: vi.fn<() => Promise<Record<string, unknown>>>(), memory: vi.fn<() => Promise<Record<string, unknown>>>(),
  graphics: vi.fn<() => Promise<Record<string, unknown>>>(),
  filesystems: vi.fn<() => Promise<Record<string, unknown>[]>>(), disks: vi.fn<() => Promise<Record<string, unknown>[]>>(),
  cpus: vi.fn<() => { model: string }[]>(), totalmem: vi.fn<() => number>(), freemem: vi.fn<() => number>(),
  brightness: vi.fn<() => { currentBrightness: number } | null>(), setBrightness: vi.fn<(value: number) => boolean>(),
  volume: vi.fn<() => number | null>(), setVolume: vi.fn<(value: number) => boolean>(),
}));
vi.mock('electron', () => ({ ipcMain: { on: vi.fn(), handle: (channel: string, handler: HandlerFixture) => io.handlers.set(channel, handler) } }));
vi.mock('child_process', () => ({ exec: vi.fn() }));
vi.mock('systeminformation', () => ({ cpu: io.cpu, currentLoad: io.load, cpuTemperature: io.temperature, mem: io.memory, graphics: io.graphics, fsSize: io.filesystems, diskLayout: io.disks }));
vi.mock('os', () => ({ default: { cpus: io.cpus, totalmem: io.totalmem, freemem: io.freemem, hostname: () => 'fixture-host', platform: () => 'fixture-platform', release: () => 'fixture-release', arch: () => 'fixture-arch', uptime: () => 120 } }));
vi.mock('@eisland/windows-brightness-helper', () => ({ getBrightness: io.brightness, setBrightness: io.setBrightness }));
vi.mock('@eisland/windows-volume-helper', () => ({ getVolume: io.volume, setVolume: io.setVolume }));
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
/**
 * 调用真实系统 IPC 并保留未知参数输入边界。
 * @param channel - 系统通道
 * @param requestArguments - IPC 参数
 * @returns 真实处理器返回值
 */
function invoke(channel: string, ...requestArguments: unknown[]): unknown { return io.handlers.get(`system:${channel}`)?.({}, ...requestArguments); }
/**
 * 构造硬件叶接口的可控并发响应。
 * @returns 延迟 Promise 和完成函数
 */
function deferred(): DeferredFixture {
  let complete: DeferredFixture['resolve'] = () => { throw new Error('uninitialized deferred'); };
  const promise = new Promise<Record<string, unknown>>((resolve) => { complete = resolve; });
  return { promise, resolve: complete };
}
beforeEach(() => {
  vi.resetAllMocks(); io.handlers.clear();
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  io.cpu.mockResolvedValue({ manufacturer: 'Vendor', brand: 'Chip', cores: 2, physicalCores: 1, speed: 3, speedMax: 4 });
  io.load.mockResolvedValue({ currentLoad: 45, cpus: [{ load: 20 }, { load: 90 }] });
  io.temperature.mockResolvedValue({ main: 60, max: 80, cores: [40, 50] });
  io.memory.mockResolvedValue({ total: 1000, available: 700, used: 300 });
  io.graphics.mockResolvedValue({ controllers: [{ vendor: 'V', model: 'G', vram: 100, utilizationGpu: 30, temperatureGpu: 65 }] });
  io.filesystems.mockResolvedValue([{ size: 1000, used: 250, mount: 'C:', fs: 'NTFS' }]); io.disks.mockResolvedValue([{ temperature: 40 }]);
  io.cpus.mockReturnValue([{ model: 'OS first' }, { model: 'OS second' }]); io.totalmem.mockReturnValue(2000); io.freemem.mockReturnValue(1500);
  io.brightness.mockReturnValue({ currentBrightness: 25 }); io.volume.mockReturnValue(75);
  io.setBrightness.mockReturnValue(true); io.setVolume.mockReturnValue(true);
  resetPerformanceCachesForTesting();
  registerSystemIpcHandlers({ queryRunningNonSystemProcessNames: () => Promise.resolve([]), queryRunningNonSystemProcessesWithIcons: () => Promise.resolve([]), queryOpenWindowsWithIcons: () => Promise.resolve([]), queryFocusedWindow: () => Promise.resolve(null) });
});
afterEach(() => { if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform); vi.restoreAllMocks(); });
describe('系统原生控制边界', () => {
  it('Windows 读取亮度音量并将有限数值传给原生边界', () => {
    expect(invoke('brightness:get')).toBe(25); expect(invoke('volume:get')).toBe(75);
    expect(invoke('brightness:set', 0)).toBe(true); expect(invoke('volume:set', 100)).toBe(true);
    expect(io.setBrightness).toHaveBeenCalledExactlyOnceWith(0); expect(io.setVolume).toHaveBeenCalledExactlyOnceWith(100);
  });
  it.each(['linux', 'darwin'])('%s 不调用 Windows 原生控制', (platform) => {
    Object.defineProperty(process, 'platform', { configurable: true, value: platform });
    expect(invoke('brightness:get')).toBeNull(); expect(invoke('volume:get')).toBeNull();
    expect(invoke('brightness:set', 50)).toBe(false); expect(invoke('volume:set', 50)).toBe(false);
    expect(io.brightness).not.toHaveBeenCalled(); expect(io.volume).not.toHaveBeenCalled();
    expect(io.setBrightness).not.toHaveBeenCalled(); expect(io.setVolume).not.toHaveBeenCalled();
  });
  it.each([null, undefined, '50', NaN, Infinity])('非法控制值 %s 无原生副作用', (value) => {
    expect(invoke('brightness:set', value)).toBe(false); expect(invoke('volume:set', value)).toBe(false);
    expect(io.setBrightness).not.toHaveBeenCalled(); expect(io.setVolume).not.toHaveBeenCalled();
  });
  it('原生无亮度结果时返回 null', () => { io.brightness.mockReturnValue(null); expect(invoke('brightness:get')).toBeNull(); });
  it('原生读取和设置异常转为 null 或 false', () => {
    const failure = new Error('native unavailable');
    io.brightness.mockImplementation(() => { throw failure; }); io.volume.mockImplementation(() => { throw failure; });
    io.setBrightness.mockImplementation(() => { throw failure; }); io.setVolume.mockImplementation(() => { throw failure; });
    expect(invoke('brightness:get')).toBeNull(); expect(invoke('volume:get')).toBeNull();
    expect(invoke('brightness:set', 50)).toBe(false); expect(invoke('volume:set', 50)).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(4);
  });
});
describe('性能缓存、硬件选择和缺失值', () => {
  it('并发快照复用进行中的查询，随后命中缓存', async () => {
    const pending = deferred(); io.cpu.mockReturnValue(pending.promise);
    const first = invoke('performance-snapshot:get'); const second = invoke('performance-snapshot:get');
    expect(io.cpu).toHaveBeenCalledOnce(); pending.resolve({ manufacturer: 'Concurrent', brand: 'Chip', cores: 2 });
    await expect(first).resolves.toMatchObject({ cpu: { manufacturer: 'Concurrent' } });
    await expect(second).resolves.toMatchObject({ cpu: { manufacturer: 'Concurrent' } });
    await invoke('performance-snapshot:get');
    expect(io.cpu).toHaveBeenCalledOnce(); expect(io.graphics).toHaveBeenCalledOnce();
    expect(io.temperature).toHaveBeenCalledOnce(); expect(io.filesystems).toHaveBeenCalledOnce(); expect(io.disks).toHaveBeenCalledOnce();
    expect(io.load).toHaveBeenCalledTimes(3);
  });
  it('硬件失败回退 OS 并立即重试 null 缓存', async () => {
    io.cpu.mockRejectedValueOnce(new Error('cpu unavailable')); io.load.mockRejectedValueOnce(new Error('load unavailable'));
    io.temperature.mockRejectedValueOnce(new Error('temperature unavailable')); io.memory.mockRejectedValueOnce(new Error('memory unavailable'));
    io.graphics.mockRejectedValueOnce(new Error('graphics unavailable')); io.filesystems.mockRejectedValueOnce(new Error('filesystems unavailable'));
    io.disks.mockRejectedValueOnce(new Error('disk unavailable'));
    await expect(invoke('performance-snapshot:get')).resolves.toMatchObject({
      cpu: { manufacturer: '', brand: 'OS first', cores: 2, physicalCores: 2, loadPercent: 0, temperatureCelsius: null },
      memory: { totalBytes: 2000, availableBytes: 1500, usedBytes: 500, usagePercent: 25 }, gpu: null,
      disk: { totalBytes: 0, usedBytes: 0, usagePercent: 0, temperatureCelsius: null },
    });
    await invoke('performance-snapshot:get');
    expect(io.cpu).toHaveBeenCalledTimes(2); expect(io.temperature).toHaveBeenCalledTimes(2); expect(io.graphics).toHaveBeenCalledTimes(2);
    expect(io.filesystems).toHaveBeenCalledOnce(); expect(io.disks).toHaveBeenCalledOnce();
  });
  it('零值、空品牌和无 OS 核心产生稳定的空快照', async () => {
    io.cpu.mockResolvedValue({ manufacturer: '', brand: '', cores: 0, physicalCores: 0, speed: NaN, speedMax: 0 }); io.cpus.mockReturnValue([]);
    io.load.mockResolvedValue({ currentLoad: Infinity, cpus: [] }); io.temperature.mockResolvedValue({ main: 0, max: 0, cores: [] });
    io.memory.mockResolvedValue({ total: 0, available: 0, used: 0 }); io.graphics.mockResolvedValue({ controllers: [{ vendor: '', model: '' }] });
    io.filesystems.mockResolvedValue([{ size: 0 }, { size: -1 }]); io.disks.mockResolvedValue([{ temperature: 0 }, { temperature: NaN }]);
    await expect(invoke('performance-snapshot:get')).resolves.toMatchObject({
      cpu: { brand: '', cores: 0, physicalCores: 0, speedGhz: null, speedMaxGhz: null, loadPercent: 0, temperatureCelsius: null },
      memory: { usagePercent: 0 }, gpu: null, disk: { totalBytes: 0, temperatureCelsius: null },
    });
  });
  it('按核和磁盘选择并清理名称、过滤空 GPU', async () => {
    io.cpus.mockReturnValue([{ model: '  ' }, { model: '  Named CPU  ' }]);
    io.load.mockResolvedValue({ currentLoad: 0, cpus: [{ load: -5 }, { load: 150 }] });
    io.temperature.mockResolvedValue({ main: 0, max: 70, cores: [0, 50] });
    io.graphics.mockResolvedValue({ controllers: [
      { model: '', vendor: '' }, { model: 'Only model', vendor: '', vram: 0, memoryTotal: 200, utilizationGpu: NaN },
      { model: '', vendor: 'Only vendor', utilizationGpu: 150 },
    ] });
    io.filesystems.mockResolvedValue([{ size: 100, used: 0 }, { size: 300, used: 400, mount: 'D:' }]);
    io.disks.mockResolvedValue([{ temperature: 0 }, { temperature: 55 }]);
    await expect(invoke('performance-snapshot:get', { cpu: 'cpu:1', gpu: 'gpu:1', disk: 'fs:1' })).resolves.toMatchObject({
      cpu: { loadPercent: 100, temperatureCelsius: 50 }, gpu: { model: '', vendor: 'Only vendor', loadPercent: 100, vramTotalMb: null },
      disk: { totalBytes: 300, usedBytes: 400, usagePercent: 100, temperatureCelsius: 55 },
      hardwareOptions: {
        cpu: [{ id: 'all', label: 'All CPU' }, { id: 'cpu:0', label: 'CPU 1 · Unknown CPU' }, { id: 'cpu:1', label: 'CPU 2 · Named CPU' }],
        gpu: [{ id: 'auto', label: 'Auto GPU' }, { id: 'gpu:0', label: 'Only model' }, { id: 'gpu:1', label: 'Only vendor' }],
        disk: [{ id: 'all', label: 'All Disks' }, { id: 'fs:0', label: 'Disk 1' }, { id: 'fs:1', label: 'D:' }],
      },
    });
    await expect(invoke('performance-snapshot:get', { cpu: 'cpu:0', gpu: 'gpu:0', disk: 'fs:0' }, false)).resolves.toMatchObject({
      cpu: { loadPercent: 0, temperatureCelsius: 70 }, gpu: { vendor: '', model: 'Only model', vramTotalMb: 200, loadPercent: null },
      disk: { totalBytes: 100, usedBytes: 0, temperatureCelsius: 55 }, hardwareOptions: { cpu: [], gpu: [], disk: [] },
    });
  });
  it.each(['wrong', 'cpu:-1', 'cpu:999', `cpu:${  '9'.repeat(400)}`])('非法索引 %s 使用聚合 CPU', async (value) => {
    await expect(invoke('performance-snapshot:get', { cpu: value, gpu: value, disk: value })).resolves.toMatchObject({ cpu: { loadPercent: 45 }, disk: { totalBytes: 1000 } });
  });
  it('物理核心为零时使用上报的逻辑核心数量', async () => {
    io.cpu.mockResolvedValue({ cores: 8, physicalCores: 0 });
    await expect(invoke('performance-snapshot:get')).resolves.toMatchObject({ cpu: { cores: 8, physicalCores: 8 } });
  });
});
