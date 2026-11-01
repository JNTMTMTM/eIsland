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
 * @file dashboard.tsx
 * @description 任务界面：上方展示任务输出，下方管理并发任务与操作
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { PICKER_CHROME_ROWS, TASK_BOX_WIDTH } from '../config/uiConfig';
import useDashboard from '../hooks/useDashboard';
import { pickerRowWidth } from '../utils/uiUtils';
import { t } from '../../core/i18n';
import ActionMenu from './actionMenu';
import ConfirmPrompt from './confirmPrompt';
import OutputPanel from './outputPanel';
import ScriptPicker from './scriptPicker';
import TaskList from './taskList';

import type { DashboardProps } from '../types/uiTypes';

/**
 * 任务界面
 * @param props - 任务界面入参
 * @param props.manager - 任务管理器
 * @param props.root - 仓库根目录
 * @param props.skipConfirm - 是否跳过危险脚本确认
 * @param props.passthrough - 透传给脚本的参数
 * @param props.onQuit - 确认退出时回调
 * @returns 全屏任务界面
 */
export default function Dashboard({ manager, root, skipConfirm, passthrough, onQuit }: DashboardProps): React.JSX.Element {
  const {
    tasks, current, currentIndex, mode, actions, actionIndex, anchor, columns, layout, handlePick, handleConfirmRun, handleConfirmQuit,
  } = useDashboard({ manager, root, skipConfirm, passthrough, onQuit });
  return (
    <Box flexDirection="column" width={columns} height={layout.rows}>
      <OutputPanel task={current} index={currentIndex + 1} total={tasks.length} height={layout.outputHeight} anchor={anchor} />
      <Box flexDirection="column" flexShrink={0} height={layout.bottomHeight}>
        <Box flexGrow={1}>
          <Box flexDirection="column" width={TASK_BOX_WIDTH} flexShrink={0} borderStyle="round" paddingX={1}>
            <Text wrap="truncate-end">
              <Text bold color="cyan">eIsland CLI</Text>
              <Text dimColor>{`  ${t('devCli.dashboard.tasks', { count: tasks.length })}`}</Text>
            </Text>
            <TaskList tasks={tasks} currentId={current?.id} maxListed={layout.bottomInnerRows - 1} />
          </Box>
          <Box flexDirection="column" flexGrow={1} flexBasis={0} borderStyle="round" paddingX={1}>
            {mode.kind === 'actions' ? <ActionMenu actions={actions} activeIndex={actionIndex} /> : null}
            {mode.kind === 'picker' ? (
              <ScriptPicker entries={mode.entries}
                onSubmit={handlePick}
                pageSize={Math.max(2, layout.bottomInnerRows - PICKER_CHROME_ROWS)}
                rowWidth={pickerRowWidth(columns)}
              />
            ) : null}
            {mode.kind === 'confirmRun' ? (
              <ConfirmPrompt message={t('devCli.confirm.dangerous', { name: mode.entry.name })} onSubmit={handleConfirmRun} />
            ) : null}
            {mode.kind === 'confirmQuit' ? (
              <ConfirmPrompt message={t('devCli.dashboard.confirmQuit', { count: mode.running })} onSubmit={handleConfirmQuit} />
            ) : null}
            {mode.kind === 'quitting' ? <Text color="yellow">{t('devCli.dashboard.quitting')}</Text> : null}
          </Box>
        </Box>
        <Box paddingX={1}>
          <Text dimColor wrap="truncate-end">{t('devCli.dashboard.hint')}</Text>
        </Box>
      </Box>
    </Box>
  );
}
