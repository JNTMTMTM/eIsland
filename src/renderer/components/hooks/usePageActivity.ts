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
 * @file usePageActivity.ts
 * @description 隐藏页面暂停 CSS 动画。
 * @author 鸡哥
 */

import { useEffect } from 'react';
import '../../styles/runtimeVisibility.css';

/** 用页面可见性暂停不可见界面的 CSS 动画。 */
export default function usePageActivity(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = (): void => {
      document.documentElement?.classList?.toggle('eisland-page-hidden', document.hidden);
    };
    document.addEventListener?.('visibilitychange', update);
    update();
    return () => {
      document.removeEventListener?.('visibilitychange', update);
      document.documentElement?.classList?.remove('eisland-page-hidden');
    };
  }, []);
}
