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
 * @file usePickerRow.ts
 * @description 脚本行展示内容：危险标记前置与光标行说明滚动
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import stringWidth from 'string-width';

import { MARQUEE_INTERVAL_MS, MARQUEE_PAUSE_TICKS } from '../config/uiConfig';
import { descriptionWidth, marqueeFrame } from '../utils/uiUtils';
import { describeScript, t } from '../../core/i18n';

import type { PickerRowProps, UsePickerRowReturn } from '../types/uiTypes';

/**
 * 计算脚本行的危险标记与说明
 * @description 危险标记放在说明最前面，避免被截断看不到；只有光标行在放不下时滚动，其余行截断
 * @param props - 列表行入参
 * @param props.entry - 脚本
 * @param props.active - 是否为光标所在行
 * @param props.width - 脚本名列宽
 * @param props.rowWidth - 每行可用列数
 * @returns 危险标记与当前展示的说明
 */
export default function usePickerRow({ entry, active, width, rowWidth }: PickerRowProps): UsePickerRowReturn {
  const [offset, setOffset] = useState(-MARQUEE_PAUSE_TICKS);
  const tag = entry.dangerous ? `[${t('devCli.list.dangerousTag')}] ` : '';
  const text = describeScript(entry.name) || entry.command;
  const available = rowWidth === undefined ? 0 : descriptionWidth(rowWidth, width, tag);
  const scrolling = active && available > 0 && stringWidth(text) > available;

  useEffect(() => {
    if (!scrolling) return undefined;
    const timer = setInterval(() => setOffset((value) => value + 1), MARQUEE_INTERVAL_MS);
    // 离开光标行后回到开头，下次选中时重新停留再滚动。
    return () => {
      clearInterval(timer);
      setOffset(-MARQUEE_PAUSE_TICKS);
    };
  }, [scrolling]);

  return { tag, description: scrolling ? marqueeFrame(text, available, offset) : text };
}
