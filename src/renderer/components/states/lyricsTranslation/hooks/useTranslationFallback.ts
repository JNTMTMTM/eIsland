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
 * @file useTranslationFallback.ts
 * @description 翻译歌词不可用时回退到普通歌词状态 Hook
 * @author 鸡哥
 */

import { useEffect } from 'react';
import type { LyricLine } from '../../../../api/lyrics/lrcApi';
import useIslandStore from '../../../../store/slices';

/**
 * 当翻译歌词行数组变为空时，自动回退到普通歌词状态。
 * @param translationLines - 翻译歌词行数组（null 表示不可用）。
 */
export function useTranslationFallback(translationLines: LyricLine[] | null): void {
  useEffect(() => {
    if (!translationLines || translationLines.length === 0) {
      useIslandStore.getState().setLyrics();
    }
  }, [translationLines]);
}
