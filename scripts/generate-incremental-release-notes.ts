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

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * @file generate-incremental-release-notes.ts
 * @description 生成从上一个 Tag 到目标引用的增量 Git 日志 Markdown，用于发布说明
 * @author 鸡哥
 */

type CliOptions = {
  output: string;
  fromTag?: string;
  toRef: string;
  includeFiles: boolean;
};

/**
 * 执行 Git 命令并返回标准输出
 * @param command - 要执行的 Git 命令
 * @returns 命令输出（去除首尾空白）
 */
function runGit(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

/**
 * 尝试执行 Git 命令，失败时返回 null
 * @param command - 要执行的 Git 命令
 * @returns 命令输出；若执行失败则返回 null
 */
function tryRunGit(command: string): string | null {
  try {
    return runGit(command);
  } catch {
    return null;
  }
}

/**
 * 解析命令行参数
 * @param argv - 传入的参数数组（不含 node 与脚本路径）
 * @returns 解析后的脚本选项
 */
function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    output: 'RELEASE_NOTES_INCREMENTAL.md',
    toRef: 'HEAD',
    includeFiles: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      options.output = argv[++i];
      continue;
    }

    if (arg === '--from-tag' && argv[i + 1]) {
      options.fromTag = argv[++i];
      continue;
    }

    if (arg === '--to' && argv[i + 1]) {
      options.toRef = argv[++i];
      continue;
    }

    if (arg === '--include-files') {
      options.includeFiles = true;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    }
  }

  return options;
}

/**
 * 打印帮助信息并退出进程
 * @param code - 退出码
 * @returns 不返回（直接退出进程）
 */
function printHelpAndExit(code: number): never {
  const lines = [
    'Usage: node --experimental-strip-types scripts/generate-incremental-release-notes.ts [options]',
    '',
    'Options:',
    '  -o, --output <path>   Output markdown file path (default: RELEASE_NOTES_INCREMENTAL.md)',
    '      --from-tag <tag>  Start from specified tag (default: auto detect previous tag)',
    '      --to <ref>        End ref (default: HEAD)',
    '      --include-files   Include changed files for each commit',
    '  -h, --help            Show this help'
  ];

  console.log(lines.join('\n'));
  process.exit(code);
}

/**
 * 解析增量日志的起止引用
 * @description
 * 当目标引用恰好在某个 Tag 上时，将其替换为 Tag 名作为终点，
 * 并回退到前一个 Tag 作为起点，生成 `previousTag..currentTag` 范围。
 * 当目标引用不在 Tag 上时，以最近的 Tag 为起点，目标引用为终点。
 * @param toRef - 终点引用（默认 HEAD）
 * @param explicitFromTag - 显式指定的起始 Tag
 * @returns 起止引用对 { from, to }
 */
function resolveRange(toRef: string, explicitFromTag?: string): { from: string | null; to: string } {
  const hasAnyTag = tryRunGit('git tag --list');
  if (!hasAnyTag) {
    return { from: explicitFromTag ?? null, to: toRef };
  }

  const exactTag = tryRunGit(`git describe --tags --exact-match ${toRef}`);

  if (exactTag) {
    // toRef 恰好在 Tag 上 → 用 Tag 名替代 HEAD，回退到前一个 Tag
    const from = explicitFromTag ?? tryRunGit(`git describe --tags --abbrev=0 ${toRef}^`);
    return { from, to: exactTag };
  }

  // toRef 不在 Tag 上 → 最近可达 Tag 作为起点
  const from = explicitFromTag ?? tryRunGit(`git describe --tags --abbrev=0 ${toRef}`);
  return { from, to: toRef };
}

/**
 * 构建增量日志 Markdown 文本
 * @param startTag - 起始 Tag（可为空）
 * @param toRef - 结束引用
 * @param includeFiles - 是否在每条提交后附带变更文件列表
 * @returns 生成好的 Markdown 内容
 */
function buildLogMarkdown(startTag: string | null, toRef: string, includeFiles: boolean): string {
  const rangeText = startTag ? `${startTag}..${toRef}` : toRef;
  const titleRange = startTag ? `${startTag} -> ${toRef}` : `initial -> ${toRef}`;

  const summaryCmd = `git log ${rangeText} --date=short --pretty=format:"- %ad - [%h] %s"`;
  const summary = tryRunGit(summaryCmd) ?? '';

  let body = '';
  if (summary) {
    body += summary;
  } else {
    body += '- No commits found in the selected range.';
  }

  let filesSection = '';
  if (includeFiles && summary) {
    const detailed = tryRunGit(`git log ${rangeText} --date=short --pretty=format:"--COMMIT--%n%ad%n%h%n%s" --name-only`) ?? '';
    const chunks = detailed
      .split('--COMMIT--')
      .map((s) => s.trim())
      .filter(Boolean);

    const parts: string[] = [];
    for (const chunk of chunks) {
      const lines = chunk.split(/\r?\n/);
      const date = lines[0] ?? '';
      const hash = lines[1] ?? '';
      const subject = lines[2] ?? '';
      const files = lines.slice(3).map((s) => s.trim()).filter(Boolean);

      parts.push(`- ${date} - [${hash}] ${subject}`);
      if (files.length > 0) {
        for (const f of files) {
          parts.push(`  - ${f}`);
        }
      }
    }

    filesSection = `\n\n## Commit Details (with files)\n\n${parts.join('\n')}`;
  }

  return [
    '# Incremental Release Notes',
    '',
    `- Range: **${titleRange}**`,
    `- Generated At: **${new Date().toISOString()}**`,
    '',
    '## Commits',
    '',
    body,
    filesSection,
    '',
    '---',
    '',
    '_Generated by scripts/generate-incremental-release-notes.ts_'
  ].join('\n');
}

/**
 * 脚本入口函数
 * @description 读取参数、解析区间、生成 Markdown 并写入目标文件
 */
function main(): void {
  const options = parseArgs(process.argv.slice(2));

  const { from: startTag, to: effectiveToRef } = resolveRange(options.toRef, options.fromTag);
  const markdown = buildLogMarkdown(startTag, effectiveToRef, options.includeFiles);

  const outputPath = resolve(process.cwd(), options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, 'utf8');

  console.log(`Generated: ${outputPath}`);
  console.log(`Range: ${startTag ? `${startTag}..${effectiveToRef}` : effectiveToRef}`);
}

main();
