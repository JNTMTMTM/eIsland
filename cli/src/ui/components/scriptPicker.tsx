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
 * @description 可输入关键词实时过滤的脚本选择器，嵌入任务界面操作区
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import useScriptPicker from '../hooks/useScriptPicker';
import { t } from '../../core/i18n';
import PickerRow from './pickerRow';

import type { ScriptPickerProps } from '../types/uiTypes';

/**
 * 脚本选择器
 * @param props - 选择器入参
 * @param props.entries - 全部脚本
 * @param props.onSubmit - 选中或返回时的回调
 * @param props.pageSize - 列表可见行数
 * @param props.rowWidth - 每行可用列数
 * @returns 选择器界面
 */
export default function ScriptPicker({
  entries, onSubmit, pageSize, rowWidth,
}: ScriptPickerProps): React.JSX.Element {
  const { query, activeEntry, visible, width, remaining, empty } = useScriptPicker({ entries, onSubmit, pageSize });
  return (
    <Box flexDirection="column">
      <Text wrap="truncate-end">
        <Text color="cyan">? </Text>
        {`${t('devCli.picker.prompt')}: `}
        <Text bold>{query}</Text>
        <Text dimColor>▏</Text>
      </Text>
      {visible.map((entry) => (
        <PickerRow key={entry.name} entry={entry} active={entry === activeEntry} width={width} rowWidth={rowWidth} />
      ))}
      {empty ? <Text dimColor>{t('devCli.picker.empty')}</Text> : null}
      {remaining > 0 ? <Text dimColor>{t('devCli.picker.more', { count: remaining })}</Text> : null}
      <Text dimColor wrap="wrap">{t('devCli.picker.hint')}</Text>
    </Box>
  );
}
