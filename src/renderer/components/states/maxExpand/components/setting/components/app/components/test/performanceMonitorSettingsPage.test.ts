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
 * @file performanceMonitorSettingsPage.test.ts
 * @description PerformanceMonitorSettingsPage 实际元素树、关键回调与边界状态回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceMonitorSettingsPage } from '../PerformanceMonitorSettingsPage';
import { elementProps, elements, findElement, invoke, resetState } from '../../../../../../../../test/elementHarness';
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  ...(await import('../../../../../../../../test/elementHarness')).hookMocks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = {
  getPerformanceSnapshot: vi.fn(() => Promise.resolve(true)),
  storeRead: vi.fn(() => Promise.resolve(true)),
  storeWrite: vi.fn(() => Promise.resolve(true)),
  settingsPreview: vi.fn(() => Promise.resolve(true)),
};
beforeEach(() => {
  vi.clearAllMocks();
  resetState();
  api.storeWrite.mockResolvedValue(true);
  vi.stubGlobal('window', { api, dispatchEvent: vi.fn() });
});
afterEach(() => { vi.unstubAllGlobals(); });
describe('PerformanceMonitorSettingsPage', () => {
  it('provides four bounded color controls and rejects invalid colors', () => {
    const tree = PerformanceMonitorSettingsPage();
    const colors = elements(tree).filter((node) => elementProps(node).type === 'color');
    expect(colors).toHaveLength(4);
    invoke(colors[0], 'onChange', { target: { value: 'invalid' } });
    expect(api.storeWrite).not.toHaveBeenCalled();
    invoke(colors[0], 'onChange', { target: { value: '#123456' } });
    expect(api.storeWrite).toHaveBeenCalledWith('performance-monitor-chart-colors', expect.objectContaining({ cpu: '#123456' }));
    expect(api.settingsPreview).toHaveBeenCalled();
  });
  it('routes hardware choices and restores all default chart colors', () => {
    const tree = PerformanceMonitorSettingsPage();
    const hardware = elements(tree).filter((node) => typeof elementProps(node).resolveLabel === 'function');
    expect(hardware).toHaveLength(3);
    invoke(hardware[0], 'onChange', 'cpu-0');
    expect(api.storeWrite).toHaveBeenCalledWith('performance-monitor-hardware-selection', expect.objectContaining({ cpu: 'cpu-0' }));
    invoke(findElement(tree, (node) => elementProps(node)['aria-label'] === 'settings.app.performanceMonitor.resetColors'), 'onClick');
    expect(api.storeWrite).toHaveBeenCalledTimes(2);
  });
});
