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
 * @description 危险脚本执行或退出前的 y/N 确认提示，默认拒绝
 * @author 鸡哥
 */

import { Text } from 'ink';

import useConfirmInput from '../hooks/useConfirmInput';
import { t } from '../../core/i18n';

import type { ConfirmPromptProps } from '../types/uiTypes';

/**
 * 确认提示
 * @param props - 确认提示入参
 * @param props.message - 提示文案
 * @param props.onSubmit - 作答回调
 * @returns 提示界面
 */
export default function ConfirmPrompt({ message, onSubmit }: ConfirmPromptProps): React.JSX.Element {
  useConfirmInput(onSubmit);
  return (
    <Text>
      <Text color="yellow">⚠ </Text>
      {`${message} `}
      <Text dimColor>{t('devCli.confirm.hint')}</Text>
    </Text>
  );
}
