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
 * @file check-i18n-completeness.ts
 * @description 检查 i18n 翻译完整性：翻译文件键对齐、源码 t() 调用有效性、源码硬编码中文检测
 * @author 鸡哥
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const ZH_PATH = join(ROOT, 'i18n', 'zh-CN.json');
const EN_PATH = join(ROOT, 'i18n', 'en-US.json');
const SRC_DIR = join(ROOT, 'src');

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'test', '__tests__']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

type Issue = { file: string; line: number; rule: string; message: string };

/** 递归展开嵌套对象为点分隔的键路径 */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/** 读取并解析 JSON 文件 */
function loadJson(filePath: string, label: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    console.error(`[ERROR] 无法读取 ${label}: ${filePath}`);
    process.exit(1);
  }
}

/** 递归收集目录下的源文件 */
function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

// ── Check 1: 翻译文件键对齐 ──

const zh = loadJson(ZH_PATH, 'zh-CN');
const en = loadJson(EN_PATH, 'en-US');
const zhKeys = new Set(flattenKeys(zh));
const enKeys = new Set(flattenKeys(en));
const allKeys = new Set([...zhKeys, ...enKeys]);

const missingInEn = [...zhKeys].filter((k) => !enKeys.has(k)).sort();
const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k)).sort();

console.log(`[INFO] zh-CN: ${zhKeys.size} keys | en-US: ${enKeys.size} keys`);

if (missingInEn.length > 0) {
  console.log(`\n[FAIL] en-US 缺少 ${missingInEn.length} 个翻译键（zh-CN 中存在）:`);
  for (const key of missingInEn) console.log(`  - ${key}`);
}

if (missingInZh.length > 0) {
  console.log(`\n[FAIL] zh-CN 缺少 ${missingInZh.length} 个翻译键（en-US 中存在）:`);
  for (const key of missingInZh) console.log(`  - ${key}`);
}

if (missingInEn.length === 0 && missingInZh.length === 0) {
  console.log('[PASS] 翻译文件键完全一致。');
}

// ── Check 2: 源码 t() 调用的键是否存在于翻译文件中 ──

const sourceFiles = collectSourceFiles(SRC_DIR);
const missingKeyIssues: Issue[] = [];

const T_CALL_RE = /\bt\(\s*['"]([^'"]+)['"]/g;

for (const filePath of sourceFiles) {
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    let match: RegExpExecArray | null;
    T_CALL_RE.lastIndex = 0;
    while ((match = T_CALL_RE.exec(lines[i])) !== null) {
      const key = match[1];
      if (!allKeys.has(key)) {
        missingKeyIssues.push({ file: relPath, line: i + 1, rule: 'missing_key', message: `t('${key}') 键不存在于翻译文件中` });
      }
    }
  }
}

if (missingKeyIssues.length > 0) {
  console.log(`\n[FAIL] 源码中 ${missingKeyIssues.length} 处 t() 调用引用了不存在的翻译键:`);
  for (const issue of missingKeyIssues) {
    console.log(`  - ${issue.file}:${issue.line} ${issue.message}`);
  }
} else {
  console.log('[PASS] 源码中所有 t() 调用的键均存在于翻译文件中。');
}

// ── Check 3: TSX 文件中硬编码中文检测 ──

