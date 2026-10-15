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
 * @file trayMenuComponents.test.tsx
 * @description 托盘菜单根组件、用户卡片与菜单项的渲染分支、打开流程、高度上报与交互测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../test/elementHarness';
import { TrayMenu } from '../components/TrayMenu';
import { TrayMenuItem } from '../components/TrayMenuItem';
import { TrayUserCard } from '../components/TrayUserCard';
import { TRAY_MENU_ITEMS } from '../config/trayMenuItems';
import type { TestElement } from '../../test/elementHarness';
import type { TrayMenuState } from '../../../../shared/trayMenu';
import type { TrayUserSummary } from '../types';

const mocks = vi.hoisted(() => ({
  i18n: { language: 'zh-CN', changeLanguage: vi.fn<(language: string) => Promise<void>>() },
  summary: vi.fn(),
}));

vi.mock('react', async (load) => ({
  ...(await load<typeof import('react')>()),
  ...hookMocks,
  ...lifecycleHooks,
  useLayoutEffect: lifecycleHooks.useEffect,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { date?: string }) => (options?.date ? `${key}:${options.date}` : key),
  }),
}));
vi.mock('../../../i18n', () => ({ default: mocks.i18n }));
vi.mock('../utils/trayUserSummary', () => ({ readTrayUserSummary: mocks.summary }));

const SIGNED_OUT: TrayUserSummary = { loggedIn: false, name: '', avatar: null, email: '', isPro: false, proExpireDate: null };
const REGULAR: TrayUserSummary = { loggedIn: true, name: 'island', avatar: 'https://cdn.example.com/a.png', email: 'island@example.com', isPro: false, proExpireDate: null };
const PRO: TrayUserSummary = { ...REGULAR, isPro: true, proExpireDate: '2026-12-01' };
const STATE: TrayMenuState = { windowAvailable: true, alwaysOnTop: true, standaloneMode: false, language: 'zh-CN' };

let openHandler: ((state: TrayMenuState) => void) | null = null;
let frames: Map<number, FrameRequestCallback>;
let nextFrame = 0;
const api = {
  onTrayMenuOpen: vi.fn((callback: (state: TrayMenuState) => void) => {
    openHandler = callback;
    return unsubscribe;
  }),
  trayMenuMounted: vi.fn(),
  trayMenuReady: vi.fn(),
  trayMenuAction: vi.fn(),
  trayMenuClose: vi.fn(),
};
const unsubscribe = vi.fn();

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  openHandler = null;
  frames = new Map();
  nextFrame = 0;
  mocks.i18n.language = 'zh-CN';
  mocks.i18n.changeLanguage.mockImplementation(async (language) => { mocks.i18n.language = language; });
  mocks.summary.mockReturnValue(REGULAR);
  vi.stubGlobal('window', Object.assign(new EventTarget(), { api }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame += 1;
    frames.set(nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});

afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});

/** 等待打开事件中的异步语言切换完成。 */
async function settle(): Promise<void> {
  await new Promise((resolve) => { setTimeout(resolve, 0); });
}

/** 依次执行当前排队的动画帧（含回调中新排的帧）。 */
function flushFrames(): void {
  while (frames.size > 0) {
    const [id, callback] = [...frames.entries()][0];
    frames.delete(id);
    callback(0);
  }
}

/**
 * 按真实组件顺序渲染托盘菜单并为根节点绑定可测量的 ref。
 * @param height - 根节点 offsetHeight。
 * @returns 根组件返回值。
 */
function renderMenu(height = 233): ReturnType<typeof TrayMenu> {
  const view = renderWithHooks(() => TrayMenu());
  if (view) {
    const ref = (view as TestElement).props.ref as { current: unknown } | undefined;
    if (ref) ref.current = { offsetHeight: height };
  }
  return view;
}

/**
 * 首次挂载后模拟主进程打开菜单，返回打开后的渲染结果。
 * @param state - 主进程下发的菜单状态。
 * @returns 打开后的根组件返回值。
 */
