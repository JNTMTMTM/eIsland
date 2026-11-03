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
 * @file args.ts
 * @description 解析 CLI 参数，`--` 之后的参数原样透传给 npm 脚本
 * @author 鸡哥
 */

import { parseArgs } from 'node:util';

/** CLI 参数解析结果 */
export interface CliArgs {
  /** 子命令或脚本名分段 */
  positionals: string[];
  /** `--` 之后透传给脚本的参数 */
  passthrough: string[];
  /** 跳过危险脚本确认 */
  yes: boolean;
  /** 显式指定的输出语言 */
  lang?: string;
  /** 显示帮助 */
  help: boolean;
  /** 显示版本 */
  version: boolean;
}

/**
 * 解析命令行参数
 * @description 未知选项会抛出 TypeError，由调用方提示用户使用 `--` 透传
 * @param argv - 去除 node 与入口路径后的参数
 * @returns 结构化参数
 */
export default function parseCliArgs(argv: string[]): CliArgs {
  const separator = argv.indexOf('--');
  const head = separator === -1 ? argv : argv.slice(0, separator);
  const passthrough = separator === -1 ? [] : argv.slice(separator + 1);
  const { values, positionals } = parseArgs({
    args: head,
    allowPositionals: true,
    strict: true,
    options: {
      yes: { type: 'boolean', short: 'y', default: false },
      lang: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });
  return {
    positionals,
    passthrough,
    yes: values.yes,
    lang: values.lang,
    help: values.help,
    version: values.version,
  };
}
