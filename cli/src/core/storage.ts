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
 * @file storage.ts
 * @description 本机 eIsland 应用存储的只读读取
 * @description 应用把每个配置项保存为 userData/eIsland_store/<key>.json（见 src/main/config/storeConfig.ts），
 * 这里按同样的规则定位目录并解析全部文件；敏感内容在读取时即被遮蔽，避免出现在终端或录屏中
 * @author 鸡哥
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

/** 单个存储项 */
export interface StoreEntry {
  /** 存储键名，即去掉 .json 的文件名 */
  key: string;
  /** 文件大小（字节） */
  size: number;
  /** 最后修改时刻（Unix 毫秒） */
  modified: number;
  /** 解析并遮蔽后的值；解析失败时为 undefined */
  value: unknown;
  /** 是否有内容被遮蔽 */
  masked: boolean;
  /** JSON 解析失败原因，成功时为 null */
  error: string | null;
}

/** 定位存储目录所需的环境 */
export interface StoreLocation {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  home: string;
}

/** 一次读取的结果 */
export interface StoreSnapshot {
  /** ready 读取成功；missing 目录不存在（应用从未运行过）；error 读取目录失败 */
  state: 'ready' | 'missing' | 'error';
  /** 存储项，非 ready 时为空 */
  entries: StoreEntry[];
  /** 读取失败原因 */
  error: string;
}

/** Electron 以 package.json 的 name 作为 userData 目录名 */
export const APP_DIR_NAME = 'eisland';
/** 应用存储子目录，与 storeConfig.ts 的 getStoreDir 一致 */
export const STORE_DIR_NAME = 'eIsland_store';
/** 遮蔽后显示的占位文本 */
export const MASK = '******';

// 整个文件都属于凭据的存储键，以及对象中需要遮蔽的字段名（按结尾匹配，如 accessToken、smtpPassword，避免误伤 author 等字段）；
// 邮箱与手机号属于个人信息，同样遮蔽。
const SECRET_KEY_PATTERN = /token|password|secret|credential|cookie/i;
const SECRET_FIELD_PATTERN = /(?:pass(?:word|wd)?|token|secret|credential|cookie|api[-_]?key|private[-_]?key|authorization|email|phone)$/i;

/**
 * 按 Electron app.getPath('userData') 的规则定位应用存储目录
 * @param location - 运行平台、环境变量与用户主目录
 * @returns 存储目录绝对路径
 */
export function resolveStoreDir(location: StoreLocation = { platform: process.platform, env: process.env, home: homedir() }): string {
  const { platform, env, home } = location;
  const bases: Partial<Record<NodeJS.Platform, string>> = {
    win32: env.APPDATA ?? path.join(home, 'AppData', 'Roaming'),
    darwin: path.join(home, 'Library', 'Application Support'),
  };
  const base = bases[platform] ?? env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  return path.join(base, APP_DIR_NAME, STORE_DIR_NAME);
}

/**
 * 遮蔽值中的敏感内容
 * @description 键名本身属于凭据时遮蔽整个值；否则递归遮蔽名称像凭据的字段，保留结构便于排查
 * @param key - 存储键名
 * @param value - 解析后的值
 * @returns 遮蔽后的值与是否发生遮蔽
 */
export function maskSecrets(key: string, value: unknown): { value: unknown; masked: boolean } {
  if (SECRET_KEY_PATTERN.test(key)) return { value: MASK, masked: true };
  let masked = false;
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node === null || typeof node !== 'object') return node;
    return Object.fromEntries(Object.entries(node).map(([field, child]) => {
      if (SECRET_FIELD_PATTERN.test(field) && child !== null && child !== '') {
        masked = true;
        return [field, MASK];
      }
      return [field, walk(child)];
    }));
  };
  const result = walk(value);
  return { masked, value: result };
}

/**
 * 读取存储目录中的全部存储项
 * @param dir - 存储目录
 * @returns 按键名排序的存储项；目录不存在时返回 null
 */
export function readStore(dir: string): StoreEntry[] | null {
  let files: string[];
  try {
    files = readdirSync(dir).filter((file) => file.endsWith('.json'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  return files.toSorted().map((file) => {
    const filePath = path.join(dir, file);
    const key = file.slice(0, -'.json'.length);
    const { size, mtimeMs } = statSync(filePath);
    try {
      const { value, masked } = maskSecrets(key, JSON.parse(readFileSync(filePath, 'utf8')));
      return {
        key, size, value, masked, modified: mtimeMs, error: null,
      };
    } catch (error) {
      return {
        key, size, value: undefined, masked: false, modified: mtimeMs, error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

/**
 * 读取存储目录并归类结果
 * @param dir - 存储目录
 * @returns 读取状态、存储项与失败原因
 */
export function loadStoreSnapshot(dir: string): StoreSnapshot {
  try {
    const entries = readStore(dir);
    return entries ? { entries, state: 'ready', error: '' } : { state: 'missing', entries: [], error: '' };
  } catch (error) {
    return { state: 'error', entries: [], error: error instanceof Error ? error.message : String(error) };
  }
}
