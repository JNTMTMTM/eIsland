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
 * @file smtcField.tsx
 * @description SMTC 测试界面中的单个字段行
 * @author 鸡哥
 */

import { Text } from 'ink';

import { SMTC_LABEL_WIDTH } from '../config/uiConfig';
import { padDisplay } from '../utils/uiUtils';
import { t } from '../../core/i18n';

import type { SmtcFieldProps } from '../types/uiTypes';

/**
 * 字段行
 * @param props - 字段行入参
 * @param props.label - 字段名
 * @param props.value - 字段值
 * @param props.color - 字段值颜色
 * @returns 标签对齐的单行文本
 */
export default function SmtcField({ label, value, color }: SmtcFieldProps): React.JSX.Element {
  return (
    <Text wrap="truncate-end">
      <Text dimColor>{padDisplay(label, SMTC_LABEL_WIDTH)}</Text>
      {value ? <Text color={color}>{value}</Text> : <Text dimColor>{t('devCli.localTest.smtc.unknown')}</Text>}
    </Text>
  );
}
