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
 * @file performanceMonitorUtils.ts
 * @description Expanded 性能监控 Tab 的数值格式化、仪表盘数据推导与隐藏页面时的导航布局归一化。
 * @author 鸡哥
 */

import { HIDE_PAGE_LAYOUT_TABS } from '../config/performanceMonitorConfig';
import type { PerformanceMonitorChartColors } from '../../../../../../utils/performanceMonitorColors';
import type {
  ExpandNavLayoutItem,
  PerformanceDashboardView,
  PerformanceSnapshot,
  Translate,
} from '../types/performanceMonitorTypes';

/**
 * 将占用率限制在 0-100，非数值视为 0。
 * @param value - 原始占用率
 * @returns 限制后的占用率
 */
export function clampPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * 格式化占用率。
 * @param value - 原始占用率
 * @returns 取整百分比，非数值为 '--'
 */
export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--';
  return `${Math.round(clampPercent(value))}%`;
}

/**
 * 按 1024 进制格式化字节数。
 * @param bytes - 字节数
 * @returns 带单位文本，非正数为 '--'
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '--';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

/**
 * 格式化温度。
 * @param value - 摄氏温度
 * @returns 取整温度，缺失或非正数为 '--'
 */
export function formatTemp(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '--';
  return `${Math.round(value)}℃`;
}

/**
 * 格式化运行时长。
 * @param seconds - 运行秒数
 * @returns d/h/m 文本
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * 隐藏性能监控页时合并已保存的导航布局：总览始终可见，性能监控强制隐藏。
 * @param value - 已保存的布局
 * @returns 新布局
 */
export function normalizeHiddenLayout(value: unknown): ExpandNavLayoutItem[] {
  const defaults = HIDE_PAGE_LAYOUT_TABS.map((id) => ({
    id,
    visible: id !== 'performanceMonitor',
  }));
  if (!Array.isArray(value) || value.length === 0) return defaults;

  const known = new Set(defaults.map((item) => item.id));
  const merged = new Map<string, boolean>();
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as { id?: unknown; visible?: unknown };
    if (typeof candidate.id !== 'string' || !known.has(candidate.id)) return;
    merged.set(candidate.id, candidate.visible !== false);
  });

  return defaults.map((item) => {
    if (item.id === 'overview') return { ...item, visible: true };
    if (item.id === 'performanceMonitor') return { ...item, visible: false };
    return {
      ...item,
      visible: merged.has(item.id) ? merged.get(item.id) === true : item.visible,
    };
  });
}

/**
 * 由快照推导四个仪表卡片与主机信息行。
 * @param snapshot - 性能快照
 * @param chartColors - 图表颜色
 * @param t - 翻译函数
 * @returns 仪表盘展示数据
 */
export function buildPerformanceDashboard(
  snapshot: PerformanceSnapshot,
  chartColors: PerformanceMonitorChartColors,
  t: Translate,
): PerformanceDashboardView {
  const gpuName = snapshot.gpu
    ? [snapshot.gpu.vendor, snapshot.gpu.model].filter(Boolean).join(' ') || t('expanded.performanceMonitor.status.unavailable', { defaultValue: '不可用' })
    : t('expanded.performanceMonitor.status.noGpu', { defaultValue: '未检测到显卡' });
  const cpuName = [snapshot.cpu.manufacturer, snapshot.cpu.brand].filter(Boolean).join(' ') || t('expanded.performanceMonitor.status.unavailable', { defaultValue: '不可用' });
  const osText = `${snapshot.host.platform} ${snapshot.host.release} · ${snapshot.host.arch}`;
  const speedText = snapshot.cpu.speedGhz && snapshot.cpu.speedMaxGhz
    ? `${snapshot.cpu.speedGhz.toFixed(2)} / ${snapshot.cpu.speedMaxGhz.toFixed(2)} GHz`
    : snapshot.cpu.speedGhz
      ? `${snapshot.cpu.speedGhz.toFixed(2)} GHz`
      : '--';
  const metrics = [
    {
      label: t('expanded.performanceMonitor.labels.cpu', { defaultValue: 'CPU' }),
      value: snapshot.cpu.loadPercent,
      valueText: formatPercent(snapshot.cpu.loadPercent),
      detail: `${snapshot.cpu.physicalCores}P / ${snapshot.cpu.cores}T · ${speedText}`,
      temperature: formatTemp(snapshot.cpu.temperatureCelsius),
      accent: chartColors.cpu,
    },
    {
      label: t('expanded.performanceMonitor.labels.gpu', { defaultValue: 'GPU' }),
      value: snapshot.gpu?.loadPercent ?? null,
      valueText: formatPercent(snapshot.gpu?.loadPercent ?? null),
      detail: snapshot.gpu?.vramTotalMb ? `${Math.round(snapshot.gpu.vramTotalMb)} MB VRAM` : gpuName,
      temperature: formatTemp(snapshot.gpu?.temperatureCelsius ?? null),
      accent: chartColors.gpu,
    },
    {
      label: t('expanded.performanceMonitor.labels.memory', { defaultValue: '内存' }),
      value: snapshot.memory.usagePercent,
      valueText: formatPercent(snapshot.memory.usagePercent),
      detail: `${formatBytes(snapshot.memory.usedBytes)} / ${formatBytes(snapshot.memory.totalBytes)}`,
      temperature: t('expanded.performanceMonitor.labels.available', { defaultValue: '可用' }) + ` ${formatBytes(snapshot.memory.availableBytes)}`,
      accent: chartColors.memory,
    },
    {
      label: t('expanded.performanceMonitor.labels.disk', { defaultValue: '磁盘' }),
      value: snapshot.disk.usagePercent,
      valueText: formatPercent(snapshot.disk.usagePercent),
      detail: `${formatBytes(snapshot.disk.usedBytes)} / ${formatBytes(snapshot.disk.totalBytes)}`,
      temperature: formatTemp(snapshot.disk.temperatureCelsius),
      accent: chartColors.disk,
    },
  ];
  const infoItems = [
    { label: t('expanded.performanceMonitor.labels.host', { defaultValue: '主机' }), value: snapshot.host.hostname },
    { label: t('expanded.performanceMonitor.labels.os', { defaultValue: '系统' }), value: osText },
    { label: t('expanded.performanceMonitor.labels.cpuModel', { defaultValue: '处理器' }), value: cpuName },
    { label: t('expanded.performanceMonitor.labels.gpuModel', { defaultValue: '显卡' }), value: gpuName },
    { label: t('expanded.performanceMonitor.labels.uptime', { defaultValue: '运行' }), value: formatUptime(snapshot.host.uptimeSeconds) },
  ];
  return { metrics, infoItems };
}
