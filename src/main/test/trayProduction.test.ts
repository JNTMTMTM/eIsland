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
 * @file trayProduction.test.ts
 * @description 生产托盘实际图标路径与原生资源释放测试。
 * @author 鸡哥
 */

import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createTray, destroyTray } from '../tray';
const mocks = vi.hoisted(() => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
  Object.defineProperty(process, 'resourcesPath', { configurable: true, value: 'C:\\fixture-resources' });
  const destroy = vi.fn<() => void>();
  /** 模拟生产环境托盘的原生资源。 */
  class TrayBoundary {
    on = vi.fn<(event: string, callback: () => void) => void>();

    setToolTip = vi.fn<(text: string) => void>();

    setContextMenu = vi.fn<(menu: unknown) => void>();

    destroy = destroy;
  }
  return { descriptor, destroy, Tray: TrayBoundary, icon: vi.fn<(path: string) => object>(() => ({})) };
});
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: false } }));
vi.mock('fs', () => ({ existsSync: () => false, readFileSync: vi.fn() }));
vi.mock('../window/standaloneWindow', () => ({ openStandaloneWindow: vi.fn() }));
vi.mock('electron', () => ({
  Tray: mocks.Tray,
  nativeImage: { createFromPath: mocks.icon },
  Menu: { buildFromTemplate: (entries: unknown): unknown => entries },
  app: { getPath: () => 'C:\\fixture-user', quit: vi.fn(), relaunch: vi.fn() },
  shell: { openPath: vi.fn() },
}));
afterAll(() => {
  destroyTray();
  if (mocks.descriptor) Object.defineProperty(process, 'resourcesPath', mocks.descriptor);
  else Reflect.deleteProperty(process, 'resourcesPath');
});
describe('production tray resources', () => {
  it('loads its real tray icon path from packaged extraResources and destroys the tray', () => {
    createTray(null);
    expect(mocks.icon).toHaveBeenCalledWith(join('C:\\fixture-resources', 'icon/eisland_16x16.ico'));
    destroyTray();
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
