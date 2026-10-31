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
 * @file CliStateLyric.tsx
 * @description CLI 状态底部同步显示的当前歌词行，开启逐字扫光时按音节渲染；调用方以行索引作 key，换行时重播进入动画。
 * @author 鸡哥
 */

import { KaraokeSyllableLine } from '../../lyrics/components/KaraokeSyllableLine';
import type { ReactElement } from 'react';
import type { CliStateLyricProps } from '../types/cliTypes';

/**
 * 渲染当前歌词行。
 * @param props - 组件入参
 * @param props.currentLine - 当前行
 * @param props.currentText - 当前行文本
 * @param props.hasSyllables - 当前行是否有音节数据
 * @param props.karaokeEnabled - 是否开启逐字扫光
 * @param props.currentPositionMs - 播放位置
 * @returns 歌词行
 */
export function CliStateLyric({
  currentLine,
  currentText,
  hasSyllables,
  karaokeEnabled,
  currentPositionMs,
}: CliStateLyricProps): ReactElement {
  return (
    <span className={`cli-state-lyric${karaokeEnabled && hasSyllables ? ' cli-state-lyric-karaoke' : ''}`}>
      {karaokeEnabled && hasSyllables && currentLine ? (
        <KaraokeSyllableLine
          syllables={currentLine.syllables!}
          lineStartMs={currentLine.time_ms}
          posMs={currentPositionMs}
        />
      ) : (
        currentText
      )}
    </span>
  );
}
