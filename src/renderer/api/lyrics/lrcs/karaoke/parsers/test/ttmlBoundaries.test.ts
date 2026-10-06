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
 * @file ttmlBoundaries.test.ts
 * @description TTML 真实解析器的逐字时间、缺失属性、空文本、排序与行级边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseTTML } from '../ttml';

describe('real TTML syllable parser', () => {
  it.each([
    ['', []],
    ['<tt><p>plain</p></tt>', []],
    ['<tt><span></span></tt>', []],
    ['<p nd="00:02.00"><span nd="00:02.00">Hello</span></p>', []],
    ['<p in="00:01.00"><span in="00:01.00">Hello</span></p>', []],
    ['<p in="00:01.00 nd=00:02.00><span>Hello</span></p>', []],
  ])('handles absent line attributes in %s', (raw, expected) => {
    expect(parseTTML(raw)).toEqual(expected);
  });

  it('returns exact syllable offsets with hour and minute timestamps in sorted order', () => {
    const raw = '<p in="01:00:02.00" nd="01:00:04.00"><span in="01:00:02.50" nd="01:00:03.00">Late</span></p>'
      + '<p in="00:01.00" nd="00:03.00"><span in="00:01.00" nd="00:02.00">你</span><span in="00:02.00" nd="00:03.00">好</span></p>';
    expect(parseTTML(raw)).toEqual([
      { time_ms: 1000, duration_ms: 2000, text: '你好', syllables: [
        { start_offset_ms: 0, duration_ms: 1000, text: '你' },
        { start_offset_ms: 1000, duration_ms: 1000, text: '好' },
      ] },
      { time_ms: 3602000, duration_ms: 2000, text: 'Late', syllables: [{ start_offset_ms: 500, duration_ms: 500, text: 'Late' }] },
    ]);
  });

  it('ignores empty or incomplete syllables without discarding the valid line', () => {
    const raw = '<p in="00:01.00" nd="00:02.00">'
      + '<span in="00:01.00" nd="00:02.00"></span>'
      + '<span nd="00:02.00">no-start</span>'
      + '<span in="00:01.00">no-end</span>'
      + '<span in="00:01.00" nd="00:02.00">Hello</span></p>';
    expect(parseTTML(raw)).toEqual([{ time_ms: 1000, duration_ms: 1000, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 1000, text: 'Hello' }] }]);
  });

  it('clamps negative line durations, offsets and syllable durations to zero', () => {
    expect(parseTTML('<p in="00:02.00" nd="00:01.00"><span in="00:01.00" nd="00:00.50">Hello</span></p>')).toEqual([
      { time_ms: 2000, duration_ms: 0, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 0, text: 'Hello' }] },
    ]);
  });

  it('uses the existing zero-time fallback for an unsupported one-part time', () => {
    expect(parseTTML('<p in="1" nd="2"><span in="1" nd="2">Hello</span></p>')).toEqual([
      { time_ms: 0, duration_ms: 0, text: 'Hello', syllables: [{ start_offset_ms: 0, duration_ms: 0, text: 'Hello' }] },
    ]);
  });
});

describe('real TTML word-level parser', () => {
  it('pairs timestamps and text, sorts lines and clamps reverse intervals', () => {
    const raw = '<tt><body><div><p in="00:00:05.00" nd="00:00:04.00"> Later </p>'
      + '<p in="00:00:01.00" nd="00:00:03.00"> First </p></div></body></tt>';
    expect(parseTTML(raw)).toEqual([
      { time_ms: 1000, duration_ms: 2000, text: 'First', syllables: [] },
      { time_ms: 5000, duration_ms: 0, text: 'Later', syllables: [] },
    ]);
  });

  it.each(['<div></div>', '<div>   <p>   </p></div>', '<div><p in="00:00:01.00">odd</p></div>'])('returns no line without a complete timestamp pair in %s', (raw) => {
    expect(parseTTML(raw)).toEqual([]);
  });

  it('limits output to the number of nonempty text values', () => {
    expect(parseTTML('<div><p in="00:00:01.00" nd="00:00:02.00">One</p><p in="00:00:03.00" nd="00:00:04.00"> </p></div>')).toEqual([
      { time_ms: 1000, duration_ms: 1000, text: 'One', syllables: [] },
    ]);
  });
});
