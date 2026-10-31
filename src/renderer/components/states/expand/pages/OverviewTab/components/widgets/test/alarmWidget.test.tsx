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
 * @file alarmWidget.test.tsx
 * @description AlarmWidget 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, invoke, text } from '../../../../../../test/tree';

import { AlarmWidget } from '../AlarmWidget';
import type { TreeElement } from '../../../../../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../../../../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ alarmIds: [1], setAlarmEnabled: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../../../../maxExpand/components/alarm/hooks/useOverviewAlarmConfig', () => ({ useOverviewAlarmConfig: () => ({ alarmIds: model.alarmIds }) }));
beforeEach(() => { vi.stubGlobal('window', { api: { setAlarmEnabled: model.setAlarmEnabled } }); });
function alarm(enabled = true) { return { enabled, id: 1, label: 'Wake up', hour: 7, minute: 5, second: 0, repeat: 'once' }; }
function render(onOpenAlarmPage = vi.fn()) { slots.cursor = 0; return ((AlarmWidget({ onOpenAlarmPage }) as TreeElement)); }
describe('AlarmWidget', () => {
  it('renders empty selected alarms and forwards page navigation', () => { const open = vi.fn(); const root = render(open); expect(text(root)).toContain('overview.alarm.empty'); invoke(byClass(root, 'ov-dash-alarm-title'), 'onClick'); expect(open).toHaveBeenCalledOnce(); });
  it('renders selected alarm switch and toggles its enabled value', async () => { slots.values = [[alarm()], null, false]; const root = render(); expect(text(root)).toContain('Wake up07:05:00'); const button = byClass(root, 'ov-dash-alarm-toggle'); expect(button.props['aria-checked']).toBe(true); invoke(button, 'onClick'); await Promise.resolve(); expect(model.setAlarmEnabled).toHaveBeenCalledWith(1, false); expect(slots.values[1]).toBeNull(); });
  it('guards concurrent toggles and exposes save failure', async () => { let resolve!: (value: boolean) => void; model.setAlarmEnabled.mockReturnValue(new Promise<boolean>((done) => { resolve = done; })); slots.values = [[alarm(false)], null, false]; const root = render(); const button = byClass(root, 'ov-dash-alarm-toggle'); invoke(button, 'onClick'); invoke(button, 'onClick'); expect(model.setAlarmEnabled).toHaveBeenCalledOnce(); expect(byClass(render(), 'ov-dash-alarm-toggle').props.disabled).toBe(true); resolve(false); await Promise.resolve(); expect(byClass(render(), 'ov-dash-alarm-error').props.role).toBe('alert'); });
});
