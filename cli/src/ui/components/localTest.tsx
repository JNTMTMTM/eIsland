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
 * @file localTest.tsx
 * @description 本机测试界面：测试项列表与正在运行的测试
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { LOCAL_TEST_ITEMS, MENU_LABEL_WIDTH } from '../config/uiConfig';
import useLocalTest from '../hooks/useLocalTest';
import { padDisplay } from '../utils/uiUtils';
import { t } from '../../core/i18n';
import SmtcView from './smtcView';
import StorageView from './storageView';

import type { LocalTestProps } from '../types/uiTypes';

/**
 * 本机测试界面
 * @param props - 本机测试入参
 * @param props.root - 仓库根目录
 * @param props.onBack - 返回主菜单回调
 * @returns 测试列表，或正在运行的测试界面
 */
export default function LocalTest({ root, onBack }: LocalTestProps): React.JSX.Element {
  const {
    columns, rows, activeIndex, running, closeTest,
  } = useLocalTest({ onBack });
  if (running === 'smtc') return <SmtcView root={root} onBack={closeTest} />;
  if (running === 'storage') return <StorageView onBack={closeTest} />;
  return (
    <Box flexDirection="column" width={columns} height={rows} borderStyle="round" paddingX={1}>
      <Text bold color="cyan">{t('devCli.localTest.title')}</Text>
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {LOCAL_TEST_ITEMS.map((item, index) => (
          <Text key={item} wrap="truncate-end" color={index === activeIndex ? 'cyan' : undefined}>
            {index === activeIndex ? '❯ ' : '  '}
            {item === 'menu' ? t('devCli.dashboard.actions.menu') : padDisplay(t(`devCli.localTest.items.${item}.label`), MENU_LABEL_WIDTH)}
            {item === 'menu' ? null : <Text dimColor={index !== activeIndex}>{t(`devCli.localTest.items.${item}.description`)}</Text>}
          </Text>
        ))}
      </Box>
      <Text dimColor wrap="truncate-end">{t('devCli.localTest.hint')}</Text>
    </Box>
  );
}
