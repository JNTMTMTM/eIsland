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
 * @file storageDetail.tsx
 * @description 本地存储测试界面中选中项的详情：类型、成员数、大小、修改时间与格式化 JSON
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import {
  formatBytes, formatTime, storeItemCount, storeValueType,
} from '../utils/uiUtils';
import { t } from '../../core/i18n';

import type { StorageDetailProps } from '../types/uiTypes';

/**
 * 存储项详情
 * @param props - 详情入参
 * @param props.entry - 光标所在的存储项
 * @param props.lines - 当前可见的 JSON 行
 * @param props.remaining - 可见行之外剩余的行数
 * @returns 详情
 */
export default function StorageDetail({ entry, lines, remaining }: StorageDetailProps): React.JSX.Element {
  const count = entry.error ? null : storeItemCount(entry.value);
  const type = entry.error
    ? t('devCli.localTest.storage.invalid')
    : t(`devCli.localTest.storage.types.${storeValueType(entry.value)}`);
  const meta = [
    type,
    count === null ? null : t('devCli.localTest.storage.items', { count }),
    formatBytes(entry.size),
    formatTime(entry.modified),
  ].filter((part) => part !== null).join(' · ');
  return (
    <Box flexDirection="column" flexGrow={1}>
      <Text bold wrap="truncate-end">{entry.key}</Text>
      <Text dimColor wrap="truncate-end">{meta}</Text>
      {entry.masked ? <Text color="yellow" wrap="truncate-end">{t('devCli.localTest.storage.masked')}</Text> : <Text> </Text>}
      {entry.error ? <Text color="red" wrap="wrap">{t('devCli.localTest.storage.parseError', { message: entry.error })}</Text> : null}
      {lines.map((line) => <Text key={line.id} wrap="truncate-end">{line.text}</Text>)}
      {remaining > 0 ? <Text dimColor>{t('devCli.localTest.storage.more', { count: remaining })}</Text> : null}
    </Box>
  );
}
