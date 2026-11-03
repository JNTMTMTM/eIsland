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
 * @description 欢迎界面：字符画、版本与主菜单
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import {
  LOGO_LINES, LOGO_WIDTH, MENU_ENTRIES, MENU_LABEL_WIDTH,
} from '../config/uiConfig';
import useWelcome from '../hooks/useWelcome';
import { padDisplay } from '../utils/uiUtils';
import pkg from '../../../package.json';
import { t } from '../../core/i18n';
import ConfirmPrompt from './confirmPrompt';

import type { WelcomeProps } from '../types/uiTypes';

/**
 * 欢迎界面
 * @description 终端宽度不足以容纳字符画时退化为纯文本标题，避免折行错位
 * @param props - 欢迎界面入参
 * @param props.manager - 任务管理器
 * @param props.onSelect - 选中主菜单项回调
 * @param props.onQuit - 退出回调
 * @returns 全屏居中的欢迎界面
 */
export default function Welcome({ manager, onSelect, onQuit }: WelcomeProps): React.JSX.Element {
  const {
    columns, rows, activeIndex, confirmQuit, handleConfirmQuit,
  } = useWelcome({ manager, onSelect, onQuit });
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
      <Box flexDirection="column" marginTop={1}>
        {MENU_ENTRIES.map((entry, index) => (
          <Text key={entry} color={index === activeIndex ? 'cyan' : undefined}>
            {index === activeIndex ? '❯ ' : '  '}
            <Text bold={index === activeIndex}>{padDisplay(t(`devCli.welcome.menu.${entry}.label`), MENU_LABEL_WIDTH)}</Text>
            <Text dimColor={index !== activeIndex}>{t(`devCli.welcome.menu.${entry}.description`)}</Text>
          </Text>
        ))}
      </Box>
      <Box marginTop={1}>
        {confirmQuit === null ? (
          <Text color="cyan">{t('devCli.welcome.hint')}</Text>
        ) : (
          <ConfirmPrompt message={t('devCli.dashboard.confirmQuit', { count: confirmQuit })} onSubmit={handleConfirmQuit} />
        )}
      </Box>
    </Box>
  );
}
