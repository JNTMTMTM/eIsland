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
 * @file uiConfig.ts
 * @description 交互界面的布局常量、状态样式与欢迎字符画
 * @author 鸡哥
 */

import type {
  LocalTestItem, LogoLine, MenuEntry, StatusStyle,
} from '../types/uiTypes';
import type { SmtcStatus } from '../../core/smtc';
import type { TaskStatus } from '../../core/taskManager';

export const STATUS_STYLE: Record<TaskStatus, StatusStyle> = {
  running: { mark: '●', color: 'yellow' },
  succeeded: { mark: '✔', color: 'green' },
  failed: { mark: '✖', color: 'red' },
  killed: { mark: '■', color: 'gray' },
};

// 下方操作区占屏幕高度的比例与下限，保证选择器至少能展示几行脚本。
export const BOTTOM_RATIO = 0.4;
export const MIN_BOTTOM_ROWS = 10;
// 任务框固定宽度，不随终端变宽，其余宽度留给操作与脚本选择器。
export const TASK_BOX_WIDTH = 32;
// ink-testing-library 等非终端输出流不提供 rows。
export const FALLBACK_ROWS = 24;
// 输出面板的上下边框与标题行。
export const OUTPUT_CHROME_ROWS = 3;
// 任务框与操作框各自的上下边框（并排共用两行）与底部按键提示。
export const BOTTOM_CHROME_ROWS = 3;
// 选择器除列表外的行：输入框、剩余条数、可能折行的提示。
export const PICKER_CHROME_ROWS = 4;
// 脚本数量远超一屏，选择器固定窗口高度并随光标滚动。
export const DEFAULT_PAGE_SIZE = 12;
// 操作框左右边框与内边距占用的列数。
export const ACTION_BOX_CHROME_COLUMNS = 4;
// 脚本行说明列之前的列：光标标记与脚本名后的间隔。
export const PICKER_ROW_CHROME_COLUMNS = 4;
// 说明滚动的步进间隔、首次滚动前停留的步数与首尾衔接的空白。
export const MARQUEE_INTERVAL_MS = 250;
export const MARQUEE_PAUSE_TICKS = 4;
export const MARQUEE_GAP = '   ';

// 主菜单功能顺序：仓库管理为 CLI 的第一个功能。
export const MENU_ENTRIES: readonly MenuEntry[] = ['repo', 'localTest'];
// 本机测试列表，末尾固定为返回主菜单。
export const LOCAL_TEST_ITEMS: readonly LocalTestItem[] = ['smtc', 'storage', 'menu'];
// 本机测试与主菜单列表项的名称列宽，用于对齐说明。
export const MENU_LABEL_WIDTH = 12;
// SMTC 信息标签列宽与播放进度条宽度。
export const SMTC_LABEL_WIDTH = 10;
export const SMTC_PROGRESS_WIDTH = 30;
// 本地存储界面的键名列表宽度。
export const STORAGE_LIST_WIDTH = 36;
// 本地存储界面除内容外的行：外框上下边框、标题、路径、按键提示与两个内框的上下边框。
export const STORAGE_CHROME_ROWS = 7;
// 详情中 JSON 之前的行：键名、类型与大小、遮蔽提示或空行；之后的剩余行数提示。
export const STORAGE_DETAIL_CHROME_ROWS = 4;
// 播放状态颜色，未列出的状态使用灰色。
export const SMTC_STATUS_COLOR: Readonly<Partial<Record<SmtcStatus, string>>> = { playing: 'green', paused: 'yellow' };

export const LOGO_LINES: readonly LogoLine[] = [
  { id: 'top', color: 'cyanBright', text: '███████╗██╗███████╗██╗      █████╗ ███╗   ██╗██████╗ ' },
  { id: 'upper', color: 'cyanBright', text: '██╔════╝██║██╔════╝██║     ██╔══██╗████╗  ██║██╔══██╗' },
  { id: 'middle', color: 'cyan', text: '█████╗  ██║███████╗██║     ███████║██╔██╗ ██║██║  ██║' },
  { id: 'lower', color: 'cyan', text: '██╔══╝  ██║╚════██║██║     ██╔══██║██║╚██╗██║██║  ██║' },
  { id: 'base', color: 'blueBright', text: '███████╗██║███████║███████╗██║  ██║██║ ╚████║██████╔╝' },
  { id: 'shadow', color: 'blue', text: '╚══════╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ' },
];
export const LOGO_WIDTH = LOGO_LINES[0].text.length;
