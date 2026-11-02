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
 * @file useSmtc.ts
 * @description SMTC 测试的插件监控生命周期、全部会话的实时状态与返回按键
 * @author 鸡哥
 */

import { useInput, useWindowSize } from 'ink';
import { useEffect, useState } from 'react';

import { FALLBACK_ROWS } from '../config/uiConfig';
import { livePosition } from '../utils/uiUtils';
import { isSmtcSupported, watchSmtc } from '../../core/smtc';

import type { SmtcState, SmtcViewProps, UseSmtcReturn } from '../types/uiTypes';
import type { SmtcSession } from '../../core/smtc';

/** 最近一次读取结果与接收时刻 */
interface Reading {
  /** 全部媒体会话 */
  sessions: SmtcSession[];
  /** 接收时刻（Unix 毫秒） */
  receivedAt: number;
}

/**
 * 进入测试时启动插件监控，离开时停止
 * @param props - SMTC 测试入参
 * @param props.root - 仓库根目录
 * @param props.onBack - 返回本机测试列表回调
 * @returns 终端尺寸、读取状态与带推算播放位置的全部会话
 */
export default function useSmtc({ root, onBack }: SmtcViewProps): UseSmtcReturn {
  const { columns, rows } = useWindowSize();
  const supported = isSmtcSupported();
  const [state, setState] = useState<SmtcState>(supported ? 'loading' : 'unsupported');
  const [reading, setReading] = useState<Reading>({ sessions: [], receivedAt: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supported) return undefined;
    const watcher = watchSmtc(root, (sessions) => {
      setReading({ sessions, receivedAt: Date.now() });
      setState('ready');
    }, (message) => {
      setError(message);
      setState('error');
    });
    return watcher.stop;
  }, [root, supported]);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) onBack();
  });

  return {
    columns,
    state,
    error,
    rows: rows || FALLBACK_ROWS,
    entries: reading.sessions.map((session) => ({ session, position: livePosition(session, reading.receivedAt) })),
  };
}
