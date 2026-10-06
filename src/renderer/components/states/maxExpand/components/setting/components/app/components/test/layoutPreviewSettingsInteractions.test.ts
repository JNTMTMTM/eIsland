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
 * @file layoutPreviewSettingsInteractions.test.ts
 * @description 布局预览真实配置加载、样式保存失败及控件组合与色彩回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutPreviewSettingsPage } from '../LayoutPreviewSettingsPage';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects } from './themeHookHarness';
import makeAppSettingsProps from './appSettingsFixture';
const { store } = vi.hoisted(() => ({ store: { dominantColor: null as number[] | null } }));
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../../test/elementHarness')).hookMocks, ...(await import('./themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../../../../../../../store/slices', () => ({ default: () => store }));
vi.mock('../../../../../../../hover/pages/lyric/components/SilkyWave', () => ({ SilkyWave: vi.fn() }));
vi.mock('../../preview/MusicBgWavePreview', () => ({ MusicBgWavePreview: vi.fn() }));
const api = { storeRead: vi.fn<() => Promise<unknown>>(), storeWrite: vi.fn<(key: string, value: unknown) => Promise<void>>() };
let props = makeAppSettingsProps();
/**
 * 执行实际布局预览组件并保留生命周期状态。
 * @returns 真实元素树。
 */
function render() { return renderWithHooks(() => LayoutPreviewSettingsPage(props)); }
/**
 * 等待真实读取与失败处理队列。
 * @returns 队列完成。
 */
async function settle(): Promise<void> { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); }
beforeEach(() => { resetLifecycle(); vi.resetAllMocks(); props = makeAppSettingsProps(); store.dominantColor = null; api.storeRead.mockResolvedValue(undefined); api.storeWrite.mockResolvedValue(undefined); vi.stubGlobal('window', { api }); });
afterEach(() => { vi.unstubAllGlobals(); });
describe('实际布局预览配置与操作', () => {
  it.each(['silky', 'wave', 'damaged', undefined])('读取样式%o，仅合法值覆盖默认', async (value) => {
    api.storeRead.mockResolvedValue(value); render(); runEffects(); await settle();
    const choices = elements(render()).filter((node) => String(elementProps(node).className).startsWith('settings-music-bg-preview-item'));
    expect(choices.map((node) => String(elementProps(node).className).includes('active'))).toEqual(value === 'wave' ? [false, true] : [true, false]);
  });
  it('读取失败保留默认且波浪颜色使用默认或实际主色', async () => {
    api.storeRead.mockRejectedValue(new Error('offline')); render(); runEffects(); await settle();
    let wave = elements(render()).filter((node) => elementProps(node).playing === true);
    expect(wave.map((node) => elementProps(node).color)).toEqual([[100, 180, 255], [100, 180, 255]]);
    store.dominantColor = [20, 40, 60]; wave = elements(render()).filter((node) => elementProps(node).playing === true);
    expect(wave.map((node) => elementProps(node).color)).toEqual([[20, 40, 60], [20, 40, 60]]);
  });
  it.each([false, true])('保存失败=%s时实际样式选择立即改变且拒绝被捕获', async (failure) => {
    if (failure) api.storeWrite.mockRejectedValue(new Error('offline'));
    const choices = elements(render()).filter((node) => String(elementProps(node).className).startsWith('settings-music-bg-preview-item'));
    invoke(choices[1], 'onClick'); await settle();
    expect(api.storeWrite).toHaveBeenLastCalledWith('hover-music-bg-style', 'wave');
    expect(elementProps(findElement(render(), (node) => String(elementProps(node).className).startsWith('settings-music-bg-preview-item active'))).children).toBeDefined();
    invoke(choices[0], 'onClick'); await settle();
    expect(api.storeWrite).toHaveBeenLastCalledWith('hover-music-bg-style', 'silky');
  });
  it('左右控件及两种时钟选择调用各自实际回调，渐变颜色与预览参数保持一致', () => {
    const tree = render();
    const widgets = elements(tree).filter((node) => node.type === 'button' && ['Todo', 'Shortcuts'].includes(textContent(node)));
    widgets.forEach((node) => invoke(node, 'onClick'));
    expect(props.updateLayout).toHaveBeenNthCalledWith(1, 'left', 'shortcuts');
    expect(props.updateLayout).toHaveBeenNthCalledWith(2, 'left', 'todo');
    expect(props.updateLayout).toHaveBeenNthCalledWith(3, 'right', 'shortcuts');
    expect(props.updateLayout).toHaveBeenNthCalledWith(4, 'right', 'todo');
    ['Classic', 'Gradient'].forEach((label) => invoke(findElement(tree, (node) => node.type === 'button' && textContent(node) === label), 'onClick'));
    expect(props.updateClockStyle).toHaveBeenNthCalledWith(1, 'classic'); expect(props.updateClockStyle).toHaveBeenNthCalledWith(2, 'gradient');
    invoke(findElement(tree, (node) => elementProps(node).type === 'color'), 'onChange', { target: { value: '#112233' } });
    expect(props.updateGradientColor).toHaveBeenCalledWith('#112233');
    expect(elementProps(findElement(tree, (node) => node.type === props.OverviewPreviewComponent)).layoutConfig).toBe(props.layoutConfig);
  });
});
