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
 * @file scriptPicker.tsx
 * @description 可输入关键词实时过滤的脚本选择器，嵌入分栏界面右侧
 * @author 鸡哥
 */

import { Box, Text, useInput } from 'ink';
import { useMemo, useState } from 'react';

import { describeScript, t } from '../core/i18n';
import { filterScripts } from '../core/scripts';

import type { ScriptEntry } from '../core/scripts';

// 脚本数量远超一屏，固定窗口高度并随光标滚动。
const DEFAULT_PAGE_SIZE = 12;

/** 选择器属性 */
interface ScriptPickerProps {
  /** 全部脚本 */
  entries: ScriptEntry[];
  /** 选中脚本时回调；返回时传入 null */
  onSubmit: (entry: ScriptEntry | null) => void;
  /** 列表可见行数，随所在面板高度调整 */
  pageSize?: number;
}

/** 列表行属性 */
interface PickerRowProps {
  /** 脚本 */
  entry: ScriptEntry;
  /** 是否为光标所在行 */
  active: boolean;
  /** 脚本名列宽，用于对齐说明列 */
  width: number;
}

/**
 * 渲染单个脚本行，未翻译说明时回退展示原始命令
 * @param props - 列表行属性
 * @param props.entry - 脚本
 * @param props.active - 是否为光标所在行
 * @param props.width - 脚本名列宽
 * @returns 脚本行
 */
function PickerRow({ entry, active, width }: PickerRowProps): React.JSX.Element {
  const description = describeScript(entry.name) || entry.command;
  return (
    <Text color={active ? 'cyan' : undefined} wrap="truncate-end">
      {active ? '❯ ' : '  '}
      {entry.name.padEnd(width)}
      {'  '}
      <Text dimColor={!active}>{description}</Text>
      {entry.dangerous ? <Text color="red">{` [${t('list.dangerousTag')}]`}</Text> : null}
    </Text>
  );
}

/**
 * 脚本选择器
 * @description 输入字符过滤，↑↓ 移动光标，Enter 选中，Esc 或 Ctrl+C 返回
 * @param props - 选择器属性
 * @param props.entries - 全部脚本
 * @param props.onSubmit - 选中或返回时的回调
 * @param props.pageSize - 列表可见行数
 * @returns 选择器界面
 */
export default function ScriptPicker({ entries, onSubmit, pageSize = DEFAULT_PAGE_SIZE }: ScriptPickerProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const matches = useMemo(() => filterScripts(entries, query, describeScript), [entries, query]);
  const index = Math.min(cursor, Math.max(matches.length - 1, 0));
  const start = Math.max(0, Math.min(index - Math.floor(pageSize / 2), matches.length - pageSize));
  const visible = matches.slice(start, start + pageSize);
  const width = Math.max(0, ...visible.map((entry) => entry.name.length));
  const remaining = matches.length - visible.length;

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

  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        <Text color="cyan">? </Text>
        {`${t('picker.prompt')}: `}
        <Text bold>{query}</Text>
        <Text dimColor>▏</Text>
      </Text>
      {visible.map((entry) => (
        <PickerRow key={entry.name} entry={entry} active={entry === matches[index]} width={width} />
      ))}
      {matches.length === 0 ? <Text dimColor>{t('picker.empty')}</Text> : null}
      {remaining > 0 ? <Text dimColor>{t('picker.more', { count: remaining })}</Text> : null}
      <Text dimColor wrap="wrap">{t('picker.hint')}</Text>
    </Box>
  );
}
