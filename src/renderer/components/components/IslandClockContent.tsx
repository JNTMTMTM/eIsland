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
 * @file IslandClockContent.tsx
 * @description 将时钟刷新限制在可见的时间内容内。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../store/isLandStore';
import { useIslandTimeStrings } from '../hooks/useIslandTimeStrings';
import { IdleContent } from '../states/idle';
import type { IdleContentProps } from '../states/idle/config/idleConfig';
import { HoverContent } from '../states/hover';

/** 仅在待机内容内部按分钟刷新时钟。 */
export function IdleClockContent(props: Omit<IdleContentProps, 'timeStr' | 'dayStr'>): ReactElement {
  const { t, i18n } = useTranslation();
  const { timeStr, dayStr } = useIslandTimeStrings({ t, language: i18n.resolvedLanguage, precision: 'minute' });
  return <IdleContent timeStr={timeStr} dayStr={dayStr} weather={props.weather}
    timerState={props.timerState} remainingSeconds={props.remainingSeconds}
    pomodoroRunning={props.pomodoroRunning} pomodoroRemaining={props.pomodoroRemaining} />;
}

/** 仅悬停时间页需要秒级更新，其余页面没有时钟唤醒。 */
export function HoverClockContent(): ReactElement {
  const { t, i18n } = useTranslation();
  const hoverTab = useIslandStore((store) => store.hoverTab);
  const { fullTimeStr, lunarStr } = useIslandTimeStrings({ t, language: i18n.resolvedLanguage, enabled: hoverTab === 'time' });
  return <HoverContent fullTimeStr={fullTimeStr} lunarStr={lunarStr} />;
}
