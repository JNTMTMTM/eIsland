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
 * @file runner.ts
 * @description 通过 `npm run` 执行脚本，保留 npm 的 PATH 与 pre/post 钩子语义并透传退出码
 * @author 鸡哥
 */

import spawn from 'cross-spawn';

// 子进程因信号终止时没有退出码，按 POSIX 约定视为 128 + SIGINT。
const SIGNAL_EXIT_CODE = 130;

/**
 * 在仓库根目录执行 npm 脚本
 * @description 使用 cross-spawn 规避 Windows 下直接 spawn `npm.cmd` 的 EINVAL 与参数转义问题；
 * 执行期间忽略父进程的 SIGINT，由同一控制台中的子进程自行处理 Ctrl+C 后再退出
 * @param root - 仓库根目录
 * @param name - 脚本名
 * @param passthrough - 透传给脚本的参数
 * @returns 子进程退出码
 */
export default function runScript(root: string, name: string, passthrough: string[]): Promise<number> {
  const args = ['run', name, ...(passthrough.length > 0 ? ['--', ...passthrough] : [])];
  const ignoreInterrupt = (): void => {};
  process.on('SIGINT', ignoreInterrupt);
  return new Promise<number>((resolve, reject) => {
    const child = spawn('npm', args, { cwd: root, stdio: 'inherit' });
    child.once('error', (error) => {
      process.off('SIGINT', ignoreInterrupt);
      reject(error);
    });
    child.once('close', (code) => {
      process.off('SIGINT', ignoreInterrupt);
      resolve(code ?? SIGNAL_EXIT_CODE);
    });
  });
}
