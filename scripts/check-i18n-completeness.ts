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

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const LOCALE_DIR = join(ROOT, 'i18n');
const LOCALE_FILES = readdirSync(LOCALE_DIR)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => ({ path: join(LOCALE_DIR, file), label: file.slice(0, -'.json'.length) }));
const SRC_DIR = join(ROOT, 'src');

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'out', 'test', '__tests__']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

type Issue = { file: string; line: number; rule: string; message: string };

/**
 * 递归展开翻译对象，以校验键及插值变量。
 * @param obj - 嵌套翻译对象
 * @param prefix - 当前键路径前缀
 * @returns 键路径与翻译值的映射
 */
function flattenTranslations(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(values, flattenTranslations(v as Record<string, unknown>, path));
    } else {
      values[path] = v;
    }
  });
  return values;
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

const localeData = LOCALE_FILES.map((f) => ({
  ...f,
  data: flattenTranslations(loadJson(f.path, f.label)),
}));
const localeKeySets = localeData.map((l) => ({ label: l.label, keys: new Set(Object.keys(l.data)) }));
const allKeys = new Set(localeKeySets.flatMap((s) => [...s.keys]));

const alignmentIssues: string[] = [];
const alignmentDetails: string[][] = [];
for (let i = 0; i < localeKeySets.length; i++) {
  for (let j = 0; j < localeKeySets.length; j++) {
    if (i === j) continue;
    const missing = [...localeKeySets[i].keys].filter((k) => !localeKeySets[j].keys.has(k)).sort();
    if (missing.length > 0) {
      alignmentIssues.push(`${localeKeySets[j].label} 缺少 ${missing.length} 个翻译键（${localeKeySets[i].label} 中存在）:`);
      for (const key of missing) alignmentIssues.push(`  - ${key}`);
      for (const key of missing) alignmentDetails.push([localeKeySets[j].label, localeKeySets[i].label, key]);
    }
  }
}

for (const l of localeKeySets) console.log(`[INFO] ${l.label}: ${l.keys.size} keys`);

if (alignmentIssues.length > 0) {
  console.log(`\n[FAIL] 翻译文件键不对齐:`);
  for (const line of alignmentIssues) console.log(`  ${line}`);
} else {
  console.log('[PASS] 翻译文件键完全一致。');
}

// ── 翻译值及插值变量校验 ──

const translationIssues: string[] = [];
const referenceLocale = localeData.find((locale) => locale.label === 'en-US');
if (!referenceLocale) translationIssues.push('缺少基准语言 en-US.json');

