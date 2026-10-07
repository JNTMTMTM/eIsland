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
 * @file fixtures.ts
 * @description 隔离 Electron 测试实例，支持重启并收集窗口错误、截图和 trace。
 * @author 鸡哥
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test as baseTest, expect } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

/** 一次测试使用独立数据目录，重启时保留该目录。 */
interface DesktopSession {
  app: ElectronApplication;
  main: Page;
  userData: string;
  rendererErrors: string[];
  restart: () => Promise<void>;
  openStandalone: () => Promise<Page>;
}

export const test = baseTest.extend<{ desktop: DesktopSession }>({
  desktop: async ({ playwright }, use, testInfo) => {
    const userData = await mkdtemp(join(tmpdir(), 'eisland-e2e-'));
    const storeDir = join(userData, 'eIsland_store');
    await mkdir(storeDir);
    const settings = {
      'i18n-language': 'en-US',
      'standalone-window-active-tab': 'todo',
      todos: [],
    };
    await Promise.all(Object.entries(settings).map(([key, value]) =>
      writeFile(join(storeDir, `${key}.json`), JSON.stringify(value))));
    const logs: string[] = [];
    const rendererErrors: string[] = [];
    let app: ElectronApplication | undefined;
    let launchNumber = 0;

    const close = async (): Promise<void> => {
      if (!app) return;
      const current = app;
      app = undefined;
      try {
        await current.context().tracing.stop({ path: testInfo.outputPath(`trace-${launchNumber}.zip`) });
      } finally {
        await current.close();
      }
    };

    const launch = async (): Promise<{ app: ElectronApplication; main: Page }> => {
      launchNumber += 1;
      // Electron CLI 需要正常 GUI 模式；桌面工具可能向父进程设置 RUN_AS_NODE。
      const env: Record<string, string> = {};
      Object.entries(process.env).forEach(([key, value]) => {
        if (value !== undefined && !/^(ELECTRON_RUN_AS_NODE|ELECTRON_RENDERER_URL|EISLAND_E2E_USER_DATA)$/i.test(key)) {
          env[key] = value;
        }
      });
      env.EISLAND_E2E_USER_DATA = userData;
      app = await playwright._electron.launch({
        env,
        args: [resolve('out/e2e/main/index.js')],
        cwd: process.cwd(),
        locale: 'en-US',
        timeout: 30_000,
      });
      app.process().stdout?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));
      app.process().stderr?.on('data', (chunk: Buffer) => logs.push(chunk.toString()));
      app.on('window', (page) => {
        page.on('pageerror', (error) => rendererErrors.push(error.message));
      });
      await app.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
      const main = await app.firstWindow();
      await expect(main).toHaveURL(/DynamicIslandIndex\.html$/);
      await expect(main.locator('#root > *').first()).toBeAttached();
      return { app, main };
    };

    let setupFailed = true;
    try {
      const initial = await launch();
      setupFailed = false;
      const desktop: DesktopSession = {
        userData,
        rendererErrors,
        ...initial,
        restart: async () => {
          await close();
          const next = await launch();
          desktop.app = next.app;
          desktop.main = next.main;
        },
        openStandalone: async () => {
          const opened = desktop.app.waitForEvent('window');
          await desktop.main.evaluate(() => window.api.openStandaloneWindow());
          const page = await opened;
          await expect(page).toHaveURL(/DynamicIslandStandalone\.html$/);
          await expect(page.locator('.cw-root')).toBeVisible();
          return page;
        },
      };
      await use(desktop);
    } finally {
      try {
        if (app && (setupFailed || testInfo.status !== testInfo.expectedStatus)) {
          await Promise.all(app.windows().map(async (page, index) => {
            await page.screenshot({ path: testInfo.outputPath(`window-${index}.png`) });
          }));
        }
      } finally {
        try {
          await close();
        } finally {
          await writeFile(testInfo.outputPath('electron.log'), logs.join(''));
          await rm(userData, { recursive: true, force: true });
        }
      }
    }
  },
});

export { expect };
