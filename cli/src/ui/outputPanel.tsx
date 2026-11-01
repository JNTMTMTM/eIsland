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
 * @description 分栏界面左侧：展示当前任务输出，默认跟随最新输出，可向上翻看
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { t } from '../core/i18n';

import type { Task } from '../core/taskManager';

/** 输出面板属性 */
interface OutputPanelProps {
  /** 当前查看的任务，没有任务时为 undefined */
  task: Task | undefined;
  /** 当前任务在任务列表中的序号（从 1 开始） */
  index: number;
  /** 任务总数 */
  total: number;
  /** 可展示输出的行数 */
  height: number;
  /** 翻看时固定的起始行，null 表示跟随最新输出 */
  anchor: number | null;
}

/**
 * 计算输出窗口的起始行
 * @description 翻看时以起始行而非距底部偏移定位，新输出持续到达时画面保持不动
 * @param length - 输出总行数
 * @param height - 可展示行数
 * @param anchor - 固定的起始行，null 表示跟随最新输出
 * @returns 起始行下标，不超过跟随最新时的起始行
 */
export function windowStart(length: number, height: number, anchor: number | null): number {
  const follow = Math.max(0, length - height);
  return anchor === null ? follow : Math.max(0, Math.min(anchor, follow));
}

/**
 * 输出面板
 * @param props - 输出面板属性
 * @param props.task - 当前任务
 * @param props.index - 当前任务序号
 * @param props.total - 任务总数
 * @param props.height - 可展示行数
 * @param props.anchor - 翻看时固定的起始行
 * @returns 输出面板
 */
export function OutputPanel({ task, index, total, height, anchor }: OutputPanelProps): React.JSX.Element {
  if (!task) {
    return (
      <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
        <Text dimColor>{t('dashboard.noTasks')}</Text>
      </Box>
    );
  }
  const start = windowStart(task.lines.length, height, anchor);
  const scrolled = start < windowStart(task.lines.length, height, null);
  // 以绝对行号作为 key，滚动时 React 可复用未变化的行。
  const rows = Array.from({ length: Math.min(height, task.lines.length - start) }, (value, offset) => ({
    id: start + offset,
    text: task.lines[start + offset],
  }));
  return (
    <Box flexDirection="column" flexGrow={1} borderStyle="round" paddingX={1}>
      <Text bold wrap="truncate-end">
        {t('dashboard.outputTitle', { index, total, name: task.name })}
        {scrolled ? <Text color="yellow">{`  ${t('dashboard.scrolled')}`}</Text> : null}
      </Text>
      {rows.map((row) => <Text key={row.id} wrap="truncate-end">{row.text || ' '}</Text>)}
    </Box>
  );
}
