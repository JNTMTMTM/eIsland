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
 * @file storageView.tsx
 * @description 本地存储测试界面：左侧键名列表，右侧选中项详情
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { STORAGE_LIST_WIDTH } from '../config/uiConfig';
import useStorage from '../hooks/useStorage';
import { t } from '../../core/i18n';
import StorageDetail from './storageDetail';
import StorageList from './storageList';

import type { StorageViewProps } from '../types/uiTypes';

/**
 * 本地存储测试界面
 * @param props - 本地存储测试入参
 * @param props.onBack - 返回本机测试列表回调
 * @returns 全屏测试界面
 */
export default function StorageView({ onBack }: StorageViewProps): React.JSX.Element {
  const {
    columns, rows, dir, snapshot, visible, activeEntry, lines, remaining,
  } = useStorage({ onBack });
  const { state, entries, error } = snapshot;
  return (
    <Box flexDirection="column" width={columns} height={rows} borderStyle="round" paddingX={1}>
      <Text wrap="truncate-end">
        <Text bold color="cyan">{t('devCli.localTest.storage.title')}</Text>
        {state === 'ready' ? <Text dimColor>{`  ${t('devCli.localTest.storage.count', { count: entries.length })}`}</Text> : null}
      </Text>
      <Text dimColor wrap="truncate-middle">{dir}</Text>
      {state === 'missing' ? <Text color="yellow">{t('devCli.localTest.storage.missing')}</Text> : null}
      {state === 'error' ? <Text color="red" wrap="wrap">{t('devCli.localTest.storage.error', { message: error })}</Text> : null}
      {state === 'ready' && entries.length === 0 ? <Text dimColor>{t('devCli.localTest.storage.empty')}</Text> : null}
      <Box flexGrow={1}>
        {state === 'ready' && activeEntry ? (
          <>
            <Box width={STORAGE_LIST_WIDTH} flexShrink={0} borderStyle="round" paddingX={1}>
              <StorageList visible={visible} activeEntry={activeEntry} />
            </Box>
            <Box flexGrow={1} flexBasis={0} borderStyle="round" paddingX={1}>
              <StorageDetail entry={activeEntry} lines={lines} remaining={remaining} />
            </Box>
          </>
        ) : null}
      </Box>
      <Text dimColor wrap="truncate-end">{t('devCli.localTest.storage.hint')}</Text>
    </Box>
  );
}
