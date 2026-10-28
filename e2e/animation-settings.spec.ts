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
 * @file animation-settings.spec.ts
 * @description 动画设置即时选中状态、跨窗口生效与持久化回归。
 * @author 鸡哥
 */

import en from '../i18n/en-US.json';
import { test, expect } from './fixtures';

(['island', 'standalone'] as const).forEach((surface) => {
  test(`animation controls update immediately in ${surface}`, async ({ desktop }) => {
    await desktop.main.evaluate(() => window.api.maxexpandMouseleaveIdleSet(false));
    const page = surface === 'standalone' ? await desktop.openStandalone() : desktop.main;
    if (surface === 'standalone') {
      await page.getByRole('button', { name: en.standalone.tabs.settings, exact: true }).click();
    } else {
      await desktop.app.evaluate(({ BrowserWindow }) => {
        const main = BrowserWindow.getAllWindows().find((win) => win.webContents.getURL().endsWith('DynamicIslandIndex.html'));
        main?.webContents.send('settings:changed', 'shortcut:open-clipboard-history', null);
      });
      await page.getByRole('button', { name: en.maxExpand.nav.switchTo.replace('{{label}}', en.maxExpand.nav.settings), exact: true }).click();
    }
    await page.getByPlaceholder(en.settings.index.searchPlaceholder).fill(en.settings.app.animation.springTitle);
    await page.locator('.settings-index-search-dropdown').getByRole('button').filter({ hasText: en.settings.app.animation.springTitle })
      .click();
    const spring = page.getByRole('checkbox', { name: en.settings.app.animation.springToggle, exact: true });
    const shell = desktop.main.locator('.island-shell');
    await expect(spring).toBeChecked();
    await spring.uncheck();
    await expect(spring).not.toBeChecked();
    await expect(shell).not.toHaveClass(/\bspring-animation\b/);
    await spring.check();
    await expect(spring).toBeChecked();
    await expect(shell).toHaveClass(/\bspring-animation\b/);
    await (['slow', 'medium', 'fast'] as const).reduce(async (previous, speed) => {
      await previous;
      const radio = page.getByRole('radio', { name: en.settings.app.animation[`animSpeed_${speed}`], exact: true });
      await radio.check();
      await expect(radio).toBeChecked();
      await expect(shell).toHaveClass(new RegExp(`\\bspeed-${speed}\\b`));
      expect(await page.evaluate(() => window.api.animationSpeedGet())).toBe(speed);
    }, Promise.resolve());
    await spring.uncheck();
    expect(await page.evaluate(() => window.api.springAnimationGet())).toBe(false);
    await page.locator('.max-expand-settings-sidebar').getByRole('button', { name: en.settings.labels.index, exact: true }).click();
    await page.getByPlaceholder(en.settings.index.searchPlaceholder).fill(en.settings.app.animation.springTitle);
    await page.locator('.settings-index-search-dropdown').getByRole('button').filter({ hasText: en.settings.app.animation.springTitle })
      .click();
    await expect(spring).not.toBeChecked();
    await expect(page.getByRole('radio', { name: en.settings.app.animation.animSpeed_fast, exact: true })).toBeChecked();
    expect(desktop.rendererErrors).toEqual([]);
  });
});
