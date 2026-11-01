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
 * @file confirmPrompt.tsx
 * @description 危险脚本执行前的 y/N 确认提示，默认拒绝
 * @author 鸡哥
 */

import { Text, render, useInput } from 'ink';

import { t } from '../core/i18n';

/** 确认提示属性 */
interface ConfirmPromptProps {
  /** 提示文案 */
  message: string;
  /** 用户作答回调，仅输入 y 时为 true */
  onSubmit: (confirmed: boolean) => void;
}

/**
 * 确认提示
 * @description 只有显式输入 y 才确认，Enter、Esc、n 与 Ctrl+C 均视为拒绝，避免误触发布
 * @param props - 确认提示属性
 * @param props.message - 提示文案
 * @param props.onSubmit - 作答回调
 * @returns 提示界面
 */
export function ConfirmPrompt({ message, onSubmit }: ConfirmPromptProps): React.JSX.Element {
  useInput((input, key) => {
    const answer = input.toLowerCase();
    if (answer === 'y') {
      onSubmit(true);
    } else if (answer === 'n' || key.return || key.escape || (key.ctrl && input === 'c')) {
      onSubmit(false);
    }
  });

  return (
    <Text>
      <Text color="yellow">⚠ </Text>
      {`${message} `}
      <Text dimColor>{t('confirm.hint')}</Text>
    </Text>
  );
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
