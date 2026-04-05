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
 * @file check-comment-standards.ts
 * @description 检查仓库中的 TypeScript/TSX 文件是否符合注释规范（文件级 JSDoc + 导出函数 JSDoc）
 * @author 鸡哥
 */

import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, relative } from 'node:path';

/** 违规信息 */
type Violation = {
  file: string;
  line: number;
  rule: 'file_header' | 'author' | 'export_function_jsdoc';
  message: string;
};

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'out']);
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx']);

/**
 * 判断是否为目标文件
 * @param filePath - 文件路径
 * @returns 是否为需要检查的 TS/TSX 文件
 */
function isTargetFile(filePath: string): boolean {
  if (filePath.endsWith('.d.ts')) return false;
  for (const ext of TARGET_EXTENSIONS) {
    if (filePath.endsWith(ext)) return true;
  }
  return false;
}

/**
 * 递归收集目标文件
 * @param rootDir - 起始目录
 * @returns 目标文件绝对路径列表
 */
function collectFiles(rootDir: string): string[] {
  const result: string[] = [];

  const walk = (dir: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.github') {
        if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      }

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      if (isTargetFile(fullPath)) {
        result.push(fullPath);
      }
    }
  };

  walk(rootDir);
  return result;
}

/**
 * 判断文件是否被 .gitignore 规则命中
 * @param rootDir - 仓库根目录
 * @param absFilePath - 文件绝对路径
 * @returns 是否被 .gitignore 规则忽略
 */
function isIgnoredByGitignore(rootDir: string, absFilePath: string): boolean {
  const relPath = relative(rootDir, absFilePath).replace(/\\/g, '/');

  try {
    execSync(`git check-ignore --no-index --quiet -- "${relPath}"`, {
      cwd: rootDir,
      stdio: 'ignore'
    });
    return true;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 1) return false;
    return false;
  }
}

/**
 * 获取文件头部的 JSDoc 注释块
 * @param content - 文件文本内容
 * @returns 头部 JSDoc 字符串，不存在则返回 null
 */
function getFileHeaderJsdoc(content: string): string | null {
  const top = content.slice(0, 3000);
  const matches = top.match(/\/\*\*[\s\S]*?\*\//g);
  if (!matches || matches.length === 0) return null;

  for (const block of matches) {
    if (block.includes('@file') || block.includes('@description') || block.includes('@author')) {
      return block;
    }
  }

  return null;
}

/**
 * 检查文件级注释
 * @param content - 文件文本内容
 * @param relPath - 相对路径
 * @returns 该文件产生的违规项
 */
function checkFileHeader(content: string, relPath: string): Violation[] {
  const violations: Violation[] = [];
  const header = getFileHeaderJsdoc(content);

  if (!header) {
    violations.push({
      file: relPath,
      line: 1,
      rule: 'file_header',
      message: '缺少文件级 JSDoc（需包含 @file / @description / @author）'
    });
    return violations;
  }

  if (!header.includes('@file') || !header.includes('@description') || !header.includes('@author')) {
    violations.push({
      file: relPath,
      line: 1,
      rule: 'file_header',
      message: '文件级 JSDoc 标签不完整（需包含 @file / @description / @author）'
    });
  }

  const authorLine = header
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.includes('@author'));

  if (!authorLine || !authorLine.includes('鸡哥')) {
    violations.push({
      file: relPath,
      line: 1,
      rule: 'author',
      message: '@author 必须统一为 鸡哥'
    });
  }

  return violations;
}

/**
 * 判断导出函数前是否存在 JSDoc
 * @param lines - 文件行数组
 * @param index - 函数声明所在行（0-based）
 * @returns 是否存在紧邻的 JSDoc 注释块
 */
function hasJsdocBefore(lines: string[], index: number): boolean {
  let i = index - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  if (i < 0) return false;
  if (!lines[i].trim().endsWith('*/')) return false;

  let j = i;
  while (j >= 0 && !lines[j].includes('/**')) j--;
  return j >= 0;
}

/**
 * 检查导出函数注释
 * @param content - 文件文本内容
 * @param relPath - 相对路径
 * @returns 该文件产生的违规项
 */
function checkExportedFunctions(content: string, relPath: string): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const isExportFunction = /^\s*export\s+function\s+\w+/.test(line);
    const isExportArrow = /^\s*export\s+const\s+\w+\s*=\s*(async\s*)?\([^)]*\)\s*=>/.test(line);
    const isExportDefaultFunction = /^\s*export\s+default\s+function\s+\w*/.test(line);

    if (isExportFunction || isExportArrow || isExportDefaultFunction) {
      if (!hasJsdocBefore(lines, i)) {
        violations.push({
          file: relPath,
          line: i + 1,
          rule: 'export_function_jsdoc',
          message: '导出函数缺少 JSDoc 注释'
        });
      }
    }
  }

  return violations;
}

/**
 * 格式化违规报告
 * @param violations - 违规列表
 * @returns 可直接输出到终端的报告文本
 */
function formatReport(violations: Violation[]): string {
  const byRule = violations.reduce<Record<string, number>>((acc, v) => {
    acc[v.rule] = (acc[v.rule] ?? 0) + 1;
    return acc;
  }, {});

  const lines: string[] = [];
  lines.push(`Comment standard violations: ${violations.length}`);
  lines.push(`By rule: ${JSON.stringify(byRule)}`);
  lines.push('');

  for (const v of violations) {
    lines.push(`${v.file}:${v.line} | ${v.rule} | ${v.message}`);
  }

  return lines.join('\n');
}

/**
 * 脚本入口
 * @description 扫描仓库 TS/TSX 文件并输出注释规范检查结果
 */
function main(): void {
  const root = process.cwd();
  const files = collectFiles(root).filter((file) => !isIgnoredByGitignore(root, file));

  const violations: Violation[] = [];
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const relPath = relative(root, file).replace(/\\/g, '/');

    violations.push(...checkFileHeader(content, relPath));
    violations.push(...checkExportedFunctions(content, relPath));
  }

  if (violations.length === 0) {
    console.log(`Comment standard check passed. Files scanned: ${files.length}`);
    return;
  }

  console.error(formatReport(violations));
  process.exit(1);
}

main();
