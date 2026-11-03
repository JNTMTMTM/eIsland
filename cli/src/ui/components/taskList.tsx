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
 * @file taskList.tsx
 * @description 操作区左侧的任务列表，行数不足时折叠更早的任务
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { STATUS_STYLE } from '../config/uiConfig';
import { hiddenTaskCount, statusText } from '../utils/uiUtils';
import { t } from '../../core/i18n';

import type { TaskListProps } from '../types/uiTypes';

/**
 * 任务列表
 * @param props - 任务列表入参
 * @param props.tasks - 全部任务
 * @param props.currentId - 当前查看的任务编号
 * @param props.maxListed - 可用行数
 * @returns 任务列表
 */
export default function TaskList({ tasks, currentId, maxListed }: TaskListProps): React.JSX.Element {
  const hidden = hiddenTaskCount(tasks.length, maxListed);
  return (
    <Box flexDirection="column">
      {hidden > 0 ? <Text dimColor>{t('devCli.dashboard.moreTasks', { count: hidden })}</Text> : null}
      {tasks.slice(hidden).map((task) => (
        <Text key={task.id} wrap="truncate-end" bold={task.id === currentId}>
          {task.id === currentId ? '❯ ' : '  '}
          <Text color={STATUS_STYLE[task.status].color}>{`${STATUS_STYLE[task.status].mark} `}</Text>
          {`${task.name} `}
          <Text dimColor>{statusText(task)}</Text>
        </Text>
      ))}
    </Box>
  );
}