async function openWith(state: TrayMenuState): Promise<TestElement> {
  renderMenu();
  runEffects();
  openHandler?.(state);
  await settle();
  const view = renderMenu();
  runEffects();
  return view as TestElement;
}

/**
 * 读取根组件中的菜单项元素。
 * @param view - 根组件返回值。
 * @returns 菜单项元素列表。
 */
function menuItems(view: TestElement): TestElement[] {
  return elements(view).filter((node) => node.type === TrayMenuItem);
}

describe('TrayUserCard', () => {
  it('shows a placeholder and sign-in hint when signed out', () => {
    const view = renderWithHooks(() => TrayUserCard({ user: SIGNED_OUT })) as TestElement;
    expect(view.props.className).toBe('tray-user-card');
    expect(textContent(view)).toBe('?tray.notLoggedIntray.loginHint');
    expect(elements(view).some((node) => node.type === 'img')).toBe(false);
  });

  it('shows avatar, name and email for a regular user without the Pro styling', () => {
    const view = renderWithHooks(() => TrayUserCard({ user: REGULAR })) as TestElement;
    expect(view.props.className).toBe('tray-user-card');
    const avatar = findElement(view, (node) => node.type === 'img');
    expect(avatar.props).toMatchObject({ src: REGULAR.avatar, alt: 'island' });
    expect(textContent(view)).toBe('islandisland@example.com');
  });

  it('uses the gold Pro card, PRO icon and expiry date for Pro users', () => {
    const view = renderWithHooks(() => TrayUserCard({ user: PRO })) as TestElement;
    expect(view.props.className).toBe('tray-user-card tray-user-card-pro');
    expect(findElement(view, (node) => node.props.className === 'tray-user-card-pro-icon').props.alt).toBe('PRO');
    expect(textContent(view)).toContain('tray.proExpireAt:2026-12-01');
    const withoutExpiry = renderWithHooks(() => TrayUserCard({ user: { ...PRO, proExpireDate: null } }));
    expect(textContent(withoutExpiry)).toContain('island@example.com');
  });

  it('falls back to the initial when the avatar fails to load', () => {
    const view = renderWithHooks(() => TrayUserCard({ user: REGULAR })) as TestElement;
    invoke(findElement(view, (node) => node.type === 'img' && node.props.src === REGULAR.avatar), 'onError');
    const retried = renderWithHooks(() => TrayUserCard({ user: REGULAR })) as TestElement;
    expect(elements(retried).some((node) => node.props.src === REGULAR.avatar)).toBe(false);
    expect(findElement(retried, (node) => node.props.className === 'tray-user-card-avatar-placeholder').props.children).toBe('i');
  });
});