localeData.forEach((locale) => {
  Object.entries(locale.data).forEach(([key, value]) => {
    const reference = referenceLocale?.data[key];
    if (typeof value !== 'string' || (!value.trim() && reference !== '')) {
      translationIssues.push(`${locale.label}: ${key} 必须是字符串且不得遗漏非空原文`);
      return;
    }
    if (typeof reference !== 'string') return;
    const expected = (reference.match(/\{\{[^{}]+\}\}/g) ?? []).sort();
    const actual = (value.match(/\{\{[^{}]+\}\}/g) ?? []).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      translationIssues.push(`${locale.label}: ${key} 插值变量不一致，预期 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
    }
  });
});

if (translationIssues.length > 0) {
  console.log(`\n[FAIL] 翻译值或插值变量存在 ${translationIssues.length} 个问题:`);
  translationIssues.forEach((issue) => console.log(`  - ${issue}`));
} else {
  console.log('[PASS] 翻译值有效且插值变量完全一致。');
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

const alignmentIssueCount = alignmentIssues.filter((line) => line.startsWith('  - ')).length;
const totalIssues = alignmentIssueCount + translationIssues.length + missingKeyIssues.length + hardcodedIssues.length;

console.log('\n[SUMMARY]');
console.log(`  翻译文件对齐问题: ${alignmentIssueCount}`);
console.log(`  翻译值或插值变量问题: ${translationIssues.length}`);
console.log(`  t() 引用无效键: ${missingKeyIssues.length}`);
console.log(`  硬编码中文: ${hardcodedIssues.length}`);
console.log(`  总计问题: ${totalIssues}`);

/**
 * 将检查数据渲染为 GitHub 可展示的 Markdown，按完整行截断以保留表格和折叠区域。
 * @returns 包含检查概览、语言统计和问题详情的报告
 */
function renderMarkdownReport(): string {
  const escapeCell = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/[<>|`*_~\[\]@\\]/g, (character) => `&#${character.charCodeAt(0)};`)
    .replace(/\r?\n/g, ' ');
  const sourceLocation = (issue: Issue): string => {
    const label = `<code>${escapeCell(`${issue.file}:${issue.line}`)}</code>`;
    const repository = process.env.GITHUB_REPOSITORY;
    const sha = process.env.I18N_CHECK_SHA || process.env.GITHUB_SHA;
    if (!repository || !sha) return label;
    const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
    const path = issue.file.split('/').map(encodeURIComponent).join('/');
    return `[${label}](${server}/${repository}/blob/${encodeURIComponent(sha)}/${path}#L${issue.line})`;
  };
  const checks = [
    {
      label: '翻译文件键对齐', count: alignmentIssueCount,
      headers: ['缺少键的语言', '参照语言', '翻译键'],
      rows: alignmentDetails.map((cells) => cells.map(escapeCell)),
    },
    {
      label: '翻译值与插值变量', count: translationIssues.length,
      headers: ['问题'], rows: translationIssues.map((issue) => [escapeCell(issue)]),
    },
    {
      label: 't() 引用有效性', count: missingKeyIssues.length,
      headers: ['源码位置', '问题'],
      rows: missingKeyIssues.map((issue) => [sourceLocation(issue), escapeCell(issue.message)]),
    },
    {
      label: '硬编码中文', count: hardcodedIssues.length,
      headers: ['源码位置', '问题'],
      rows: hardcodedIssues.map((issue) => [sourceLocation(issue), escapeCell(issue.message)]),
    },
  ];
  const status = totalIssues > 0 ? '❌ FAIL' : '✅ PASS';
  const report = [
    '## i18n 翻译完整性报告', '',
    `**${status}** · 共 ${totalIssues} 个问题 · 扫描 ${sourceFiles.length} 个源文件`, '',
    '| 检查项 | 状态 | 问题数 |', '| --- | --- | ---: |',
    ...checks.map((check) => `| ${check.label} | ${check.count > 0 ? '❌ FAIL' : '✅ PASS'} | ${check.count} |`),
    '', '### 语言统计', '', '| 语言 | 翻译键数量 |', '| --- | ---: |',
    ...localeKeySets.map((locale) => `| ${escapeCell(locale.label)} | ${locale.keys.size} |`), '',
  ];
  for (const check of checks) {
    if (check.count === 0) continue;
    const rows: string[] = [];
    let length = 0;
    // 每类详情限定字符预算，确保包含元数据的 PR 评论仍低于 GitHub 长度限制。
    for (const cells of check.rows) {
      const row = `| ${cells.join(' | ')} |`;
      if (length + row.length > 10_000) break;
      rows.push(row);
      length += row.length + 1;
    }
    report.push(
      '<details>', `<summary>${check.label}（${check.count} 个问题）</summary>`, '',
      `| ${check.headers.join(' | ')} |`, `| ${check.headers.map(() => '---').join(' | ')} |`,
      ...rows, '',
    );
    if (rows.length < check.rows.length) {
      report.push(`> 已展示 ${rows.length} / ${check.count} 个问题，完整详情请查看工作流日志或下载日志附件。`, '');
    }
    report.push('</details>', '');
  }
  if (totalIssues === 0) report.push('所有 i18n 完整性检查均已通过。', '');
  return report.join('\n');
}

const reportIndex = process.argv.indexOf('--report');
if (reportIndex !== -1) {
  const reportPath = process.argv[reportIndex + 1];
  if (!reportPath) {
    console.error('[ERROR] --report 必须指定 Markdown 报告路径');
    process.exit(1);
  }
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, renderMarkdownReport(), 'utf8');
}

process.exit(totalIssues > 0 ? 1 : 0);
