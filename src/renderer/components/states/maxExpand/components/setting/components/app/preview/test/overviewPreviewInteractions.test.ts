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
 * @file overviewPreviewInteractions.test.ts
 * @description 总览预览真实倒数日加载排序、日期分支与卸载取消回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OverviewPreview } from '../OverviewPreview';
import { elementProps, elements, findElement, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/themeHookHarness';
import type { ComponentProps } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const api = { storeRead: vi.fn<() => Promise<unknown>>() };
let config: ComponentProps<typeof OverviewPreview>['layoutConfig'];
/**
 * 执行真实总览预览并保持组件生命周期。
 * @returns 实际渲染树。
 */
function render() { return renderWithHooks(() => OverviewPreview({ layoutConfig: config })); }
/**
 * 等待配置加载微任务。
 * @returns 异步队列完成。
 */
async function settle(): Promise<void> { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
beforeEach(() => { resetLifecycle(); vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00')); api.storeRead.mockResolvedValue(undefined); vi.stubGlobal('window', { api }); config = { left: 'countdown', right: 'todo', clockStyle: 'classic', gradientColors: { start: '#000000', middle: '#888888', end: '#ffffff' } }; });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('倒数日实际加载与日期展示', () => {
  it.each([undefined, null, 42, {}])('非数组配置%o保留空倒数日', async (data) => { api.storeRead.mockResolvedValue(data); render(); runEffects(); await settle(); expect(textContent(render())).toContain('overview.countdown.empty'); });
  it.each(['2026-10-07', '2026-10-06', '2026-10-05'])('目标日期%s展示未来、当日或过去', async (date) => {
    api.storeRead.mockResolvedValue([{ date, id: 1, name: 'Event', color: '#112233', type: 'birthday' }]); render(); runEffects(); await settle();
    let key = 'before';
    if (date === '2026-10-07') key = 'after';
    if (date === '2026-10-06') key = 'today';
    expect(textContent(render())).toContain(`countdown.days.${key}`);
  });
  it('按绝对距离选最近两项，覆盖背景默认透明度、显式透明度及描述', async () => {
    api.storeRead.mockResolvedValue([
      { id: 1, name: 'Far', date: '2026-11-06', color: '#aa1122', type: 'birthday' },
      { id: 2, name: 'Tomorrow', date: '2026-10-07', color: '#112233', type: 'holiday', backgroundImage: 'tomorrow.png', description: 'Details' },
      { id: 3, name: 'Today', date: '2026-10-06', color: '#445566', type: 'custom', backgroundImage: 'today.png', backgroundOpacity: 0 },
    ]); render(); runEffects(); await settle();
    const tree = render();
    expect(elements(tree).filter((node) => elementProps(node).className === 'cd-card-name').map(textContent)).toEqual(['Today', 'Tomorrow']);
    expect(textContent(tree)).toContain('Details'); expect(textContent(tree)).not.toContain('Far');
    const backgrounds = elements(tree).filter((node) => elementProps(node).className === 'cd-card-bg');
    expect(elementProps(backgrounds[0]).style).toEqual({ backgroundImage: 'url(today.png)', opacity: 0 });
    expect(elementProps(backgrounds[1]).style).toEqual({ backgroundImage: 'url(tomorrow.png)', opacity: 0.5 });
  });
  it('读取失败和卸载后迟到数据均保留空列表', async () => {
    api.storeRead.mockRejectedValue(new Error('offline')); render(); runEffects(); await settle(); expect(textContent(render())).toContain('overview.countdown.empty');
    resetLifecycle(); let resolve: (value: unknown) => void = () => undefined;
    api.storeRead.mockReturnValue(new Promise((done) => { resolve = done; })); render(); runEffects(); unmountHooks(); resolve([{ id: 1, name: 'Late', date: '2026-10-06', color: '#112233', type: 'custom' }]); await settle();
    expect(textContent(render())).not.toContain('Late');
  });
  it('损坏的运行时控件值通过公开布局输入得到空卡片兜底', () => {
    config.left = 'unknown-runtime-widget' as typeof config.left;
    const left = findElement(render(), (node) => elementProps(node).className === 'ov-dash-slot ov-dash-slot-left');
    expect(elementProps(left).children).toBeNull();
  });
});
