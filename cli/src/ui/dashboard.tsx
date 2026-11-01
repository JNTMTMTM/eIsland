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
 * @description 交互模式的全屏界面：欢迎页之后进入上下布局，上方展示任务输出，下方管理并发任务与操作
 * @author 鸡哥
 */

import { Box, Text, render, useInput, useWindowSize } from 'ink';
import { useCallback, useState, useSyncExternalStore } from 'react';

import { t } from '../core/i18n';
import { loadScripts } from '../core/scripts';
import createTaskManager from '../core/taskManager';
import { ConfirmPrompt } from './confirmPrompt';
import { OutputPanel, windowStart } from './outputPanel';
import ScriptPicker from './scriptPicker';
import Welcome from './welcome';

import type { CliArgs } from '../core/args';
import type { ScriptEntry } from '../core/scripts';
import type { Task, TaskManager, TaskStatus } from '../core/taskManager';

/** 下方操作区当前所处的交互模式 */
type Mode =
  | { kind: 'actions' }
  | { kind: 'picker'; entries: ScriptEntry[] }
  | { kind: 'confirmRun'; entry: ScriptEntry }
  | { kind: 'confirmQuit'; running: number }
  | { kind: 'quitting' };

/** 操作列表项 */
type Action = 'run' | 'stop' | 'close' | 'quit';

/** 分栏界面属性 */
interface DashboardProps {
  /** 任务管理器 */
  manager: TaskManager;
  /** 仓库根目录，每次打开选择器时重新读取脚本 */
  root: string;
  /** 是否跳过危险脚本确认（--yes） */
  skipConfirm: boolean;
  /** 透传给每个脚本的参数 */
  passthrough: string[];
  /** 用户确认退出时回调，由调用方结束任务并卸载界面 */
  onQuit: () => void;
}

/** 任务列表属性 */
interface TaskListProps {
  /** 全部任务 */
  tasks: readonly Task[];
  /** 当前查看的任务编号 */
  currentId: number | undefined;
  /** 可用行数，超出时折叠更早的任务 */
  maxListed: number;
}

const STATUS_STYLE: Record<TaskStatus, { mark: string; color: string }> = {
  running: { mark: '●', color: 'yellow' },
  succeeded: { mark: '✔', color: 'green' },
  failed: { mark: '✖', color: 'red' },
  killed: { mark: '■', color: 'gray' },
};
// 下方操作区占屏幕高度的比例与下限，保证选择器至少能展示几行脚本。
const BOTTOM_RATIO = 0.4;
const MIN_BOTTOM_ROWS = 10;
// 任务列表占操作区宽度的比例，其余留给操作与脚本选择器。
const TASK_COLUMN_RATIO = 0.4;
// ink-testing-library 等非终端输出流不提供 rows。
const FALLBACK_ROWS = 24;
// 输出面板的上下边框与标题行。
const OUTPUT_CHROME_ROWS = 3;
// 操作区的上下边框与底部按键提示。
const BOTTOM_CHROME_ROWS = 3;
// 选择器除列表外的行：输入框、剩余条数、可能折行的提示。
const PICKER_CHROME_ROWS = 4;

/**
 * 获取任务状态文案
 * @param task - 任务
 * @returns 本地化状态，失败时包含退出码
 */
function statusText(task: Task): string {
  return task.status === 'failed' ? t('dashboard.status.failed', { code: task.code }) : t(`dashboard.status.${task.status}`);
}

/**
 * 任务列表，行数不足时折叠更早的任务
 * @param props - 任务列表属性
 * @param props.tasks - 全部任务
 * @param props.currentId - 当前查看的任务编号
 * @param props.maxListed - 可用行数
 * @returns 任务列表
 */
