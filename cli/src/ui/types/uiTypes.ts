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
 * @file uiTypes.ts
 * @description 交互界面的领域类型、hook 返回值类型与组件入参
 * @author 鸡哥
 */

import type { ScriptEntry } from '../../core/scripts';
import type { Task, TaskManager } from '../../core/taskManager';

/** 下方操作区当前所处的交互模式 */
export type Mode =
  | { kind: 'actions' }
  | { kind: 'picker'; entries: ScriptEntry[] }
  | { kind: 'confirmRun'; entry: ScriptEntry }
  | { kind: 'confirmQuit'; running: number }
  | { kind: 'quitting' };

/** 操作列表项 */
export type Action = 'run' | 'stop' | 'close' | 'quit';

/** 任务状态的展示样式 */
export interface StatusStyle {
  /** 状态符号 */
  mark: string;
  /** 符号颜色 */
  color: string;
}

/** 欢迎界面字符画的一行 */
export interface LogoLine {
  /** 稳定的渲染 key */
  id: string;
  /** 文字颜色，自上而下形成渐变 */
  color: string;
  /** 行文本 */
  text: string;
}

/** 输出面板中的一行 */
export interface OutputRow {
  /** 绝对行号，作为渲染 key 以便滚动时复用未变化的行 */
  id: number;
  /** 行文本 */
  text: string;
}

/** 任务界面各区域的尺寸 */
export interface DashboardLayout {
  /** 终端行数 */
  rows: number;
  /** 下方操作区高度（含边框） */
  bottomHeight: number;
  /** 下方操作区去除边框与提示后的可用行数 */
  bottomInnerRows: number;
  /** 输出面板可展示的输出行数 */
  outputHeight: number;
}

/** InteractiveApp 与 Dashboard 组件入参 */
export interface DashboardProps {
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

/** TaskList 组件入参 */
export interface TaskListProps {
  /** 全部任务 */
  tasks: readonly Task[];
  /** 当前查看的任务编号 */
  currentId: number | undefined;
  /** 可用行数，超出时折叠更早的任务 */
  maxListed: number;
}

/** ActionMenu 组件入参 */
export interface ActionMenuProps {
  /** 当前可用的操作 */
  actions: Action[];
  /** 光标所在操作的下标 */
  activeIndex: number;
}

/** OutputPanel 组件入参 */
export interface OutputPanelProps {
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

/** ScriptPicker 组件与 useScriptPicker hook 入参 */
export interface ScriptPickerProps {
  /** 全部脚本 */
  entries: ScriptEntry[];
  /** 选中脚本时回调；返回时传入 null */
  onSubmit: (entry: ScriptEntry | null) => void;
  /** 列表可见行数，随所在面板高度调整 */
  pageSize?: number;
  /** 每行可用列数；提供时光标行放不下的说明会滚动展示 */
  rowWidth?: number;
}

/** PickerRow 组件入参 */
export interface PickerRowProps {
  /** 脚本 */
  entry: ScriptEntry;
  /** 是否为光标所在行 */
  active: boolean;
  /** 脚本名列宽，用于对齐说明列 */
  width: number;
  /** 每行可用列数，未提供时不滚动 */
  rowWidth?: number;
}

/** ConfirmPrompt 组件入参 */
export interface ConfirmPromptProps {
  /** 提示文案 */
  message: string;
  /** 用户作答回调，仅输入 y 时为 true */
  onSubmit: (confirmed: boolean) => void;
}

/** Welcome 组件与 useWelcome hook 入参 */
export interface WelcomeProps {
  /** 按 Enter 进入任务界面 */
  onEnter: () => void;
  /** 按 Esc 或 Ctrl+C 退出 */
  onQuit: () => void;
}

/** useDashboard hook 返回值类型 */
export interface UseDashboardReturn {
  /** 全部任务 */
  tasks: readonly Task[];
  /** 当前查看的任务 */
  current: Task | undefined;
  /** 当前任务下标，没有任务时为 -1 */
  currentIndex: number;
  /** 下方操作区模式 */
  mode: Mode;
  /** 当前可用的操作 */
  actions: Action[];
  /** 光标所在操作的下标 */
  actionIndex: number;
  /** 翻看时固定的起始行 */
  anchor: number | null;
  /** 终端列数 */
  columns: number;
  /** 各区域尺寸 */
  layout: DashboardLayout;
  /** 选择器选中或返回 */
  handlePick: (entry: ScriptEntry | null) => void;
  /** 危险脚本确认作答 */
  handleConfirmRun: (confirmed: boolean) => void;
  /** 退出确认作答 */
  handleConfirmQuit: (confirmed: boolean) => void;
}

/** useScriptPicker hook 返回值类型 */
export interface UseScriptPickerReturn {
  /** 当前输入的关键词 */
  query: string;
  /** 光标所在的脚本 */
  activeEntry: ScriptEntry | undefined;
  /** 当前窗口内可见的脚本 */
  visible: ScriptEntry[];
  /** 脚本名列宽 */
  width: number;
  /** 窗口外剩余的匹配数 */
  remaining: number;
  /** 是否没有任何匹配 */
  empty: boolean;
}

/** useWelcome hook 返回值类型 */
export interface UseWelcomeReturn {
  /** 终端列数 */
  columns: number;
  /** 终端行数 */
  rows: number;
}

/** useWelcomeGate hook 返回值类型 */
export interface UseWelcomeGateReturn {
  /** 是否已离开欢迎界面 */
  entered: boolean;
  /** 进入任务界面 */
  enter: () => void;
}

/** usePickerRow hook 返回值类型 */
export interface UsePickerRowReturn {
  /** 危险标记文案，非危险脚本为空字符串 */
  tag: string;
  /** 当前展示的说明，光标行放不下时为滚动中的片段 */
  description: string;
}
