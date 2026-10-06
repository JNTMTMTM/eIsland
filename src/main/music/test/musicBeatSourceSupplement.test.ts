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
 * @file musicBeatSourceSupplement.test.ts
 * @description 音频进程标识缺失、显示名直接匹配与别名匹配边界测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { resolveMusicAudioProcess } from '../musicBeatSource';
describe('音频进程名称缺失和显示名匹配', () => {
  it('两个完全缺少名称的进程无法安全回退', () => {
    expect(resolveMusicAudioProcess('unidentified', [
      { processId: 1, processName: null, displayName: null }, { processId: 2, processName: null, displayName: null },
    ])).toBeUndefined();
  });
  it.each([['MyPlayer', 'Player'], ['Player', 'LongPlayerName']])('源 %s 与显示名 %s 双向直接匹配', (source, displayName) => {
    const candidate = { displayName, processId: 8, processName: null };
    expect(resolveMusicAudioProcess(source, [{ processId: 9, processName: 'unrelated', displayName: null }, candidate])).toBe(candidate);
  });
  it('进程名缺少时可使用显示名命中已知播放器别名', () => {
    const candidate = { processId: 8, processName: null, displayName: 'Orpheus' };
    expect(resolveMusicAudioProcess('NetEase.CloudMusic', [
      { processId: 9, processName: null, displayName: null }, candidate,
    ])).toBe(candidate);
  });
});