function TaskList({ tasks, currentId, maxListed }: TaskListProps): React.JSX.Element {
  // 折叠提示本身占一行。
  const hidden = tasks.length > maxListed ? tasks.length - Math.max(1, maxListed - 1) : 0;
  return (
    <Box flexDirection="column">
      {hidden > 0 ? <Text dimColor>{t('dashboard.moreTasks', { count: hidden })}</Text> : null}
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

/**
 * 任务界面
 * @description Tab/Shift+Tab 切换任务，PgUp/PgDn/Home/End 翻看输出；
 * 下方操作区在操作列表、脚本选择、确认提示之间切换
 * @param props - 分栏界面属性
 * @param props.manager - 任务管理器
 * @param props.root - 仓库根目录
 * @param props.skipConfirm - 是否跳过危险脚本确认
 * @param props.passthrough - 透传给脚本的参数
 * @param props.onQuit - 确认退出时回调
 * @returns 全屏任务界面
 */
export function Dashboard({ manager, root, skipConfirm, passthrough, onQuit }: DashboardProps): React.JSX.Element {
  const tasks = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const { columns, rows: windowRows } = useWindowSize();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'actions' });
  const [cursor, setCursor] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);

  const rows = windowRows || FALLBACK_ROWS;
  const bottomHeight = Math.max(MIN_BOTTOM_ROWS, Math.floor(rows * BOTTOM_RATIO));
  const bottomInnerRows = bottomHeight - BOTTOM_CHROME_ROWS;
  const outputHeight = Math.max(1, rows - bottomHeight - OUTPUT_CHROME_ROWS);
  // 未手动选择或所选任务已移除时，默认查看最新任务。
  const current = tasks.find((task) => task.id === selectedId) ?? tasks.at(-1);
  const currentIndex = current ? tasks.indexOf(current) : -1;
  const running = tasks.filter((task) => task.status === 'running').length;
  const actions: Action[] = ['run', ...(current ? [current.status === 'running' ? 'stop' as const : 'close' as const] : []), 'quit'];
  const actionIndex = Math.min(cursor, actions.length - 1);

  const quit = useCallback(() => {
    setMode({ kind: 'quitting' });
    onQuit();
  }, [onQuit]);

  const startTask = useCallback((entry: ScriptEntry) => {
    const task = manager.start(entry.name, passthrough);
    setSelectedId(task.id);
    setAnchor(null);
    setMode({ kind: 'actions' });
  }, [manager, passthrough]);

  const handlePick = useCallback((entry: ScriptEntry | null) => {
    if (!entry) {
      setMode({ kind: 'actions' });
    } else if (entry.dangerous && !skipConfirm) {
      setMode({ entry, kind: 'confirmRun' });
    } else {
      startTask(entry);
    }
  }, [skipConfirm, startTask]);

  const handleConfirmRun = useCallback((confirmed: boolean) => {
    if (confirmed && mode.kind === 'confirmRun') {
      startTask(mode.entry);
    } else {
      setMode({ kind: 'actions' });
    }
  }, [mode, startTask]);

  const handleConfirmQuit = useCallback((confirmed: boolean) => {
    if (confirmed) {
      quit();
    } else {
      setMode({ kind: 'actions' });
    }
  }, [quit]);

  /**
   * 执行操作列表项
   * @param action - 操作
   */
  const runAction = (action: Action): void => {
    if (action === 'run') {
      setMode({ kind: 'picker', entries: loadScripts(root) });
    } else if (action === 'stop' && current) {
      manager.kill(current.id);
    } else if (action === 'close' && current) {
      manager.remove(current.id);
      setSelectedId(null);
      setAnchor(null);
    } else if (action === 'quit') {
      // 退出会结束全部运行中的任务，需二次确认。
      if (running > 0) {
        setMode({ running, kind: 'confirmQuit' });
      } else {
        quit();
      }
    }
  };

  useInput((input, key) => {
    if (key.tab && tasks.length > 1) {
      const next = (currentIndex + (key.shift ? -1 : 1) + tasks.length) % tasks.length;
      setSelectedId(tasks[next].id);
      setAnchor(null);
    } else if (current && key.pageUp) {
      setAnchor(Math.max(0, windowStart(current.lines.length, outputHeight, anchor) - outputHeight));
    } else if (current && key.pageDown && anchor !== null) {
      const nextStart = windowStart(current.lines.length, outputHeight, anchor) + outputHeight;
      // 翻到底部后恢复跟随最新输出。
      setAnchor(nextStart >= windowStart(current.lines.length, outputHeight, null) ? null : nextStart);
    } else if (key.home) {
      setAnchor(0);
    } else if (key.end) {
      setAnchor(null);
    }
  }, { isActive: mode.kind !== 'quitting' });

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor(Math.max(0, actionIndex - 1));
    } else if (key.downArrow) {
      setCursor(Math.min(actions.length - 1, actionIndex + 1));
    } else if (key.return) {
      runAction(actions[actionIndex]);
    } else if (key.ctrl && input === 'c') {
      runAction('quit');
    }
  }, { isActive: mode.kind === 'actions' });

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <OutputPanel task={current} index={currentIndex + 1} total={tasks.length} height={outputHeight} anchor={anchor} />
      <Box flexDirection="column" flexShrink={0} height={bottomHeight} borderStyle="round" paddingX={1}>
        <Box flexGrow={1}>
          <Box flexDirection="column" width={Math.floor(columns * TASK_COLUMN_RATIO)} marginRight={2}>
            <Text wrap="truncate-end">
              <Text bold color="cyan">eIsland CLI</Text>
              <Text dimColor>{`  ${t('dashboard.tasks', { count: tasks.length })}`}</Text>
            </Text>
            <TaskList tasks={tasks} currentId={current?.id} maxListed={bottomInnerRows - 1} />
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            {mode.kind === 'actions' ? (
              <>
                {actions.map((action, index) => (
                  <Text key={action} color={index === actionIndex ? 'cyan' : undefined}>
                    {`${index === actionIndex ? '❯ ' : '  '}${t(`dashboard.actions.${action}`)}`}
                  </Text>
                ))}
                <Text dimColor wrap="truncate-end">{t('dashboard.actionsHint')}</Text>
              </>
            ) : null}
            {mode.kind === 'picker' ? (
              <ScriptPicker entries={mode.entries} onSubmit={handlePick} pageSize={Math.max(2, bottomInnerRows - PICKER_CHROME_ROWS)} />
            ) : null}
            {mode.kind === 'confirmRun' ? (
              <ConfirmPrompt message={t('confirm.dangerous', { name: mode.entry.name })} onSubmit={handleConfirmRun} />
            ) : null}
            {mode.kind === 'confirmQuit' ? (
              <ConfirmPrompt message={t('dashboard.confirmQuit', { count: mode.running })} onSubmit={handleConfirmQuit} />
            ) : null}
            {mode.kind === 'quitting' ? <Text color="yellow">{t('dashboard.quitting')}</Text> : null}
          </Box>
        </Box>
        <Text dimColor wrap="truncate-end">{t('dashboard.hint')}</Text>
      </Box>
    </Box>
  );
}

