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
 * @file generate-changelog.ts
 * @description 根据 Git Tag（版本号）顺序生成完整 CHANGE_LOG.md，包含提交哈希与贡献者
 * @author 鸡哥
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type VersionTag = {
  raw: string;
  normalized: string;
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  prereleaseParts: string[];
};

type CommitItem = {
  hash: string;
  author: string;
  date: string;
  subject: string;
};

type CliOptions = {
  output: string;
  includeUnreleased: boolean;
};

function runGit(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function tryRunGit(command: string): string | null {
  try {
    return runGit(command);
  } catch {
    return null;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    output: 'docs/CHANGE_LOG.md',
    includeUnreleased: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
      options.output = argv[++i];
      continue;
    }

    if (arg === '--no-unreleased') {
      options.includeUnreleased = false;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    }
  }

  return options;
}

function printHelpAndExit(code: number): never {
  const lines = [
    'Usage: node --experimental-strip-types scripts/generate-changelog.ts [options]',
    '',
    'Options:',
    '  -o, --output <path>    Output markdown file path (default: docs/CHANGE_LOG.md)',
    '      --no-unreleased    Do not include the Unreleased section',
    '  -h, --help             Show this help',
  ];

  console.log(lines.join('\n'));
  process.exit(code);
}

function parseVersionTag(tag: string): VersionTag | null {
  const matched = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(tag.trim());
  if (!matched) return null;

  const major = Number(matched[1]);
  const minor = Number(matched[2]);
  const patch = Number(matched[3]);
  const prerelease = matched[4] ?? null;

  return {
    raw: tag,
    normalized: prerelease ? `${major}.${minor}.${patch}-${prerelease}` : `${major}.${minor}.${patch}`,
    major,
    minor,
    patch,
    prerelease,
    prereleaseParts: prerelease ? prerelease.split('.') : [],
  };
}

function comparePrereleaseIdentifier(a: string, b: string): number {
  const aIsNumeric = /^\d+$/.test(a);
  const bIsNumeric = /^\d+$/.test(b);

  if (aIsNumeric && bIsNumeric) {
    return Number(a) - Number(b);
  }

  if (aIsNumeric && !bIsNumeric) return -1;
  if (!aIsNumeric && bIsNumeric) return 1;

  return a.localeCompare(b);
}

function compareVersion(a: VersionTag, b: VersionTag): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  if (a.prerelease === null && b.prerelease === null) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;

  const maxLen = Math.max(a.prereleaseParts.length, b.prereleaseParts.length);
  for (let i = 0; i < maxLen; i++) {
    const left = a.prereleaseParts[i];
    const right = b.prereleaseParts[i];

    if (left === undefined) return -1;
    if (right === undefined) return 1;

    const cmp = comparePrereleaseIdentifier(left, right);
    if (cmp !== 0) return cmp;
  }

  return 0;
}

function getSortedVersionTags(): VersionTag[] {
  const tagOutput = tryRunGit('git tag --list') ?? '';
  const tags = tagOutput
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(parseVersionTag)
    .filter((t): t is VersionTag => t !== null)
    .sort(compareVersion);

  return tags;
}

function readCommitsInRange(range: string): CommitItem[] {
  const output = tryRunGit(`git log ${range} --date=short --pretty=format:"%h|%an|%ad|%s"`) ?? '';
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash = '', author = '', date = '', ...subjectParts] = line.split('|');
      return {
        hash,
        author,
        date,
        subject: subjectParts.join('|'),
      };
    });
}

function formatCommitLine(item: CommitItem): string {
  return `- ${item.date} | ${item.hash} | ${item.author} | ${item.subject}`;
}

function buildMarkdown(tags: VersionTag[], includeUnreleased: boolean): string {
  const lines: string[] = [];
  lines.push('# CHANGE LOG');
  lines.push('');
  lines.push('> 基于 Git 提交记录自动生成，按版本号顺序排列（含哈希与贡献者）。');
  lines.push(`> 生成时间：${new Date().toISOString()}`);
  lines.push('');

  if (tags.length === 0) {
    const commits = readCommitsInRange('HEAD');
    lines.push('## Unreleased');
    lines.push('');
    if (commits.length === 0) {
      lines.push('- No commits found.');
    } else {
      lines.push(...commits.map(formatCommitLine));
    }
    lines.push('');
    return lines.join('\n');
  }

  const sections = tags.map((current, i) => {
    const previous = i > 0 ? tags[i - 1] : null;
    const range = previous ? `${previous.raw}..${current.raw}` : current.raw;
    const commits = readCommitsInRange(range);

    return { current, commits };
  });

  for (let i = sections.length - 1; i >= 0; i--) {
    const { current, commits } = sections[i];

    lines.push(`## ${current.normalized}`);
    lines.push('');
    if (commits.length === 0) {
      lines.push('- No commits found.');
    } else {
      lines.push(...commits.map(formatCommitLine));
    }
    lines.push('');
  }

  if (includeUnreleased) {
    const latest = tags[tags.length - 1];
    const unreleased = readCommitsInRange(`${latest.raw}..HEAD`);
    lines.push('## Unreleased');
    lines.push('');
    if (unreleased.length === 0) {
      lines.push('- No commits found.');
    } else {
      lines.push(...unreleased.map(formatCommitLine));
    }
    lines.push('');
  }

  return lines.join('\n');
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const tags = getSortedVersionTags();
  const markdown = buildMarkdown(tags, options.includeUnreleased);

  const outputPath = resolve(process.cwd(), options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, 'utf8');

  console.log(`Generated: ${outputPath}`);
  console.log(`Version tags found: ${tags.slice().reverse().map((t) => t.normalized).join(', ') || 'none'}`);
}

main();