describe('TrayMenuItem', () => {
  it('renders a plain enabled item that reports selection', () => {
    const onSelect = vi.fn();
    const view = TrayMenuItem({ label: 'tray.quit', danger: true, onSelect }) as TestElement;
    expect(view.props).toMatchObject({ role: 'menuitem', disabled: false, className: 'tray-menu-item tray-menu-item-danger', 'aria-checked': undefined });
    expect(elements(view).some((node) => node.props.className === 'tray-menu-item-check')).toBe(false);
    invoke(view, 'onClick');
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it.each([true, false])('renders a checkbox item with checked=%s', (checked) => {
    const view = TrayMenuItem({ label: 'tray.alwaysOnTop', checked, disabled: true, onSelect: vi.fn() }) as TestElement;
    expect(view.props).toMatchObject({ role: 'menuitemcheckbox', 'aria-checked': checked, disabled: true, className: 'tray-menu-item' });
    expect(elements(view).some((node) => node.props.className === 'tray-menu-item-check')).toBe(checked);
  });
});

describe('TrayMenu', () => {
  it('subscribes before telling the main process it is mounted and renders nothing until opened', () => {
    expect(renderMenu()).toBeNull();
    runEffects();
    expect(api.onTrayMenuOpen).toHaveBeenCalledOnce();
    expect(api.trayMenuMounted).toHaveBeenCalledOnce();
    expect(api.onTrayMenuOpen.mock.invocationCallOrder[0]).toBeLessThan(api.trayMenuMounted.mock.invocationCallOrder[0]);
    flushFrames();
    expect(api.trayMenuReady).not.toHaveBeenCalled();
  });

  it('renders the user card and configured items, then reports the height two frames later', async () => {
    mocks.summary.mockReturnValue(PRO);
    const view = await openWith(STATE);
    expect(view.props).toMatchObject({ className: 'tray-menu', role: 'menu', 'aria-label': 'tray.menuLabel' });
    expect(findElement(view, (node) => node.type === TrayUserCard).props.user).toBe(PRO);
    const items = menuItems(view);
    expect(items.map((item) => item.props.label)).toEqual(
      TRAY_MENU_ITEMS.flatMap((item) => (item.kind === 'separator' || item.standaloneOnly ? [] : [item.labelKey])),
    );
    expect(elements(view).filter((node) => node.props.className === 'tray-menu-separator')).toHaveLength(2);
    expect(api.trayMenuReady).not.toHaveBeenCalled();
    const [first] = [...frames.values()];
    frames.clear();
    first(0);
    expect(api.trayMenuReady).not.toHaveBeenCalled();
    flushFrames();
    expect(api.trayMenuReady).toHaveBeenCalledWith(233);
  });

  it('shows settings in standalone mode and disables window items without a main window', async () => {
    const view = await openWith({ ...STATE, standaloneMode: true, windowAvailable: false, alwaysOnTop: false });
    const items = menuItems(view);
    const byLabel = (label: string): TestElement => items.find((item) => item.props.label === label)!;
    expect(byLabel('tray.openSettings').props.disabled).toBe(false);
    expect(byLabel('tray.showIsland').props.disabled).toBe(true);
    expect(byLabel('tray.alwaysOnTop').props).toMatchObject({ disabled: true, checked: false });
    expect(byLabel('tray.quit').props).toMatchObject({ disabled: false, danger: true, checked: undefined });
    invoke(byLabel('tray.openSettings'), 'onSelect');
    expect(api.trayMenuAction).toHaveBeenCalledWith('open-settings');
  });

  it('switches language before rendering when the stored language changed', async () => {
    await openWith({ ...STATE, language: 'en-US' });
    expect(mocks.i18n.changeLanguage).toHaveBeenCalledWith('en-US');
    expect(mocks.summary).toHaveBeenCalled();
    await openWith({ ...STATE, language: 'en-US' });
    expect(mocks.i18n.changeLanguage).toHaveBeenCalledOnce();
  });

  it('still opens when switching language fails', async () => {
    mocks.i18n.changeLanguage.mockRejectedValueOnce(new Error('missing resources'));
    const view = await openWith({ ...STATE, language: 'ja-JP' });
    expect(view).not.toBeNull();
    expect(menuItems(view).length).toBeGreaterThan(0);
  });

  it('re-reads the user and re-measures on every open', async () => {
    await openWith(STATE);
    flushFrames();
    mocks.summary.mockReturnValue(SIGNED_OUT);
    openHandler?.({ ...STATE });
    await settle();
    const view = renderMenu(180);
    runEffects();
    flushFrames();
    expect(findElement(view, (node) => node.type === TrayUserCard).props.user).toBe(SIGNED_OUT);
    expect(api.trayMenuReady).toHaveBeenLastCalledWith(180);
    expect(api.trayMenuReady).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape only and releases listeners and pending frames on unmount', async () => {
    await openWith(STATE);
    const key = (value: string): Event => Object.assign(new Event('keydown'), { key: value });
    window.dispatchEvent(key('Enter'));
    expect(api.trayMenuClose).not.toHaveBeenCalled();
    window.dispatchEvent(key('Escape'));
    expect(api.trayMenuClose).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    unmountHooks();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    window.dispatchEvent(key('Escape'));
    expect(api.trayMenuClose).toHaveBeenCalledOnce();
  });
});
