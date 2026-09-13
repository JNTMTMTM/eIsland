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
 * @file overviewAlarmConfig.test.ts
 * @description 总览闹钟存档与卡片选择状态回归测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { normalizeOverviewAlarmIds } from '../overviewAlarmConfig';
import { AlarmCard } from '../../components/AlarmCard';
import type { AlarmCardProps } from '../../types/alarmCardTypes';
import { DEFAULT_SYSTEM_ALARM_RINGTONE } from '../../../../../../../utils/audio/alarmSound';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('总览闹钟选择', () => {
  it('忽略无效存档和无效 ID', () => {
    expect(normalizeOverviewAlarmIds(null)).toEqual([]);
    expect(normalizeOverviewAlarmIds({ alarmIds: '12' })).toEqual([]);
    expect(normalizeOverviewAlarmIds({ alarmIds: [null, '1', -1, 1.5, Infinity, 12] })).toEqual([12]);
  });

  it('去重、保留用户选择顺序，并限制为两项', () => {
    expect(normalizeOverviewAlarmIds({ alarmIds: [20, 20, 10, 30] })).toEqual([20, 10]);
  });

  const props: AlarmCardProps = {
    alarm: { id: 1, hour: 8, minute: 5, second: 9, label: 'Morning', enabled: true, repeat: [], ringtone: DEFAULT_SYSTEM_ALARM_RINGTONE, loop: true, createdAt: 1 },
    isActive: false,
    weekdayLabel: () => '',
    repeatSummary: () => '',
    nextRingDesc: () => '',
    onStartEdit: vi.fn(), onDelete: vi.fn(), onToggle: vi.fn(), onToggleOverview: vi.fn(),
    overviewSelected: false, overviewSelectionFull: true,
  };

  it('展示已满时禁用未选闹钟的添加按钮，并保持删除在展示按钮之前', () => {
    const html = renderToStaticMarkup(createElement(AlarmCard, props));
    expect(html).toContain('08:05:09');
    expect(html).toContain('class="alarm-overview-btn" type="button" disabled=""');
    expect(html.indexOf('class="alarm-delete-btn"')).toBeLessThan(html.indexOf('class="alarm-overview-btn"'));
  });

  it('已选闹钟仍可取消展示且保持选中样式', () => {
    const html = renderToStaticMarkup(createElement(AlarmCard, { ...props, overviewSelected: true }));
    expect(html).toContain('alarm-card--overview-selected');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('overview.alarm.remove');
  });
});
