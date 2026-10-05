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
 * @file dynamicIslandSplashMain.test.tsx
 * @description 验证启动画面入口挂载及缺失根节点反馈。
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
vi.mock('../SplashScreen', () => ({ SplashScreen: mocks.view }));
describe('DynamicIslandSplashMain', () => {
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

  it('将启动画面挂载到root并启用StrictMode', async () => {
    await import('../DynamicIslandSplashMain');
    expect(mocks.get).toHaveBeenCalledWith('root');
    expect(mocks.mount).toHaveBeenCalledWith(mocks.root);
    const tree = mocks.render.mock.calls[0][0] as ReactElement<{ children: ReactElement }>;
    expect(tree.type).toBe(StrictMode);
    expect((Children.only(tree.props.children)).type).toBe(mocks.view);
  });
  it('缺失root时抛出已翻译错误，阻止挂载', async () => {
    mocks.get.mockReturnValue(null);
    await expect(import('../DynamicIslandSplashMain')).rejects.toThrow('[SplashRenderer] common.errors.rootMountNotFound');
    expect(mocks.mount).not.toHaveBeenCalled();
  });
});
