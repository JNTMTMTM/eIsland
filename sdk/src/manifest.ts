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
 * @file manifest.ts
 * @description eIsland 插件清单校验工具
 * @description 提供插件清单字段校验与错误收集能力
 * @author 鸡哥
 */

import type {
  PluginManifest,
  PluginPermission,
  PluginValidationError,
  PluginValidationResult,
} from './types';

const PERMISSION_SET: ReadonlySet<PluginPermission> = new Set([
  'storage',
  'http',
  'notify',
  'settings.read',
  'settings.subscribe',
  'wallpaper.apply',
  'media.control',
  'clipboard.read',
  'clipboard.write',
  'window.control',
]);

const ID_RE = /^[a-z0-9]+(?:\.[a-z0-9-]+)+$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;

/**
 * 追加一条清单校验错误
 * @param errors - 错误列表
 * @param field - 错误字段路径
 * @param message - 错误描述信息
 */
function push(errors: PluginValidationError[], field: string, message: string): void {
  errors.push({ field, message });
}

/**
 * 判断值是否为非空字符串
 * @param value - 待判断值
 * @returns 是非空字符串时返回 true
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 判断入口路径是否为包内安全相对路径
 * @param value - 入口路径字符串
 * @returns 路径安全时返回 true
 */
function isSafeEntryPath(value: string): boolean {
  if (value.includes('..')) return false;
  if (value.startsWith('/')) return false;
  if (value.includes('\\')) return false;
  return true;
}

/**
 * 判断域名格式是否合法
 * @param value - 域名字符串
 * @returns 域名格式合法时返回 true
 */
function isValidDomain(value: string): boolean {
  return /^[a-z0-9.-]+$/i.test(value) && value.includes('.');
}

/**
 * 校验插件清单结构与字段约束
 * @param input - 原始清单对象
 * @returns 校验结果，包含是否通过与错误列表
 */
export function validatePluginManifest(input: unknown): PluginValidationResult {
  const errors: PluginValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: [{ field: '$', message: 'manifest must be an object' }] };
  }

  const manifest = input as Partial<PluginManifest>;

  if (!isNonEmptyString(manifest.id)) {
    push(errors, 'id', 'id is required');
  } else if (!ID_RE.test(manifest.id)) {
    push(errors, 'id', 'id must be reverse-domain style, e.g. com.example.plugin');
  }

  if (!isNonEmptyString(manifest.name)) {
    push(errors, 'name', 'name is required');
  }

  if (!isNonEmptyString(manifest.version)) {
    push(errors, 'version', 'version is required');
  } else if (!VERSION_RE.test(manifest.version)) {
    push(errors, 'version', 'version must use semver format, e.g. 1.0.0');
  }

  if (!isNonEmptyString(manifest.entry)) {
    push(errors, 'entry', 'entry is required');
  } else if (!isSafeEntryPath(manifest.entry)) {
    push(errors, 'entry', 'entry must be a relative safe path inside plugin package');
  }

  if (!Array.isArray(manifest.permissions)) {
    push(errors, 'permissions', 'permissions must be an array');
  } else {
    for (const permission of manifest.permissions) {
      if (typeof permission !== 'string' || !PERMISSION_SET.has(permission as PluginPermission)) {
        push(errors, 'permissions', `unsupported permission: ${String(permission)}`);
      }
    }
  }

  if (!manifest.engines || typeof manifest.engines !== 'object') {
    push(errors, 'engines', 'engines is required');
  } else if (!isNonEmptyString(manifest.engines.eisland)) {
    push(errors, 'engines.eisland', 'engines.eisland is required');
  }

  if (manifest.network) {
    if (!Array.isArray(manifest.network.allowDomains)) {
      push(errors, 'network.allowDomains', 'network.allowDomains must be an array');
    } else {
      for (const domain of manifest.network.allowDomains) {
        if (!isNonEmptyString(domain) || !isValidDomain(domain)) {
          push(errors, 'network.allowDomains', `invalid domain: ${String(domain)}`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
