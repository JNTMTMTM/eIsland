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
 * @file app.ts
 * @description CLI 命令分发：交互菜单、list、run 与按 `:` 拼接的简写命令
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { styleText } from 'node:util';

import pkg from '../package.json';
import parseCliArgs from './core/args';
import { describeScript, detectLocale, initI18n, t } from './core/i18n';
import findProjectRoot from './core/projectRoot';
import runScript from './core/runner';
import { groupScripts, resolveScript, loadScripts } from './core/scripts';
import { confirm } from './ui/confirmPrompt';
import { pickScript } from './ui/scriptPicker';

import type { CliArgs } from './core/args';
import type { ScriptEntry } from './core/scripts';

// 与 POSIX shell 中 Ctrl+C 中断的退出码保持一致，便于串联命令识别用户取消。
const CANCELLED_EXIT_CODE = 130;
const CLI_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * 格式化单个脚本行
 * @param entry - 脚本
 * @param width - 脚本名列宽
 * @returns 带说明与危险标记的单行文本
 */
function formatScriptLine(entry: ScriptEntry, width: number): string {
  const description = describeScript(entry.name) || styleText('dim', entry.command);
  const tag = entry.dangerous ? styleText('red', ` [${t('list.dangerousTag')}]`) : '';
  return `  ${styleText('cyan', entry.name.padEnd(width))}  ${description}${tag}`;
}

/** 打印帮助信息 */
function printHelp(): void {
  const rows: [string, string][] = [
    ['eisland', t('help.cmdInteractive')],
    ['eisland list [group]', t('help.cmdList')],
    ['eisland run <script> [-- args]', t('help.cmdRun')],
    ['eisland <seg> [seg...] [-- args]', t('help.cmdShorthand')],
  ];
  const options: [string, string][] = [
    ['-y, --yes', t('help.optYes')],
    ['--lang <locale>', t('help.optLang')],
    ['-h, --help', t('help.optHelp')],
    ['-v, --version', t('help.optVersion')],
  ];
  const width = Math.max(...[...rows, ...options].map(([usage]) => usage.length));
  const format = ([usage, text]: [string, string]): string => `  ${usage.padEnd(width)}  ${text}`;
  console.log([
    `${styleText('bold', `eIsland CLI v${pkg.version}`)} - ${t('help.title')}`,
    '',
    `${t('help.usage')}:`,
    ...rows.map(format),
    '',
    `${t('help.options')}:`,
    ...options.map(format),
    '',
    `${t('help.examples')}:`,
    '  eisland test main',
    '  eisland plugin build smtc',
    '  eisland run test:renderer -- --watch',
  ].join('\n'));
}

/**
 * 按分组打印脚本
 * @param entries - 全部脚本
 * @param group - 仅打印该分组，缺省时打印全部
 * @returns 退出码
 */
function printList(entries: ScriptEntry[], group: string | undefined): number {
  const groups = groupScripts(entries);
  if (group !== undefined && !groups.has(group)) {
    console.error(t('errors.unknownGroup', { group, groups: [...groups.keys()].join(', ') }));
    return 1;
  }
  const selected = [...groups].filter(([name]) => group === undefined || name === group);
  const width = Math.max(...selected.flatMap(([, items]) => items.map((entry) => entry.name.length)));
  const lines = selected.flatMap(([name, items]) => [
    styleText('bold', `${name} (${items.length})`),
    ...items.map((entry) => formatScriptLine(entry, width)),
    '',
  ]);
  console.log(lines.join('\n').trimEnd());
  return 0;
}

/**
 * 执行脚本，危险脚本先确认
 * @param root - 仓库根目录
 * @param entry - 待执行脚本
 * @param args - CLI 参数
 * @param interactive - 是否处于可交互终端
 * @returns 退出码
 */
async function execute(root: string, entry: ScriptEntry, args: CliArgs, interactive: boolean): Promise<number> {
  if (entry.dangerous && !args.yes) {
    // 非交互环境（CI、管道）无法确认，必须显式传入 --yes，防止误发布。
    if (!interactive) {
      console.error(t('errors.dangerousNonInteractive', { name: entry.name }));
      return 1;
    }
    if (!(await confirm(t('confirm.dangerous', { name: entry.name })))) {
      console.log(t('cancelled'));
      return CANCELLED_EXIT_CODE;
    }
  }
  console.log(styleText('cyan', `> ${t('run.start', { name: entry.name })}`));
  try {
    const code = await runScript(root, entry.name, args.passthrough);
    return code;
  } catch (error) {
    console.error(t('errors.spawnFailed', { message: (error as Error).message }));
    return 1;
  }
}

/**
 * 解析参数，参数非法时以检测到的语言输出错误
 * @param argv - 命令行参数
 * @returns 解析结果，非法时为 null
 */
async function parseOrReport(argv: string[]): Promise<CliArgs | null> {
  try {
    const args = parseCliArgs(argv);
    await initI18n(detectLocale(args.lang));
    return args;
  } catch (error) {
    await initI18n(detectLocale(undefined));
    console.error(t('errors.badArgs', { message: (error as Error).message }));
    return null;
  }
}

/**
 * CLI 主流程
 * @param argv - 去除 node 与入口路径后的参数
 * @returns 进程退出码
 */
export default async function runCli(argv: string[]): Promise<number> {
  const args = await parseOrReport(argv);
  if (!args) return 1;
  if (args.version) {
    console.log(pkg.version);
    return 0;
  }
  const [command, ...rest] = args.positionals;
  if (args.help || command === 'help') {
    printHelp();
    return 0;
  }

  // 优先按当前目录定位，支持在其他 worktree 中复用全局链接的 CLI。
  const root = findProjectRoot(process.cwd()) ?? findProjectRoot(CLI_DIR);
  if (!root) {
    console.error(t('errors.rootNotFound'));
    return 1;
  }
  const entries = loadScripts(root);
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

  if (command === undefined) {
    if (!interactive) {
      printHelp();
      return 0;
    }
    const entry = await pickScript(entries);
    if (!entry) {
      console.log(t('cancelled'));
      return CANCELLED_EXIT_CODE;
    }
    return execute(root, entry, args, interactive);
  }
  if (command === 'list' || command === 'ls') return printList(entries, rest[0]);

  const tokens = command === 'run' ? rest : args.positionals;
  if (tokens.length === 0) {
    console.error(t('errors.runMissingName'));
    return 1;
  }
  const result = resolveScript(entries, tokens);
  if (result.kind === 'found') return execute(root, result.entry, args, interactive);

  const name = tokens.join(':');
  if (result.kind === 'prefix') {
    const width = Math.max(...result.matches.map((entry) => entry.name.length));
    console.error([t('errors.incompleteScript', { name }), ...result.matches.map((entry) => formatScriptLine(entry, width))].join('\n'));
  } else {
    const hints = result.suggestions.length > 0
      ? [t('errors.didYouMean'), ...result.suggestions.map((item) => `  ${styleText('cyan', item)}`)]
      : [t('errors.listHint')];
    console.error([t('errors.unknownScript', { name }), ...hints].join('\n'));
  }
  return 1;
}
