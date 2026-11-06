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
 * @file dynamicIslandUpdateSource.ts
 * @description 更新源相关类型与工具函数。
 * @author 鸡哥
 */

export type UpdateSourceKey = 'cloudflare-r2' | 'esa-cdn' | 'tencent-cos' | 'aliyun-oss' | 'github';

/** 默认使用与 COS/OSS 发布链路一致的 ESA 公共分发源。 */
export const DEFAULT_UPDATE_SOURCE: UpdateSourceKey = 'esa-cdn';

const PRO_UPDATE_SOURCE_SET: ReadonlySet<UpdateSourceKey> = new Set<UpdateSourceKey>(['tencent-cos', 'aliyun-oss']);

/**
 * @description 归一化更新源值。
 * @param value - 待归一化的更新源值。
 * @returns 归一化后的更新源键值。
 */
export function normalizeUpdateSource(value: unknown): UpdateSourceKey {
  if (value === 'github') return 'github';
  if (value === 'tencent-cos') return 'tencent-cos';
  if (value === 'aliyun-oss') return 'aliyun-oss';
  if (value === 'esa-cdn') return 'esa-cdn';
  if (value === 'cloudflare-r2') return 'cloudflare-r2';
  return DEFAULT_UPDATE_SOURCE;
}

/**
 * @description 判断更新源是否为 Pro 专属。
 * @param source - 更新源键值。
 * @returns 是否为 Pro 专属更新源。
 */
export function isProOnlyUpdateSource(source: UpdateSourceKey): boolean {
  return PRO_UPDATE_SOURCE_SET.has(source);
}

const normalizeRoleValue = (value: string): string => {
  return value.trim().toLowerCase().replace(/^role_/, '');
};

export const getRoleFromToken = (token: string | null | undefined): string | null => {
  if (!token) return null;
  const rawToken = token.trim().replace(/^bearer\s+/i, '');
  const parts = rawToken.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalizedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(normalizedPayload)) as { role?: unknown };
    return typeof decoded.role === 'string' ? normalizeRoleValue(decoded.role) : null;
  } catch {
    return null;
  }
};

const UPDATE_SOURCE_LABELS: Record<UpdateSourceKey, string> = {
  github: 'GitHub Releases',
  'tencent-cos': 'Tencent COS',
  'aliyun-oss': 'Aliyun OSS',
  'esa-cdn': 'ESA CDN',
  'cloudflare-r2': 'Cloudflare R2',
};

/**
 * @description 获取更新源显示标签。
 * @param value - 更新源键值。
 * @returns 更新源展示标签文本。
 */
export function getUpdateSourceLabel(value: unknown): string {
  return UPDATE_SOURCE_LABELS[normalizeUpdateSource(value)];
}
