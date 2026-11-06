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
 * @file parsers.test.ts
 * @description karaoke parsers 单元测试
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { parseSyncedLines, parseLRCAsKaraoke } from '../parsers';

describe('parseSyncedLines', () => {
  it.each(['prefix', 'suffix'] as const)('preserves punctuation and Unicode text in %s syllables', (mode) => {
    const texts = ['(Hello) <echo> [chorus] ', 'don\'t—stop! “好？”♪👩‍🎤 <3 & > = + / \\'];
    const tokens = ['(1000,500,0)', '<1500,600,0>'];
    const input = `[1000,3000]${texts.map((text, index) => mode === 'prefix' ? tokens[index] + text : text + tokens[index]).join('')}`;
    expect(parseSyncedLines(input, mode, 'absolute')).toEqual([{
      time_ms: 1000,
      duration_ms: 3000,
      text: texts.join(''),
      syllables: [
        { start_offset_ms: 0, duration_ms: 500, text: texts[0] },
        { start_offset_ms: 500, duration_ms: 600, text: texts[1] },
      ],
    }]);
  });

  it.each(['(', ')', '<', '>', '[', ']', '♪', '…', '—', "'", '！', '👩‍🎤'])('retains a timed symbol-only syllable %s', (symbol) => {
    expect(parseSyncedLines(`[1000,500](0,500)${symbol}`, 'prefix', 'relative')[0]).toEqual({
      time_ms: 1000, duration_ms: 500, text: symbol,
      syllables: [{ start_offset_ms: 0, duration_ms: 500, text: symbol }],
    });
  });

  it.each([
    { mode: 'prefix' as const, segment: '♪ (0,500)one (500,600)two!', texts: ['♪ one ', 'two!'] },
    { mode: 'suffix' as const, segment: 'one (0,500)two(500,600) ♪', texts: ['one ', 'two ♪'] },
  ])('keeps untimed edge text inside the rendered $mode syllables without shifting timings', ({ mode, segment, texts }) => {
    const [line] = parseSyncedLines(`[1000,2000]${segment}`, mode, 'relative');
    expect(line.text).toBe(texts.join(''));
    expect(line.syllables).toEqual([
      { start_offset_ms: 0, duration_ms: 500, text: texts[0] },
      { start_offset_ms: 500, duration_ms: 600, text: texts[1] },
    ]);
  });

  it('keeps ordinary brackets while retaining compact row boundaries and CRLF support', () => {
    const input = '[1000,500](0,500)A[echo]B[2000,500](0,500)C\r\n[3000,500](0,500)D[ending]';
    expect(parseSyncedLines(input, 'prefix', 'relative').map((line) => line.text)).toEqual(['A[echo]B', 'C', 'D[ending]']);
  });

  it('treats mismatched or nonnumeric timing-like brackets as literal text', () => {
    const text = '(0,500> <0,500) (word,500) (0,500,word)';
    expect(parseSyncedLines(`[1000,500](0,500)${text}`, 'prefix', 'relative')[0]).toEqual({
      text, time_ms: 1000, duration_ms: 500,
      syllables: [{ text, start_offset_ms: 0, duration_ms: 500 }],
    });
  });

  it.each([
    { segment: '“(0,500)Hello(500,500) world!”', texts: ['“Hello', ' world!”'] },
    { segment: '“Hello(0,500) world!(500,500)”', texts: ['“Hello', ' world!”'] },
  ])('chooses auto timing layout before attaching edge punctuation in $segment', ({ segment, texts }) => {
    const [line] = parseSyncedLines(`[1000,1000]${segment}`, 'auto', 'relative');
    expect(line.text).toBe('“Hello world!”');
    expect(line.syllables).toEqual([
      { start_offset_ms: 0, duration_ms: 500, text: texts[0] },
      { start_offset_ms: 500, duration_ms: 500, text: texts[1] },
    ]);
  });

  it('prefix mode with absolute millisecond timestamps', () => {
    const input = '[1000,3000](1000,500)你(1500,500)好';
    const result = parseSyncedLines(input, 'prefix', 'absolute');

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 3000,
        text: '你好',
        syllables: [
          { start_offset_ms: 0, duration_ms: 500, text: '你' },
          { start_offset_ms: 500, duration_ms: 500, text: '好' },
        ],
      },
    ]);
  });

  it('prefix mode with relative offset', () => {
    const input = '[2000,4000](0,600)He(600,400)llo';
    const result = parseSyncedLines(input, 'prefix', 'relative');

    expect(result).toEqual([
      {
        time_ms: 2000,
        duration_ms: 4000,
        text: 'Hello',
        syllables: [
          { start_offset_ms: 0, duration_ms: 600, text: 'He' },
          { start_offset_ms: 600, duration_ms: 400, text: 'llo' },
        ],
      },
    ]);
  });

  it('prefix mode with YRC-style third field (e.g. confidence)', () => {
    const input = '[1000,3000](1000,500,0)你(1500,500,0)好';
    const result = parseSyncedLines(input, 'prefix', 'absolute');

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 3000,
        text: '你好',
        syllables: [
          { start_offset_ms: 0, duration_ms: 500, text: '你' },
          { start_offset_ms: 500, duration_ms: 500, text: '好' },
        ],
      },
    ]);
  });

  it('suffix mode with relative offset', () => {
    const input = '[1000,3000]你(0,500)好(500,500)';
    const result = parseSyncedLines(input, 'suffix', 'relative');

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 3000,
        text: '你好',
        syllables: [
          { start_offset_ms: 0, duration_ms: 500, text: '你' },
          { start_offset_ms: 500, duration_ms: 500, text: '好' },
        ],
      },
    ]);
  });

  it('suffix mode with angle-bracket syntax', () => {
    const input = '[5000,3000]Hel<0,1000>lo<1000,1000>!<2000,1000>';
    const result = parseSyncedLines(input, 'suffix', 'relative');

    expect(result).toEqual([
      {
        time_ms: 5000,
        duration_ms: 3000,
        text: 'Hello!',
        syllables: [
          { start_offset_ms: 0, duration_ms: 1000, text: 'Hel' },
          { start_offset_ms: 1000, duration_ms: 1000, text: 'lo' },
          { start_offset_ms: 2000, duration_ms: 1000, text: '!' },
        ],
      },
    ]);
  });

  it('auto mode prefers prefix when prefix captures more text', () => {
    // Data in prefix format: suffix parser will find 0 syllables
    const input = '[1000,3000](0,500)你(500,500)好';
    const result = parseSyncedLines(input, 'auto', 'relative');

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 3000,
        text: '你好',
        syllables: [
          { start_offset_ms: 0, duration_ms: 500, text: '你' },
          { start_offset_ms: 500, duration_ms: 500, text: '好' },
        ],
      },
    ]);
  });

  it('auto mode prefers suffix when suffix captures more text', () => {
    // Data in suffix format: prefix parser only captures trailing syllable text
    const input = '[1000,3000]你(0,500)好(500,500)';
    const result = parseSyncedLines(input, 'auto', 'relative');

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 3000,
        text: '你好',
        syllables: [
          { start_offset_ms: 0, duration_ms: 500, text: '你' },
          { start_offset_ms: 500, duration_ms: 500, text: '好' },
        ],
      },
    ]);
  });

  it('empty input returns empty array', () => {
    expect(parseSyncedLines('', 'prefix', 'relative')).toEqual([]);
    expect(parseSyncedLines('', 'suffix', 'absolute')).toEqual([]);
    expect(parseSyncedLines('', 'auto', 'relative')).toEqual([]);
  });

  it('multi-line lyrics sorted by time', () => {
    const input =
      '[5000,2000](0,400)世(400,400)界\n[1000,3000](0,500)你(500,500)好';
    const result = parseSyncedLines(input, 'prefix', 'relative');

    expect(result).toHaveLength(2);
    expect(result[0].time_ms).toBe(1000);
    expect(result[0].text).toBe('你好');
    expect(result[1].time_ms).toBe(5000);
    expect(result[1].text).toBe('世界');
  });

  it('multi-line lyrics with mixed syllable counts', () => {
    const input =
      '[0,5000](0,1000)A(1000,1000)B(2000,1000)C\n[6000,3000](0,1500)X(1500,1500)Y';
    const result = parseSyncedLines(input, 'prefix', 'relative');

    expect(result).toEqual([
      {
        time_ms: 0,
        duration_ms: 5000,
        text: 'ABC',
        syllables: [
          { start_offset_ms: 0, duration_ms: 1000, text: 'A' },
          { start_offset_ms: 1000, duration_ms: 1000, text: 'B' },
          { start_offset_ms: 2000, duration_ms: 1000, text: 'C' },
        ],
      },
      {
        time_ms: 6000,
        duration_ms: 3000,
        text: 'XY',
        syllables: [
          { start_offset_ms: 0, duration_ms: 1500, text: 'X' },
          { start_offset_ms: 1500, duration_ms: 1500, text: 'Y' },
        ],
      },
    ]);
  });
});

