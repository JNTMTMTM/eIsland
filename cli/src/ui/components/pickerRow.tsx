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
 * @file pickerRow.tsx
 * @description 脚本选择器中的单个脚本行，危险标记在说明之前
 * @author 鸡哥
 */

import { Text } from 'ink';

import usePickerRow from '../hooks/usePickerRow';

import type { PickerRowProps } from '../types/uiTypes';

/**
 * 渲染单个脚本行，未翻译说明时回退展示原始命令
 * @param props - 列表行入参
 * @param props.entry - 脚本
 * @param props.active - 是否为光标所在行
 * @param props.width - 脚本名列宽
 * @param props.rowWidth - 每行可用列数
 * @returns 脚本行
 */
export default function PickerRow({ entry, active, width, rowWidth }: PickerRowProps): React.JSX.Element {
  const { tag, description } = usePickerRow({ entry, active, width, rowWidth });
  return (
    <Text color={active ? 'cyan' : undefined} wrap="truncate-end">
      {active ? '❯ ' : '  '}
      {entry.name.padEnd(width)}
      {'  '}
      {tag ? <Text color="red">{tag}</Text> : null}
      <Text dimColor={!active}>{description}</Text>
    </Text>
  );
}
