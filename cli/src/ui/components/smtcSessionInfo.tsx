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
 * @file smtcSessionInfo.tsx
 * @description SMTC 测试界面中的单个媒体会话：来源应用、播放状态、字段与播放进度
 * @author 鸡哥
 */

import { Box, Text } from 'ink';

import { SMTC_PROGRESS_WIDTH, SMTC_STATUS_COLOR } from '../config/uiConfig';
import { formatDuration, progressBar } from '../utils/uiUtils';
import { t } from '../../core/i18n';
import SmtcField from './smtcField';

import type { SmtcSessionInfoProps } from '../types/uiTypes';

/**
 * 单个媒体会话
 * @description 应用未提供时间线（总时长为 0）时不绘制进度条
 * @param props - 会话信息入参
 * @param props.entry - 带推算播放位置的媒体会话
 * @param props.index - 会话序号
 * @returns 会话标题行与字段列表
 */
export default function SmtcSessionInfo({ entry, index }: SmtcSessionInfoProps): React.JSX.Element {
  const { session, position } = entry;
  const progress = session.duration > 0
    ? `${progressBar(position, session.duration, SMTC_PROGRESS_WIDTH)} ${formatDuration(position)} / ${formatDuration(session.duration)}`
    : t('devCli.localTest.smtc.noTimeline');
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text wrap="truncate-end">
        <Text dimColor>{`#${index} `}</Text>
        <Text bold>{session.app || t('devCli.localTest.smtc.unknown')}</Text>
        <Text color={SMTC_STATUS_COLOR[session.status] ?? 'gray'}>{`  ${t(`devCli.localTest.smtc.status.${session.status}`)}`}</Text>
      </Text>
      <Box flexDirection="column" paddingLeft={2}>
        <SmtcField label={t('devCli.localTest.smtc.fields.title')} value={session.title} color="cyan" />
        <SmtcField label={t('devCli.localTest.smtc.fields.artist')} value={session.artist} />
        <SmtcField label={t('devCli.localTest.smtc.fields.album')} value={session.album} />
        <SmtcField label={t('devCli.localTest.smtc.fields.progress')} value={progress} />
      </Box>
    </Box>
  );
}
