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
 * @file trayMenuSkeleton.test.ts
 * @description 托盘菜单骨架屏：HTML 静态骨架与 React 骨架结构一致、首屏样式与主题脚本测试。
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { elements } from '../../../../test/elementHarness';
import { TRAY_MENU_ITEMS } from '../../config/trayMenuItems';
import { TrayMenuSkeleton } from '../TrayMenuSkeleton';
import type { TestElement } from '../../../../test/elementHarness';

vi.mock('../../styles/tray-menu-skeleton.css', () => ({}));

const html = readFileSync(fileURLToPath(new URL('../../../../../html/DynamicIslandTrayMenu.html', import.meta.url)), 'utf-8');

/**
 * 读取 #root 内静态骨架的标签与 class（先序）。
 * @returns 形如 div.tray-skeleton 的节点签名列表。
 */
function staticSkeleton(): string[] {
  const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('<script type="module"'));
  return [...root.matchAll(/<(\w+)\s+class="([^"]+)"/g)].map(([, tag, className]) => `${tag}.${className}`);
}

/**
 * 读取 React 骨架的标签与 class（先序）。
 * @returns 节点签名列表。
 */
function reactSkeleton(): string[] {
  return elements(TrayMenuSkeleton()).map((node: TestElement) => `${String(node.type)}.${String(node.props.className)}`);
}

describe('TrayMenuSkeleton', () => {
  it('matches the static HTML skeleton so React takes over without a visual change', () => {
    expect(staticSkeleton()).toEqual(reactSkeleton());
    expect(staticSkeleton()[0]).toBe('div.tray-skeleton');
  });

  it('mirrors the default menu rows and separators', () => {
    const rows = reactSkeleton().filter((node) => node === 'div.tray-skeleton-row' || node === 'div.tray-skeleton-separator');
    const items = TRAY_MENU_ITEMS.filter((item) => item.kind === 'separator' || !item.standaloneOnly)
      .map((item) => (item.kind === 'separator' ? 'div.tray-skeleton-separator' : 'div.tray-skeleton-row'));
    expect(rows).toEqual(items);
  });

  it('is hidden from assistive technology', () => {
    expect((TrayMenuSkeleton() as TestElement).props['aria-hidden']).toBe('true');
    expect(html).toContain('<div class="tray-skeleton" aria-hidden="true">');
  });
});

describe('DynamicIslandTrayMenu.html', () => {
  it('loads the skeleton stylesheet before the renderer script', () => {
    const stylesheet = html.indexOf('href="../components/components/DynamicIslandTrayMenu/styles/tray-menu-skeleton.css"');
    expect(stylesheet).toBeGreaterThan(0);
    expect(stylesheet).toBeLessThan(html.indexOf('<script type="module"'));
  });

  it.each([
    { search: '?theme=light', theme: 'light' },
    { search: '?theme=dark', theme: 'dark' },
    { search: '?theme=blue', theme: 'dark' },
    { search: '', theme: 'dark' },
  ])('applies theme "$theme" from "$search" before the first paint', ({ search, theme }) => {
    const script = /<script id="tray-menu-theme">([\s\S]*?)<\/script>/.exec(html)?.[1];
    expect(script).toBeDefined();
    const document = { documentElement: { dataset: {} as Record<string, string> } };
    runInNewContext(script ?? '', { document, URLSearchParams, location: { search } });
    expect(document.documentElement.dataset.theme).toBe(theme);
  });
});
