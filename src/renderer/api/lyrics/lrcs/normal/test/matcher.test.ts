/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file matcher.test.ts
 * @description 歌词搜索评分器的多艺术家元数据匹配测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { bestMatch, scoreTrack } from '../matcher';
import type { SearchCandidate } from '../searchTypes';

const liveCandidate: SearchCandidate = {
  id: 'qishui-track',
  title: '猜不透 (Live版)',
  artists: ['赵磊', '张予曦'],
  album: '',
};

describe('lyrics matcher artist normalization', () => {
  it('splits Chinese enumeration punctuation in input artists', () => {
    const score = scoreTrack(
      { title: '猜不透（live）', artist: '赵磊, 张予曦' },
      liveCandidate,
    );

    expect(score).toBe(5);
    expect(bestMatch(
      { title: '猜不透（live）', artist: '赵磊, 张予曦' },
      [liveCandidate],
      5,
    )?.candidate.id).toBe('qishui-track');
  });

  it('splits provider artists joined with slashes', () => {
    const candidate = { ...liveCandidate, artists: ['赵磊 / 张予曦'] };

    expect(scoreTrack(
      { title: '猜不透（live）', artist: '赵磊，张予曦' },
      candidate,
    )).toBe(5);
  });
});