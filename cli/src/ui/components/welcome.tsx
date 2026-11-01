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
 * @file welcome.tsx
 * @description 交互模式的欢迎界面：居中展示 eIsland 字符画，Enter 进入任务界面
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { LOGO_LINES, LOGO_WIDTH } from '../config/uiConfig';
import useWelcome from '../hooks/useWelcome';
import pkg from '../../../package.json';
import { t } from '../../core/i18n';

import type { WelcomeProps } from '../types/uiTypes';

/**
 * 欢迎界面
 * @description 终端宽度不足以容纳字符画时退化为纯文本标题，避免折行错位
 * @param props - 欢迎界面入参
 * @param props.onEnter - 进入任务界面回调
 * @param props.onQuit - 退出回调
 * @returns 全屏居中的欢迎界面
 */
export default function Welcome({ onEnter, onQuit }: WelcomeProps): React.JSX.Element {
  const { columns, rows } = useWelcome({ onEnter, onQuit });
  return (
    <Box flexDirection="column" width={columns} height={rows} alignItems="center" justifyContent="center">
      {columns > LOGO_WIDTH ? (
        LOGO_LINES.map((line) => <Text key={line.id} color={line.color}>{line.text}</Text>)
      ) : (
        <Text bold color="cyan">eIsland</Text>
      )}
      <Box marginTop={1}>
        <Text>
          <Text bold>{t('devCli.welcome.subtitle')}</Text>
          <Text dimColor>{`  v${pkg.version}`}</Text>
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">{t('devCli.welcome.hint')}</Text>
      </Box>
    </Box>
  );
}
