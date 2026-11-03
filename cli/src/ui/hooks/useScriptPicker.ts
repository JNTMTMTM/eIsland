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
 * @file useScriptPicker.ts
 * @description 脚本选择器状态：关键词过滤、光标移动、窗口滚动与键盘交互
 * @author 鸡哥
 */

import { useInput } from 'ink';
import { useMemo, useState } from 'react';

import { DEFAULT_PAGE_SIZE } from '../config/uiConfig';
import { pickerWindowStart } from '../utils/uiUtils';
import { describeScript } from '../../core/i18n';
import { filterScripts } from '../../core/scripts';

import type { ScriptPickerProps, UseScriptPickerReturn } from '../types/uiTypes';

/**
 * 管理脚本选择器的过滤与键盘交互
 * @description 输入字符过滤，↑↓ 移动光标，Enter 选中，Esc 或 Ctrl+C 返回
 * @param props - 选择器入参
 * @param props.entries - 全部脚本
 * @param props.onSubmit - 选中或返回时的回调
 * @param props.pageSize - 列表可见行数，默认 DEFAULT_PAGE_SIZE（12）
 * @returns 渲染选择器所需的状态
 */
export default function useScriptPicker({ entries, onSubmit, pageSize = DEFAULT_PAGE_SIZE }: ScriptPickerProps): UseScriptPickerReturn {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const matches = useMemo(() => filterScripts(entries, query, describeScript), [entries, query]);
  const index = Math.min(cursor, Math.max(matches.length - 1, 0));
  const start = pickerWindowStart(index, matches.length, pageSize);
  const visible = matches.slice(start, start + pageSize);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onSubmit(null);
    } else if (key.return) {
      if (matches[index]) onSubmit(matches[index]);
    } else if (key.upArrow) {
      setCursor(Math.max(index - 1, 0));
    } else if (key.downArrow) {
      setCursor(Math.min(index + 1, matches.length - 1));
    } else if (key.backspace || key.delete) {
      // Windows 终端常将退格键上报为 delete，两者均按删除末尾字符处理。
      setQuery((value) => value.slice(0, -1));
      setCursor(0);
    } else if (input && !key.ctrl && !key.meta && !key.tab) {
      setQuery((value) => value + input);
      setCursor(0);
    }
  });

  return {
    query,
    visible,
    activeEntry: matches[index],
    width: Math.max(0, ...visible.map((entry) => entry.name.length)),
    remaining: matches.length - visible.length,
    empty: matches.length === 0,
  };
}