const CHINESE_RE = /[一-鿿]/;
const SKIP_RE = /^import\s|^export\s|^from\s|^type\s|^interface\s|^const\s+\w+\s*=\s*vi\.|^\/\/|^\/\*|^\s*\*/;
const JSX_STRING_RE = />\s*[^<]*[一-鿿][^<]*<\//;
const ATTR_STRING_RE = /(?:title|label|placeholder|alt|aria-label|content)=\{?\s*["'][^"']*[一-鿿][^"']*["']/;
const T_WRAPPED_RE = /\bt\(\s*['"][^'"]*['"]|tr\(\s*['"][^'"]*['"]/;

const hardcodedIssues: Issue[] = [];

for (const filePath of sourceFiles) {
  if (!filePath.endsWith('.tsx')) continue;
  const content = readFileSync(filePath, 'utf-8');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');
  const lines = content.split('\n');

  // 跟踪多行 t()/tr() 调用的括号深度（使用总括号计数）
  let insideTCall = false;
  let tCallDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 跳过注释行和 import 行
    if (SKIP_RE.test(line.trim())) continue;

    // 跳过带 i18n-exclude 注释的行（用于进程名、技术标识符等非 UI 字符串）
    if (/\/\/\s*i18n-exclude/.test(line)) continue;

    const lineOpens = (line.match(/\(/g) ?? []).length;
    const lineCloses = (line.match(/\)/g) ?? []).length;

    if (!insideTCall) {
      // 检查是否包含 t()/tr() 调用（包括 T_WRAPPED_RE 匹配的行）
      if (T_WRAPPED_RE.test(line) || /\bt\(|\btr\(/.test(line)) {
        if (lineOpens > lineCloses) {
          insideTCall = true;
          tCallDepth = lineOpens - lineCloses;
        }
        continue;
      }
    } else {
      // 在多行 t()/tr() 调用内部，跟踪括号深度
      tCallDepth += lineOpens - lineCloses;
      if (tCallDepth <= 0) {
        insideTCall = false;
        tCallDepth = 0;
      }
      continue;
    }

    // 跳过中文仅出现在正则表达式中的行（支持转义斜杠）
    const lineWithoutRegex = line.replace(/\/(?:[^/\\]|\\.)+\/[gimsuy]*/g, '');
    if (CHINESE_RE.test(line) && !CHINESE_RE.test(lineWithoutRegex)) continue;

    // 跳过 new Error('中文') 模式（开发者面向的错误信息）
    if (/new\s+Error\s*\(\s*['"][^'"]*[一-鿿]/.test(line)) continue;

    // 跳过 .includes('中文') 模式（错误信息匹配）
    if (/\.includes\s*\(\s*['"][^'"]*[一-鿿]/.test(line)) continue;

    // 跳过模板字面量中的数据格式标记（如 markdown 引用前缀 `> 引用:`）
    if (/`[^`]*[一-鿿][^`]*`/.test(line) && />\s*引用\s*[:：]/.test(line)) continue;

    // 检测 JSX 文本内容中的中文
    if (JSX_STRING_RE.test(line)) {
      hardcodedIssues.push({ file: relPath, line: i + 1, rule: 'hardcoded_chinese', message: `JSX 文本中包含硬编码中文` });
      continue;
    }

    // 检测属性值中的中文
    if (ATTR_STRING_RE.test(line)) {
      hardcodedIssues.push({ file: relPath, line: i + 1, rule: 'hardcoded_chinese', message: `属性值中包含硬编码中文` });
      continue;
    }

    // 检测字符串字面量中的中文（排除 import、type 等）
    if (CHINESE_RE.test(line) && /['"`]/.test(line)) {
      hardcodedIssues.push({ file: relPath, line: i + 1, rule: 'hardcoded_chinese', message: `字符串中包含硬编码中文` });
    }
  }
}

if (hardcodedIssues.length > 0) {
  console.log(`\n[FAIL] 检测到 ${hardcodedIssues.length} 处可能的硬编码中文（应使用 t() 包裹）:`);
  for (const issue of hardcodedIssues) {
    console.log(`  - ${issue.file}:${issue.line} ${issue.message}`);
  }
} else {
  console.log('[PASS] TSX 文件中未检测到硬编码中文。');
}

// ── Summary ──

const totalIssues = missingInEn.length + missingInZh.length + missingKeyIssues.length + hardcodedIssues.length;

console.log('\n[SUMMARY]');
console.log(`  翻译文件缺失键: ${missingInEn.length + missingInZh.length}`);
console.log(`  t() 引用无效键: ${missingKeyIssues.length}`);
console.log(`  硬编码中文: ${hardcodedIssues.length}`);
console.log(`  总计问题: ${totalIssues}`);

process.exit(totalIssues > 0 ? 1 : 0);
