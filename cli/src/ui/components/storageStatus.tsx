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
 * @file storageStatus.tsx
 * @description 本地存储界面底部状态行：确认删除提示、删除结果或按键提示
 * @author 鸡哥
 */

import { Text } from 'ink';

import { t } from '../../core/i18n';

import type { StorageStatusProps } from '../types/uiTypes';

/**
 * 本地存储界面底部状态行
 * @param props - 状态行入参
 * @param props.pendingKey - 等待确认删除的存储键名
 * @param props.notice - 最近一次删除的结果
 * @returns 单行状态文本
 */
export default function StorageStatus({ pendingKey, notice }: StorageStatusProps): React.JSX.Element {
  if (pendingKey !== null) {
    return <Text bold color="red" wrap="truncate-end">{t('devCli.localTest.storage.confirmDelete', { key: pendingKey })}</Text>;
  }
  if (notice?.kind === 'deleted') {
    return <Text color="green" wrap="truncate-end">{t('devCli.localTest.storage.deleted', { key: notice.key })}</Text>;
  }
  if (notice?.kind === 'failed') {
    return <Text color="red" wrap="truncate-end">{t('devCli.localTest.storage.deleteFailed', { key: notice.key, message: notice.error })}</Text>;
  }
  return <Text dimColor wrap="truncate-end">{t('devCli.localTest.storage.hint')}</Text>;
}
