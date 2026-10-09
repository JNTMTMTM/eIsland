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
 * @file index.d.ts
 * @description Windows 性能采集插件类型声明
 * @description 为 CPU、内存与温度采集模块提供 TypeScript 类型定义
 * @author 鸡哥
 */

export interface CpuSnapshot {
  usagePercent: number;
  hasBaseline: boolean;
}

export interface MemorySnapshot {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usagePercent: number;
}

export type TemperatureCategory = 'cpu' | 'gpu' | 'motherboard' | 'storage' | 'unknown';

export interface TemperatureReading {
  id: string;
  label: string;
  category: TemperatureCategory;
  temperatureCelsius: number;
  source: 'libre-hardware-monitor';
}

export interface TemperatureSnapshot {
  isAvailable: boolean;
  readings: TemperatureReading[];
  maxTemperatureCelsius: number | null;
}

export interface HardwareDevice {
  id: string;
  name: string;
  category: 'cpu' | 'gpu';
  hardwareType: string;
  source: 'libre-hardware-monitor';
}

export interface HardwareListSnapshot {
  isAvailable: boolean;
  cpus: HardwareDevice[];
  gpus: HardwareDevice[];
}

export function getCpu(): CpuSnapshot;
export function getMemory(): MemorySnapshot;
export function getTemperature(): TemperatureSnapshot;
export function getHardwareList(): HardwareListSnapshot;