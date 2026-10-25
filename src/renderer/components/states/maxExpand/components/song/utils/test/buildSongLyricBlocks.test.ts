/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * Licensed under the GNU General Public License, version 3 or later.
 */

/**
 * @file buildSongLyricBlocks.test.ts
 * @description 验证缺行、重复时间戳和双语歌词按时间配对，保持输入不变。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import buildSongLyricBlocks from '../buildSongLyricBlocks';

describe('buildSongLyricBlocks', () => {
  it('保留完整原文并按时间而非数组位置配对译文，缺行不复用上一句', () => {
    const lyrics = [{ time_ms: 1000, text: 'First' }, { time_ms: 2000, text: 'Second' }, { time_ms: 3000, text: 'Third' }, { time_ms: 4000, text: 'Fourth' }];
    const translation = { status: 'available' as const, lines: [{ time_ms: 1000, text: '第一句' }, { time_ms: 3000, text: '第三句' }, { time_ms: 3500, text: '第三句补充' }, { time_ms: 4000, text: 'Fourth' }] };
    expect(buildSongLyricBlocks(lyrics, translation)).toEqual([
      { time_ms: 1000, text: 'First', translation: '第一句' },
      { time_ms: 2000, text: 'Second', translation: '' },
      { time_ms: 3000, text: 'Third', translation: '第三句\n第三句补充' },
      { time_ms: 4000, text: 'Fourth', translation: '' },
    ]);
    expect(lyrics[0]).toEqual({ time_ms: 1000, text: 'First' });
  });
  it('合并相同时间戳原文，忽略空行和首句前的翻译', () => {
    const lyrics = [{ time_ms: 0, text: ' ' }, { time_ms: 1000, text: 'A' }, { time_ms: 1000, text: 'B' }];
    const before = JSON.stringify(lyrics);
    expect(buildSongLyricBlocks(lyrics, { status: 'available', lines: [{ time_ms: 0, text: '过期' }, { time_ms: 1000, text: '译文' }] })).toEqual([{ time_ms: 1000, text: 'A\nB', translation: '译文' }]);
    expect(JSON.stringify(lyrics)).toBe(before);
  });
  it('无翻译时仍展示原文，无原文时返回空列表', () => {
    expect(buildSongLyricBlocks([{ time_ms: 0, text: 'A' }], null)).toEqual([{ time_ms: 0, text: 'A', translation: '' }]);
    expect(buildSongLyricBlocks(null, null)).toEqual([]);
  });
});
