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
import type { SmtcSession } from '../../core/smtc';
import type { StoreEntry, StoreSnapshot } from '../../core/storage';
import type { Task, TaskManager } from '../../core/taskManager';

/** 交互模式的界面：主菜单、仓库管理、本机测试 */
export type Screen = 'menu' | 'repo' | 'localTest';

/** 主菜单中可进入的功能 */
export type MenuEntry = Exclude<Screen, 'menu'>;

/** 本机测试列表项：测试项或返回主菜单 */
export type LocalTestItem = 'smtc' | 'storage' | 'menu';

/** SMTC 读取状态 */
export type SmtcState = 'loading' | 'ready' | 'unsupported' | 'error';

/** 存储值的类型 */
export type StoreValueType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';

/** 删除存储项的结果 */
export interface StorageNotice {
  /** deleted 删除成功；failed 删除失败 */
  kind: 'deleted' | 'failed';
  /** 被删除的存储键名 */
  key: string;
  /** 失败原因，成功时为空字符串 */
  error: string;
}

/** 本地存储界面各区域的可用行数 */
export interface StorageLayout {
  /** 键名列表可见行数 */
  listRows: number;
  /** 详情中 JSON 内容可见行数 */
  detailRows: number;
}

/** 带推算播放位置的媒体会话 */
export interface SmtcEntry {
  /** 媒体会话 */
  session: SmtcSession;
  /** 按经过时间推算的当前播放位置（秒） */
  position: number;
}

/** 下方操作区当前所处的交互模式 */
export type Mode =
  | { kind: 'actions' }
  | { kind: 'picker'; entries: ScriptEntry[] }
  | { kind: 'confirmRun'; entry: ScriptEntry }
  | { kind: 'confirmQuit'; running: number }
  | { kind: 'quitting' };

/** 操作列表项 */
export type Action = 'run' | 'stop' | 'close' | 'menu' | 'quit';

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

/** Dashboard 组件入参 */
export interface RepoDashboardProps extends DashboardProps {
  /** 返回主菜单，运行中的任务继续保留 */
  onBack: () => void;
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
  /** 任务管理器，退出前用于确认是否仍有运行中的任务 */
  manager: TaskManager;
  /** 选中主菜单项时回调 */
  onSelect: (entry: MenuEntry) => void;
  /** 按 Esc 或 Ctrl+C 并确认后退出 */
  onQuit: () => void;
}

/** LocalTest 组件与 useLocalTest hook 入参 */
export interface LocalTestProps {
  /** 仓库根目录，用于加载测试依赖的插件 */
  root: string;
  /** 返回主菜单 */
  onBack: () => void;
}

/** SmtcSessionInfo 组件入参 */
export interface SmtcSessionInfoProps {
  /** 带推算播放位置的媒体会话 */
  entry: SmtcEntry;
  /** 会话序号，从 1 开始 */
  index: number;
}

/** SmtcField 组件入参 */
export interface SmtcFieldProps {
  /** 字段名 */
  label: string;
  /** 字段值，为空时显示未提供 */
  value: string;
  /** 字段值颜色 */
  color?: string;
}

/** StorageView 组件与 useStorage hook 入参 */
export interface StorageViewProps {
  /** 返回本机测试列表 */
  onBack: () => void;
}

/** StorageList 组件入参 */
export interface StorageListProps {
  /** 当前窗口内可见的存储项 */
  visible: StoreEntry[];
  /** 光标所在的存储项 */
  activeEntry: StoreEntry | undefined;
}

/** StorageStatus 组件入参 */
export interface StorageStatusProps {
  /** 等待确认删除的存储键名 */
  pendingKey: string | null;
  /** 最近一次删除的结果 */
  notice: StorageNotice | null;
}

/** StorageDetail 组件入参 */
export interface StorageDetailProps {
  /** 光标所在的存储项 */
  entry: StoreEntry;
  /** 当前可见的 JSON 行，以绝对行号标识 */
  lines: OutputRow[];
  /** 可见行之外剩余的行数 */
  remaining: number;
}

/** SmtcView 组件与 useSmtc hook 入参 */
export interface SmtcViewProps {
  /** 仓库根目录，用于加载 SMTC 插件 */
  root: string;
  /** 返回本机测试列表 */
  onBack: () => void;
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
  /** 光标所在的菜单项下标 */
  activeIndex: number;
  /** 等待退出确认时为运行中的任务数，否则为 null */
  confirmQuit: number | null;
  /** 退出确认作答回调 */
  handleConfirmQuit: (confirmed: boolean) => void;
}

/** useAppScreen hook 返回值类型 */
export interface UseAppScreenReturn {
  /** 当前界面 */
  screen: Screen;
  /** 进入主菜单项对应的界面 */
  open: (entry: MenuEntry) => void;
  /** 返回主菜单 */
  back: () => void;
}

/** useLocalTest hook 返回值类型 */
export interface UseLocalTestReturn {
  /** 终端列数 */
  columns: number;
  /** 终端行数 */
  rows: number;
  /** 光标所在的列表项下标 */
  activeIndex: number;
  /** 正在运行的测试项，未运行时为 null */
  running: Exclude<LocalTestItem, 'menu'> | null;
  /** 结束测试并回到列表 */
  closeTest: () => void;
}

/** useSmtc hook 返回值类型 */
export interface UseSmtcReturn {
  /** 终端列数 */
  columns: number;
  /** 终端行数 */
  rows: number;
  /** 读取状态 */
  state: SmtcState;
  /** 全部媒体会话 */
  entries: SmtcEntry[];
  /** 读取失败原因 */
  error: string;
}

/** usePickerRow hook 返回值类型 */
export interface UsePickerRowReturn {
  /** 危险标记文案，非危险脚本为空字符串 */
  tag: string;
  /** 当前展示的说明，光标行放不下时为滚动中的片段 */
  description: string;
}

/** useStorage hook 返回值类型 */
export interface UseStorageReturn {
  /** 终端列数 */
  columns: number;
  /** 终端行数 */
  rows: number;
  /** 存储目录 */
  dir: string;
  /** 最近一次读取结果 */
  snapshot: StoreSnapshot;
  /** 当前窗口内可见的存储项 */
  visible: StoreEntry[];
  /** 光标所在的存储项 */
  activeEntry: StoreEntry | undefined;
  /** 详情中当前可见的 JSON 行，以绝对行号标识 */
  lines: OutputRow[];
  /** 详情可见行之外剩余的行数 */
  remaining: number;
  /** 等待确认删除的存储键名，未在确认时为 null */
  pendingKey: string | null;
  /** 最近一次删除的结果，按下其他键后清除 */
  notice: StorageNotice | null;
}
