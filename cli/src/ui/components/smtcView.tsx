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
 * @file smtcView.tsx
 * @description SMTC 测试界面：实时展示本机当前媒体会话
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import useSmtc from '../hooks/useSmtc';
import { t } from '../../core/i18n';
import SmtcSessionInfo from './smtcSessionInfo';

import type { SmtcViewProps } from '../types/uiTypes';

/**
 * SMTC 测试界面
 * @param props - SMTC 测试入参
 * @param props.onBack - 返回本机测试列表回调
 * @returns 全屏测试界面
 */
export default function SmtcView({ onBack }: SmtcViewProps): React.JSX.Element {
  const {
    columns, rows, state, session, position, error,
  } = useSmtc({ onBack });
  return (
    <Box flexDirection="column" width={columns} height={rows} borderStyle="round" paddingX={1}>
      <Text bold color="cyan">{t('devCli.localTest.smtc.title')}</Text>
      <Box flexDirection="column" flexGrow={1} marginTop={1}>
        {state === 'loading' ? <Text color="yellow">{t('devCli.localTest.smtc.loading')}</Text> : null}
        {state === 'unsupported' ? <Text color="red">{t('devCli.localTest.smtc.unsupported')}</Text> : null}
        {state === 'error' ? <Text color="red" wrap="wrap">{t('devCli.localTest.smtc.error', { message: error })}</Text> : null}
        {state === 'ready' && !session ? <Text dimColor>{t('devCli.localTest.smtc.empty')}</Text> : null}
        {state === 'ready' && session ? <SmtcSessionInfo session={session} position={position} /> : null}
      </Box>
      <Text dimColor wrap="truncate-end">{t('devCli.localTest.smtc.hint')}</Text>
    </Box>
  );
}
