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
 * @file useDashboard.ts
 * @description 任务界面状态：任务订阅、当前任务、操作区模式、输出翻看与键盘交互
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';
import { useCallback, useState, useSyncExternalStore } from 'react';

import {
  computeLayout, dashboardActions, nextTaskIndex, pageDownAnchor, pageUpAnchor,
} from '../utils/uiUtils';
import { loadScripts } from '../../core/scripts';

import type { Action, DashboardProps, Mode, UseDashboardReturn } from '../types/uiTypes';
import type { ScriptEntry } from '../../core/scripts';

/**
 * 管理任务界面的全部状态与键盘交互
 * @description Tab/Shift+Tab 切换任务，PgUp/PgDn/Home/End 翻看输出；
 * 操作区在操作列表、脚本选择、确认提示之间切换
 * @param props - 任务界面入参
 * @param props.manager - 任务管理器
 * @param props.root - 仓库根目录
 * @param props.skipConfirm - 是否跳过危险脚本确认
 * @param props.passthrough - 透传给脚本的参数
 * @param props.onQuit - 确认退出时回调
 * @returns 渲染任务界面所需的状态与回调
 */
export default function useDashboard({ manager, root, skipConfirm, passthrough, onQuit }: DashboardProps): UseDashboardReturn {
  const tasks = useSyncExternalStore(manager.subscribe, manager.getSnapshot);
  const { columns, rows: windowRows } = useWindowSize();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'actions' });
  const [cursor, setCursor] = useState(0);
  const [anchor, setAnchor] = useState<number | null>(null);

  const layout = computeLayout(windowRows);
  const { outputHeight } = layout;
  // 未手动选择或所选任务已移除时，默认查看最新任务。
  const current = tasks.find((task) => task.id === selectedId) ?? tasks.at(-1);
  const currentIndex = current ? tasks.indexOf(current) : -1;
  const running = tasks.filter((task) => task.status === 'running').length;
  const actions = dashboardActions(current);
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
      setSelectedId(tasks[nextTaskIndex(currentIndex, tasks.length, key.shift)].id);
      setAnchor(null);
    } else if (current && key.pageUp) {
      setAnchor(pageUpAnchor(current.lines.length, outputHeight, anchor));
    } else if (current && key.pageDown && anchor !== null) {
      // 翻到底部后恢复跟随最新输出。
      setAnchor(pageDownAnchor(current.lines.length, outputHeight, anchor));
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

  return {
    tasks, current, currentIndex, mode, actions, actionIndex, anchor, columns, layout, handlePick, handleConfirmRun, handleConfirmQuit,
  };
}
