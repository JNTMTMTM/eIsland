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
 * @file dynamicIslandMain.test.tsx
 * @description 主窗口挂载前初始化、透明度边界及缺失根节点测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Children, StrictMode, type ReactElement } from 'react';

const mocks = vi.hoisted(() => ({
  root: {}, get: vi.fn<() => object | null>(), render: vi.fn(), mount: vi.fn(), css: vi.fn(),
  theme: vi.fn<() => Promise<void>>(), fonts: vi.fn<() => Promise<void>>(),
  auth: vi.fn<() => Promise<void>>(), weatherConfig: vi.fn<() => Promise<void>>(), weather: vi.fn(),
  opacity: vi.fn<() => Promise<unknown>>(), current: vi.fn<() => Promise<unknown>>(),
  update: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), view: () => null,
}));
vi.mock('react-dom/client', () => ({ createRoot: mocks.mount }));
vi.mock('../../i18n', () => ({ default: { t: (key: string) => key } }));
vi.mock('../../utils/theme', () => ({ initTheme: mocks.theme }));
vi.mock('../../utils/font', () => ({ initFonts: mocks.fonts }));
vi.mock('../../utils/authSession', () => ({ bootstrapAuthSession: mocks.auth }));
vi.mock('../../store/utils/storage', () => ({ hydrateWeatherLocationConfigFromStore: mocks.weatherConfig }));
vi.mock('../../store/slices', () => ({ default: { getState: () => ({ fetchWeatherData: mocks.weather, handleNowPlayingUpdate: mocks.update }) } }));
vi.mock('../DynamicIsland', () => ({ default: mocks.view }));
describe('DynamicIslandMain', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.get.mockReturnValue(mocks.root);
    mocks.mount.mockReturnValue({ render: mocks.render });
    mocks.theme.mockResolvedValue(); mocks.fonts.mockResolvedValue(); mocks.auth.mockResolvedValue();
    mocks.weatherConfig.mockResolvedValue(); mocks.opacity.mockResolvedValue(75);
    mocks.current.mockResolvedValue(null); mocks.subscribe.mockReturnValue(mocks.unsubscribe);
    vi.stubGlobal('document', { getElementById: mocks.get, documentElement: { style: { setProperty: mocks.css } } });
    vi.stubGlobal('window', Object.assign(new EventTarget(), { api: { islandOpacityGet: mocks.opacity,
      mediaCurrentInfoGet: mocks.current, onNowPlayingInfo: mocks.subscribe } }));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('按序初始化后拉取天气，挂载StrictMode根组件', async () => {
    await import('../DynamicIslandMain');
    await vi.waitFor(() => { expect(mocks.render).toHaveBeenCalledOnce(); });
    expect(mocks.mount).toHaveBeenCalledWith(mocks.root);
    expect(mocks.get).toHaveBeenCalledWith('root');
    expect(mocks.theme.mock.invocationCallOrder[0]).toBeLessThan(mocks.fonts.mock.invocationCallOrder[0]);
    expect(mocks.fonts.mock.invocationCallOrder[0]).toBeLessThan(mocks.auth.mock.invocationCallOrder[0]);
    expect(mocks.auth.mock.invocationCallOrder[0]).toBeLessThan(mocks.weatherConfig.mock.invocationCallOrder[0]);
    expect(mocks.weather).toHaveBeenCalledOnce();
    expect(mocks.css).toHaveBeenCalledWith('--island-opacity', '75');
    const tree = mocks.render.mock.calls[0][0] as ReactElement<{ children: ReactElement }>;
    expect(tree.type).toBe(StrictMode);
    expect((Children.only(tree.props.children)).type).toBe(mocks.view);
  });
  it.each([{ input: -5, expected: '10' }, { input: 123, expected: '100' }, { input: 44.6, expected: '45' }, { input: null, expected: '100' }])('透明度 $input取整并限制范围', async ({ input, expected }) => {
    mocks.opacity.mockResolvedValue(input);
    await import('../DynamicIslandMain');
    await vi.waitFor(() => { expect(mocks.css).toHaveBeenCalledWith('--island-opacity', expected); });
  });
  it('透明度读取失败回退默认值且继续挂载', async () => {
    mocks.opacity.mockRejectedValue(new Error('IPC offline'));
    await import('../DynamicIslandMain');
    await vi.waitFor(() => { expect(mocks.render).toHaveBeenCalledOnce(); });
    expect(mocks.css).toHaveBeenCalledWith('--island-opacity', '100');
  });
  it('缺失root时抛出翻译错误并阻止启动', async () => {
    mocks.get.mockReturnValue(null);
    await expect(import('../DynamicIslandMain')).rejects.toThrow('[Renderer] common.errors.rootMountNotFound');
    expect(mocks.theme).not.toHaveBeenCalled();
    expect(mocks.mount).not.toHaveBeenCalled();
  });
});
