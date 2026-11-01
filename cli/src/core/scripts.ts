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
 * @file scripts.ts
 * @description 运行时读取根 package.json 的 scripts，提供分组、名称解析、模糊建议与检索过滤
 * @description 脚本列表不做硬编码，新增脚本无需修改 CLI 即可使用
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 单条可执行脚本 */
export interface ScriptEntry {
  /** package.json 中的脚本名，如 `test:main` */
  name: string;
  /** 脚本实际执行的命令 */
  command: string;
  /** 首个 `:` 之前的分段，用于分组展示 */
  group: string;
  /** 是否会对外发布或清理远端资源，执行前需确认 */
  dangerous: boolean;
  /** npm 生命周期脚本，由 npm 自动触发，不在列表和菜单中展示 */
  hidden: boolean;
}

/** 脚本名解析结果 */
export type ResolveResult =
  | { kind: 'found'; entry: ScriptEntry }
  | { kind: 'prefix'; matches: ScriptEntry[] }
  | { kind: 'unknown'; suggestions: string[] };

// 上传发布包与清理 CDN 缓存均作用于线上环境，且无法撤销。
const DANGEROUS_PATTERN = /^(?:release:upload|esa:purge)/;
const LIFECYCLE_SCRIPTS = new Set([
  'preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly', 'prepack', 'postpack',
]);
const MAX_SUGGESTIONS = 3;

/**
 * 读取仓库根目录 package.json 中的全部脚本
 * @param root - 仓库根目录绝对路径
 * @returns 按 package.json 声明顺序排列的脚本列表（包含隐藏脚本）
 */
export function loadScripts(root: string): ScriptEntry[] {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
  return Object.entries(pkg.scripts ?? {}).map(([name, command]) => ({
    name,
    command,
    group: name.split(':')[0],
    dangerous: DANGEROUS_PATTERN.test(name),
    hidden: LIFECYCLE_SCRIPTS.has(name),
  }));
}

/**
 * 按分组聚合可见脚本
 * @param entries - 脚本列表
 * @returns 分组名到脚本列表的映射，保持首次出现顺序
 */
export function groupScripts(entries: ScriptEntry[]): Map<string, ScriptEntry[]> {
  const groups = new Map<string, ScriptEntry[]>();
  entries.filter((entry) => !entry.hidden).forEach((entry) => {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  });
  return groups;
}

/**
 * 计算两个字符串的编辑距离
 * @param a - 字符串 a
 * @param b - 字符串 b
 * @returns Levenshtein 距离
 */
function editDistance(a: string, b: string): number {
  let previous = [...Array(b.length + 1).keys()];
  Array.from(a).forEach((charA, i) => {
    const current = [i + 1];
    Array.from(b).forEach((charB, j) => {
      current.push(Math.min(previous[j + 1] + 1, current[j] + 1, previous[j] + (charA === charB ? 0 : 1)));
    });
    previous = current;
  });
  return previous[b.length];
}

/**
 * 将命令行分段解析为脚本
 * @description 分段以 `:` 拼接后精确匹配；未命中时依次尝试前缀匹配与编辑距离建议
 * @param entries - 脚本列表
 * @param tokens - 命令行分段，如 `['plugin', 'build', 'smtc']`
 * @returns 命中脚本、前缀候选或相近脚本名建议
 */
export function resolveScript(entries: ScriptEntry[], tokens: string[]): ResolveResult {
  const name = tokens.join(':');
  const entry = entries.find((item) => item.name === name);
  if (entry) return { entry, kind: 'found' };

  const visible = entries.filter((item) => !item.hidden);
  const matches = visible.filter((item) => item.name.startsWith(`${name}:`));
  if (matches.length > 0) return { matches, kind: 'prefix' };

  // 阈值随名称长度放宽，避免短名称被大量无关脚本命中。
  const threshold = Math.max(2, Math.floor(name.length / 3));
  const suggestions = visible
    .map((item) => ({ name: item.name, distance: editDistance(name, item.name) }))
    .filter((item) => item.distance <= threshold)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_SUGGESTIONS)
    .map((item) => item.name);
  return { suggestions, kind: 'unknown' };
}

/**
 * 按关键词过滤可见脚本
 * @param entries - 脚本列表
 * @param query - 以空白分隔的关键词，全部命中脚本名或说明才保留，大小写不敏感
 * @param describe - 获取脚本说明的函数
 * @returns 过滤后的脚本列表
 */
export function filterScripts(entries: ScriptEntry[], query: string, describe: (name: string) => string): ScriptEntry[] {
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (entry.hidden) return false;
    const haystack = `${entry.name} ${describe(entry.name)}`.toLowerCase();
    return keywords.every((keyword) => haystack.includes(keyword));
  });
}
