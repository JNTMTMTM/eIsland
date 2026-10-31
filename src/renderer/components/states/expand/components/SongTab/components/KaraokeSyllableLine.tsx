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
 * @file KaraokeSyllableLine.tsx
 * @description 当前歌词行逐字扫光，移植自 lyricify-lyrics-provider-rs 的音节时间模型，每个音节以 `--syl-prog` 控制渐变。
 * @author 鸡哥
 */

import { getSyllableProgress } from '../utils/songUtils';
import type { CSSProperties, ReactElement } from 'react';
import type { KaraokeSyllableLineProps } from '../types/songTypes';

/**
 * 当前行逐字扫光渲染 — 按音节真实 start/duration 计算每个音节独立进度
 * @param props - 组件入参
 * @param props.syllables - 音节数组(相对偏移 + 持续时长)
 * @param props.lineStartMs - 行起始绝对毫秒
 * @param props.posMs - 当前播放位置(绝对毫秒)
 * @returns 音节片段
 */
export function KaraokeSyllableLine({
  syllables,
  lineStartMs,
  posMs,
}: KaraokeSyllableLineProps): ReactElement {
  return (
    <>
      {syllables.map((syl, i) => {
        const prog = getSyllableProgress(syl, lineStartMs, posMs);
        return (
          <span
            key={i}
            className="ov-lrc-syllable"
            style={{ '--syl-prog': `${(prog * 100).toFixed(2)}%` } as CSSProperties}
          >
            {syl.text}
          </span>
        );
      })}
    </>
  );
}