/**
 * 交互模式根组件：先展示欢迎界面，Enter 后进入任务界面
 * @param props - 与任务界面相同的属性
 * @param props.manager - 任务管理器
 * @param props.root - 仓库根目录
 * @param props.skipConfirm - 是否跳过危险脚本确认
 * @param props.passthrough - 透传给脚本的参数
 * @param props.onQuit - 退出回调
 * @returns 欢迎界面或任务界面
 */
export function InteractiveApp({ manager, root, skipConfirm, passthrough, onQuit }: DashboardProps): React.JSX.Element {
  const [entered, setEntered] = useState(false);
  const enter = useCallback(() => setEntered(true), []);
  if (!entered) return <Welcome onEnter={enter} onQuit={onQuit} />;
  return <Dashboard manager={manager} root={root} skipConfirm={skipConfirm} passthrough={passthrough} onQuit={onQuit} />;
}

/**
 * 以全屏界面运行交互模式
 * @description 使用备用屏幕缓冲区，退出后恢复原终端内容；退出前结束全部运行中的任务
 * @param root - 仓库根目录
 * @param args - CLI 参数
 * @returns 退出码，正常退出为 0
 */
export async function runDashboard(root: string, args: CliArgs): Promise<number> {
  const manager = createTaskManager(root);
  const { promise, resolve } = Promise.withResolvers<void>();
  const app = render(
    <InteractiveApp manager={manager} root={root} skipConfirm={args.yes} passthrough={args.passthrough} onQuit={resolve} />,
    { exitOnCtrlC: false, alternateScreen: true },
  );
  await promise;
  await manager.killAll();
  app.unmount();
  await app.waitUntilExit();
  return 0;
}
