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
 * @file memoConfig.ts
 * @description 备忘录模块常量与配置
 * @author 鸡哥
 */

import type { MemoViewMode } from '../types/memoTypes';

/** 存储键名（对应 userData/eIsland_store/memos.json） */
export const STORE_KEY = 'memos';

/** Markdown 语法高亮匹配模式 */
export const MARKDOWN_HIGHLIGHT_PATTERNS = [
  { className: 'memo-tab-markdown-token--code-block', pattern: /(```[\s\S]*?```)/g },
  { className: 'memo-tab-markdown-token--inline-code', pattern: /(`[^`\n]+`)/g },
  { className: 'memo-tab-markdown-token--heading', pattern: /(^|\n)(#{1,6}\s[^\n]*)/g },
  { className: 'memo-tab-markdown-token--strong', pattern: /(\*\*[^*\n]+\*\*|__[^_\n]+__)/g },
  { className: 'memo-tab-markdown-token--emphasis', pattern: /(\*[^*\n]+\*|_[^_\n]+_)/g },
  { className: 'memo-tab-markdown-token--link', pattern: /(\[[^\]\n]+\]\([^\)\n]+\))/g },
  { className: 'memo-tab-markdown-token--quote', pattern: /(^|\n)(>[^\n]*)/g },
  { className: 'memo-tab-markdown-token--list', pattern: /(^|\n)(\s*(?:[-*+]\s|\d+\.\s)[^\n]*)/g },
] as const;

/** 视图模式配置（i18n key + 默认值） */
export const VIEW_MODE_CONFIGS: Array<{ id: MemoViewMode; key: string; defaultValue: string }> = [
  { id: 'edit', key: 'maxExpand.memo.editMode', defaultValue: '编辑' },
  { id: 'preview', key: 'maxExpand.memo.previewMode', defaultValue: '预览' },
  { id: 'split', key: 'maxExpand.memo.splitMode', defaultValue: '分屏' },
];
