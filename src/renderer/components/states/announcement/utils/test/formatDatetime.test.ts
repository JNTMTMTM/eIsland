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
 * @file formatDatetime.test.ts
 * @description 公告日期格式化的空值、非法输入、补零和本地日期时分测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { formatDatetime } from '../formatDatetime';
describe('announcement local datetime', () => {
  it('空输入返回空字符串', () => { expect(formatDatetime()).toBe(''); expect(formatDatetime('')).toBe(''); });
  it('非法输入原样保留', () => { expect(formatDatetime('invalid')).toBe('invalid'); });
  it('本地日期补零到年月日小时分钟', () => { expect(formatDatetime('2026-02-03T04:05:00')).toBe('2026-02-03 04:05'); });
  it('两位日期/时分保持原值并丢弃秒', () => { expect(formatDatetime('2026-12-23T14:15:59')).toBe('2026-12-23 14:15'); });
});