describe('parseLRCAsKaraoke', () => {
  it('preserves brackets and symbols in fallback lyrics without consuming the next row', () => {
    const input = '[00:01.00][echo] (don\'t) <3 ♪[00:02.00]“好！” [ending]\r\n[00:03.00]👩‍🎤';
    expect(parseLRCAsKaraoke(input).map((line) => line.text)).toEqual(['[echo] (don\'t) <3 ♪', '“好！” [ending]', '👩‍🎤']);
  });

  it('standard LRC with dot separator', () => {
    const input = '[00:10.50]Hello World';
    const result = parseLRCAsKaraoke(input);

    expect(result).toEqual([
      {
        time_ms: 10500,
        duration_ms: 0,
        text: 'Hello World',
        syllables: [],
      },
    ]);
  });

  it('standard LRC with colon separator', () => {
    const input = '[01:02:30]Test Line';
    const result = parseLRCAsKaraoke(input);

    expect(result).toEqual([
      {
        time_ms: 62300,
        duration_ms: 0,
        text: 'Test Line',
        syllables: [],
      },
    ]);
  });

  it('multiple lines sorted by time', () => {
    const input = '[00:20.00]Second\n[00:05.00]First\n[00:30.00]Third';
    const result = parseLRCAsKaraoke(input);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      time_ms: 5000,
      duration_ms: 0,
      text: 'First',
      syllables: [],
    });
    expect(result[1]).toEqual({
      time_ms: 20000,
      duration_ms: 0,
      text: 'Second',
      syllables: [],
    });
    expect(result[2]).toEqual({
      time_ms: 30000,
      duration_ms: 0,
      text: 'Third',
      syllables: [],
    });
  });

  it('single-digit centiseconds (e.g. [00:01.0])', () => {
    const input = '[00:01.0]One';
    const result = parseLRCAsKaraoke(input);

    expect(result).toEqual([
      {
        time_ms: 1000,
        duration_ms: 0,
        text: 'One',
        syllables: [],
      },
    ]);
  });

  it('empty input returns empty array', () => {
    expect(parseLRCAsKaraoke('')).toEqual([]);
  });

  it('ignores lines with empty text', () => {
    const input = '[00:01.00]  \n[00:05.00]Real';
    const result = parseLRCAsKaraoke(input);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Real');
  });
});
