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
 * @description SMTC 测试界面中的媒体会话字段与播放进度
 * @author 鸡哥
 */

import { Box } from 'ink';

import { SMTC_PROGRESS_WIDTH, SMTC_STATUS_COLOR } from '../config/uiConfig';
import { formatDuration, progressBar } from '../utils/uiUtils';
import { t } from '../../core/i18n';
import SmtcField from './smtcField';

import type { SmtcSessionInfoProps } from '../types/uiTypes';

/**
 * 媒体会话信息
 * @description 应用未提供时间线（总时长为 0）时不绘制进度条
 * @param props - 会话信息入参
 * @param props.session - 媒体会话
 * @param props.position - 推算的当前播放位置
 * @returns 字段列表
 */
export default function SmtcSessionInfo({ session, position }: SmtcSessionInfoProps): React.JSX.Element {
  const status = t(`devCli.localTest.smtc.status.${session.status.toLowerCase()}`, { defaultValue: session.status });
  const progress = session.duration > 0
    ? `${progressBar(position, session.duration, SMTC_PROGRESS_WIDTH)} ${formatDuration(position)} / ${formatDuration(session.duration)}`
    : t('devCli.localTest.smtc.noTimeline');
  return (
    <Box flexDirection="column">
      <SmtcField label={t('devCli.localTest.smtc.fields.title')} value={session.title} color="cyan" />
      <SmtcField label={t('devCli.localTest.smtc.fields.artist')} value={session.artist} />
      <SmtcField label={t('devCli.localTest.smtc.fields.album')} value={session.album} />
      <SmtcField label={t('devCli.localTest.smtc.fields.status')} value={status} color={SMTC_STATUS_COLOR[session.status] ?? 'gray'} />
      <SmtcField label={t('devCli.localTest.smtc.fields.progress')} value={progress} />
      <SmtcField label={t('devCli.localTest.smtc.fields.app')} value={session.app} />
    </Box>
  );
}
