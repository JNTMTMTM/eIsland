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
 * @file outputPanel.tsx
 * @description 任务界面上方：展示当前任务输出，默认跟随最新输出，可向上翻看
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { outputRows, windowStart } from '../utils/uiUtils';
import { t } from '../../core/i18n';

import type { OutputPanelProps } from '../types/uiTypes';

/**
 * 输出面板
 * @param props - 输出面板入参
 * @param props.task - 当前任务
 * @param props.index - 当前任务序号
 * @param props.total - 任务总数
 * @param props.height - 可展示行数
 * @param props.anchor - 翻看时固定的起始行
 * @returns 输出面板
 */
export default function OutputPanel({ task, index, total, height, anchor }: OutputPanelProps): React.JSX.Element {
  if (!task) {
    return (
      <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
        <Text dimColor>{t('devCli.dashboard.noTasks')}</Text>
      </Box>
    );
  }
  const start = windowStart(task.lines.length, height, anchor);
  const scrolled = start < windowStart(task.lines.length, height, null);
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
      <Text bold wrap="truncate-end">
        {t('devCli.dashboard.outputTitle', { index, total, name: task.name })}
        {scrolled ? <Text color="yellow">{`  ${t('devCli.dashboard.scrolled')}`}</Text> : null}
      </Text>
      {outputRows(task.lines, start, height).map((row) => <Text key={row.id} wrap="truncate-end">{row.text || ' '}</Text>)}
    </Box>
  );
}
