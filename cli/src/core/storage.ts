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
 * @description 本机 eIsland 应用存储的读取与删除
 * @description 应用把每个配置项保存为 userData/eIsland_store/<key>.json（见 src/main/config/storeConfig.ts），
 * 这里按同样的规则定位目录并解析全部文件；敏感内容在读取时即被遮蔽，避免出现在终端或录屏中
 * @author 鸡哥
 */

import {
  readdirSync, readFileSync, rmSync, statSync,
} from 'node:fs';
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
  /** 判断目录是否存在，默认读取目录元信息 */
  exists?: (dir: string) => boolean;
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

/**
 * 旧业务数据目录候选；保留大小写敏感文件系统上的历史目录兼容。
 */
export const APP_DIR_NAMES: readonly string[] = ['eIsland', 'eisland'];
/** 原生宿主的应用标识。 */
const NATIVE_APP_DIR_NAME = 'com.pyisland.eisland';
/** 业务存储子目录，与原生 data_directory.rs 一致。 */
export const STORE_DIR_NAME = 'eIsland_store';
/** 遮蔽后显示的占位文本 */
export const MASK = '******';

// 整个文件都属于凭据的存储键。
const SECRET_KEY_PATTERN = /token|password|secret|credential|cookie/i;
// 字段名按驼峰、下划线、连字符拆成单词后整词匹配：accessToken、emailAddress、phone_number 都能命中，author、inputTokens 不会误伤；
// 邮箱、手机号属于个人信息，同样遮蔽。
const SECRET_WORDS = new Set([
  'pass', 'password', 'passwd', 'pwd', 'token', 'secret', 'credential', 'credentials', 'cookie', 'cookies',
  'authorization', 'apikey', 'privatekey', 'email', 'phone', 'mobile',
]);
const SECRET_WORD_PAIRS = new Set(['api key', 'private key']);
// 与存储项配套保存、仅由它索引的目录，删除存储项时一并删除，避免留下无人清理的文件。
const STORE_COMPANIONS: Readonly<Record<string, readonly string[]>> = { 'claude-code-status': ['cli-details'] };
// 应用写入设置时可能恰好读到不完整的文件，短暂等待后重试，仍失败才视为损坏。
const READ_ATTEMPTS = 3;
const READ_RETRY_MS = 30;

/**
 * 按原生宿主的目录优先级定位业务存储，显式环境覆盖优先。
 * @param location - 运行平台、环境变量、用户主目录与目录存在判断
 * @returns 现有原生目录、现有旧业务目录或新用户的原生默认目录
 */
export function resolveStoreDir(location: StoreLocation = { platform: process.platform, env: process.env, home: homedir() }): string {
  const {
    platform, env, home, exists = (dir: string): boolean => {
      try { return statSync(dir).isDirectory(); } catch { return false; }
    },
  } = location;
  if (env.EISLAND_DATA_DIR !== undefined) return env.EISLAND_DATA_DIR;
  const bases: Partial<Record<NodeJS.Platform, string>> = {
    win32: env.APPDATA ?? path.join(home, 'AppData', 'Roaming'),
    darwin: path.join(home, 'Library', 'Application Support'),
  };
  const config = bases[platform] ?? env.XDG_CONFIG_HOME ?? path.join(home, '.config');
  const data = bases[platform] ?? env.XDG_DATA_HOME ?? path.join(home, '.local', 'share');
  const dirs = [
    path.join(data, NATIVE_APP_DIR_NAME, STORE_DIR_NAME),
    ...APP_DIR_NAMES.map((name) => path.join(config, name, STORE_DIR_NAME)),
  ];
  return dirs.find((dir) => exists(dir)) ?? dirs[0];
}

/**
 * 判断字段名是否属于凭据或个人信息
 * @param field - 对象字段名
 * @returns 拆分后的任一单词或相邻词组命中时为 true
 */
export function isSecretField(field: string): boolean {
  const words = field.replace(/([a-z\d])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z\d]+/)
    .filter(Boolean);
  return words.some((word, index) => SECRET_WORDS.has(word) || SECRET_WORD_PAIRS.has(`${word} ${words[index + 1]}`));
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
      if (isSecretField(field) && child !== null && child !== '') {
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
 * 同步等待一小段时间
 * @param ms - 等待毫秒数
 */
function sleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * 读取文件大小与修改时刻，失败时返回 0
 * @param filePath - 文件路径
 * @returns 文件大小与修改时刻
 */
function statOrZero(filePath: string): { size: number; mtimeMs: number } {
  try {
    return statSync(filePath);
  } catch {
    return { size: 0, mtimeMs: 0 };
  }
}

/**
 * 读取单个存储项，短暂重试以避开应用正在写入的瞬间
 * @param dir - 存储目录
 * @param file - 文件名
 * @returns 存储项；列出后已被删除时返回 null
 */
function readEntry(dir: string, file: string): StoreEntry | null {
  const filePath = path.join(dir, file);
  const key = file.slice(0, -'.json'.length);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
    if (attempt > 0) sleep(READ_RETRY_MS);
    try {
      const { size, mtimeMs } = statSync(filePath);
      const { value, masked } = maskSecrets(key, JSON.parse(readFileSync(filePath, 'utf8')));
      return {
        key, size, value, masked, modified: mtimeMs, error: null,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      lastError = error;
    }
  }
  const { size, mtimeMs } = statOrZero(filePath);
  return {
    key, size, value: undefined, masked: false, modified: mtimeMs, error: lastError instanceof Error ? lastError.message : String(lastError),
  };
}

/**
 * 读取存储目录中的全部存储项
 * @description 单个文件读取失败只影响该项，不影响其他存储项
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
  return files.toSorted().map((file) => readEntry(dir, file)).filter((entry) => entry !== null);
}

/**
 * 删除一个存储项文件及其配套目录
 * @description 应用下次读取该键时会回落到默认值；应用运行中可能随时重新写入
 * @param dir - 存储目录
 * @param key - 存储键名
 */
export function deleteStoreEntry(dir: string, key: string): void {
  rmSync(path.join(dir, `${key}.json`));
  (STORE_COMPANIONS[key] ?? []).forEach((name) => {
    rmSync(path.join(dir, name), { recursive: true, force: true });
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
