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
 * @file storageList.tsx
 * @description 本地存储测试界面中的键名列表
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import type { StorageListProps } from '../types/uiTypes';

/**
 * 键名列表
 * @description 解析失败的项标红，含遮蔽内容的项以黄色星号提示
 * @param props - 键名列表入参
 * @param props.visible - 当前窗口内可见的存储项
 * @param props.activeEntry - 光标所在的存储项
 * @returns 键名列表
 */
export default function StorageList({ visible, activeEntry }: StorageListProps): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {visible.map((entry) => (
        <Text key={entry.key} wrap="truncate-end" color={entry === activeEntry ? 'cyan' : undefined} bold={entry === activeEntry}>
          {entry === activeEntry ? '❯ ' : '  '}
          <Text color={entry.error ? 'red' : undefined}>{entry.key}</Text>
          {entry.masked ? <Text color="yellow"> *</Text> : null}
        </Text>
      ))}
    </Box>
  );
}
