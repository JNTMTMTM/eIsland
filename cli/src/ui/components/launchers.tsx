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
 * @file launchers.tsx
 * @description 挂载 Ink 界面的入口：交互模式全屏界面与直接执行时的确认提示
 * @author 鸡哥
 */

import { render } from 'ink';

import createTaskManager from '../../core/taskManager';
import ConfirmPrompt from './confirmPrompt';
import InteractiveApp from './interactiveApp';

import type { CliArgs } from '../../core/args';

/**
 * 以全屏界面运行交互模式
 * @description 使用备用屏幕缓冲区，退出后恢复原终端内容；退出前结束全部运行中的任务
 * @param root - 仓库根目录
 * @param args - CLI 参数
 * @returns 退出码，正常退出为 0
 */
export async function runDashboard(root: string, args: CliArgs): Promise<number> {
  const manager = createTaskManager(root);
  const { promise, resolve } = Promise.withResolvers<void>();
  const app = render(
    <InteractiveApp manager={manager} root={root} skipConfirm={args.yes} passthrough={args.passthrough} onQuit={resolve} />,
    { exitOnCtrlC: false, alternateScreen: true },
  );
  await promise;
  await manager.killAll();
  app.unmount();
  await app.waitUntilExit();
  return 0;
}

/**
 * 显示确认提示并等待作答
 * @param message - 提示文案
 * @returns 用户确认时为 true
 */
export async function confirm(message: string): Promise<boolean> {
  const { promise, resolve } = Promise.withResolvers<boolean>();
  const app = render(<ConfirmPrompt message={message} onSubmit={resolve} />, { exitOnCtrlC: false });
  const confirmed = await promise;
  app.unmount();
  await app.waitUntilExit();
  return confirmed;
}
