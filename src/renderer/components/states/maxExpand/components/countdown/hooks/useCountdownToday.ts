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
 * @file useCountdownToday.ts
 * @description 日历日期更新：跨午夜及窗口恢复时刷新所有计时展示。
 * @author 鸡哥
 */

import { useEffect, useState } from 'react';
import { toLocalDateStr } from '../utils/countdownUtils';

/**
 * 订阅本地日期变化，避免常驻展开页面跨天后保留旧天数。
 * @returns 当天本地午夜
 */
export function useCountdownToday(): Date {
  const [date, setDate] = useState(() => toLocalDateStr(new Date()));
  useEffect(() => {
    const refresh = (): void => setDate(toLocalDateStr(new Date()));
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return new Date(`${date}T00:00:00`);
}
