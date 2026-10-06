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
 * @file loginHeatmapInteractions.test.ts
 * @description 登录热力图真实动画帧居中、空引用和可见性清理回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginHeatmap } from '../LoginHeatmap';
import { elementProps, findElement } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../app/components/test/themeHookHarness';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const frame = vi.fn<(callback: FrameRequestCallback) => number>();
const cancel = vi.fn<(id: number) => void>();
let visible: boolean; let days: Set<string>;
/**
 * 执行实际登录热力图并保留 ref 与 effect。
 * @returns 真实热力图树。
 */
function render() { return renderWithHooks(() => LoginHeatmap({ visible, loginDays: days })); }
/**
 * 取得热力图实际公开 DOM ref。
 * @param classPart - 节点类名片段。
 * @returns DOM 引用。
 */
function ref(classPart: string) { return elementProps(findElement(render(),(node)=>String(elementProps(node).className).includes(classPart))).ref as { current: unknown }; }
/**
 * 执行浏览器最近保存的真实帧回调。
 * @returns 无返回值。
 */
function draw(): void { const [callback] = frame.mock.lastCall ?? []; callback?.(0); }
beforeEach(()=>{ resetLifecycle(); vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-06T12:00:00')); visible = true; days = new Set(['2026-10-6']); frame.mockReturnValue(17); vi.stubGlobal('requestAnimationFrame',frame); vi.stubGlobal('cancelAnimationFrame',cancel); });
afterEach(()=>{vi.useRealTimers(); vi.unstubAllGlobals();});
describe('热力图实际帧居中与清理',()=>{
  it('今日相对滚动宽度水平居中且日期变化清理上次帧',()=>{
    const scroller = {scrollLeft:0,clientWidth:200}; ref('cli-tab-heatmap-scroll').current = scroller; ref('--today').current = {offsetLeft:400,offsetWidth:10}; runEffects(); draw(); expect(scroller.scrollLeft).toBe(305);
    days = new Set(); render(); runEffects(); expect(cancel).toHaveBeenCalledWith(17); expect(frame).toHaveBeenCalledTimes(2); unmountHooks(); expect(cancel).toHaveBeenCalledTimes(2);
  });
  it.each(['scroller','today'] as const)('帧到达时缺少%s节点安全结束', (missing)=>{
    if (missing === 'scroller') ref('--today').current = {offsetLeft:400,offsetWidth:10};
    else ref('cli-tab-heatmap-scroll').current = {scrollLeft:0,clientWidth:200};
    render(); runEffects(); draw(); expect(frame).toHaveBeenCalledOnce();
  });
  it('隐藏不创建帧，再显示安排新帧，重新隐藏清理帧',()=>{
    visible = false; render(); runEffects(); expect(frame).not.toHaveBeenCalled(); visible = true; render(); runEffects(); expect(frame).toHaveBeenCalledOnce(); visible = false; render(); runEffects(); expect(cancel).toHaveBeenCalledWith(17); expect(frame).toHaveBeenCalledOnce();
  });
});
