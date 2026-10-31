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
 * @file agentUsageUtils.test.ts
 * @description Agent 用量工具的 token、时长、窗口名称、警示等级、重置提示与过期百分比测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { AgentIcon } from '../../../../../../../utils/SvgIcon';
import { AGENT_USAGE_PROVIDER_ICONS } from '../../config/agentUsageConfig';
import {
  effectivePercent,
  formatDuration,
  formatTokens,
  quotaLevel,
  resetLabel,
  windowLabel,
} from '../agentUsageUtils';

const t = (key: string, options?: Record<string, unknown>): string => (options ? `${key}:${JSON.stringify(options)}` : key);

describe('agentUsageUtils', () => {
  it('来源图标映射到 AgentIcon 枚举', () => {
    expect(AGENT_USAGE_PROVIDER_ICONS).toEqual({ claude: AgentIcon.CLAUDE, codex: AgentIcon.CODEX });
  });

  it.each([
    [0, '0'], [-5, '0'], [Number.NaN, '0'], [950, '950'], [1234, '1.23K'],
    [12_345, '12.3K'], [123_456, '123K'], [8_332_768, '8.33M'], [5e12, '5000B'],
  ])('formatTokens(%s) = %s', (value, expected) => {
    expect(formatTokens(value)).toBe(expected);
  });

  it.each([[1, '1m'], [59 * 60_000, '59m'], [61 * 60_000, '1h 1m'], [(1440 + 120) * 60_000, '1d 2h']])('formatDuration(%s) = %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('按窗口时长选择名称', () => {
    expect(windowLabel(300, t)).toContain('window.fiveHour');
    expect(windowLabel(10080, t)).toContain('window.weekly');
    expect(windowLabel(120, t)).toContain('"count":2');
    expect(windowLabel(null, t)).toContain('window.unknown');
  });

  it('警示等级阈值为 70 与 90', () => {
    expect([69, 70, 89, 90].map(quotaLevel)).toEqual([null, 'warn', 'warn', 'danger']);
  });

  it('重置提示区分未知、已重置与剩余时长', () => {
    expect(resetLabel(null, 0, t)).toBe('');
    expect(resetLabel(10, 10, t)).toContain('resetDone');
    expect(resetLabel(3_600_000, 0, t)).toContain('"time":"1h 0m"');
  });

  it('已过重置时间的窗口按 0% 展示', () => {
    expect(effectivePercent({ usedPercent: 50, windowMinutes: 300, resetsAt: 10 }, 10)).toBe(0);
    expect(effectivePercent({ usedPercent: 50, windowMinutes: 300, resetsAt: 11 }, 10)).toBe(50);
    expect(effectivePercent({ usedPercent: 50, windowMinutes: 300, resetsAt: null }, 10)).toBe(50);
  });
});
