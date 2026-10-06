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
 * @file guideContentLifecycle.test.tsx
 * @description 验证真实引导页导航与子页面、登录态过滤、独立窗口账号意图及版本完成标记。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, runEffects, unmountHooks } from '../../../components/test/contentLifecycleHarness';
import { elements, findElement, hookMocks, invoke, textContent } from '../../../test/elementHarness';
import useIslandStore from '../../../../store/slices';
import i18n from '../../../../i18n';
import { api, browser, resetBrowser, settle, storage } from '../../register/hooks/test/authHookHarness';
import { GuideContent } from '../GuideContent';
import { GuideFooter } from '../components/GuideFooter';
import { GuideStaticPage } from '../components/GuideStaticPage';
import { GuideInteractivePage } from '../components/GuideInteractivePage';

vi.hoisted(() => {
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { hostname: 'localhost' }, api: {}, matchMedia: () => ({ matches: false, addEventListener: () => {} }) }));
  vi.stubGlobal('localStorage', { getItem: () => null });
});
vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({ ...await load<typeof import('react-i18next')>(), useTranslation: () => ({ t: i18n.t }) }));
vi.mock('../../../../store/slices', async (load) => {
  const actual = await load<typeof import('../../../../store/slices')>();
  return { ...actual, default: Object.assign(() => actual.default.getState(), actual.default) };
});
const openStandaloneWindow = vi.fn<() => Promise<void>>();

/** 求值真实引导、导航Hook和效果。
 * @returns 真实引导元素树。
 */
function render() {
  const tree = renderWithHooks(GuideContent);
  runEffects();
  return tree;
}
/** 执行真实页脚纯子组件。
 * @returns 真实页脚按钮元素树。
 */
function footer() {
  const node = findElement(render(), ({ type }) => type === GuideFooter);
  return GuideFooter(node.props as unknown as Parameters<typeof GuideFooter>[0]);
}
/** 用真实页脚公开按钮选择页面。
 * @param page - 可见页面按钮索引。
 * @returns 无返回值。
 */
function select(page: number): void {
  const buttons = elements(footer()).filter(({ type, props }) => type === 'button' && String(props.className).includes('guide-nav-dot'));
  invoke(buttons[page], 'onClick');
  render();
}
/** 执行真实静态页纯子组件的账号按钮。
 * @param target - 登录或注册。
 * @returns 无返回值。
 */
function openAuth(target: 'login' | 'register'): void {
  const node = findElement(render(), ({ type }) => type === GuideStaticPage);
  const tree = GuideStaticPage(node.props as unknown as Parameters<typeof GuideStaticPage>[0]);
  invoke(findElement(tree, ({ props }) => String(props.className).includes(target === 'login' ? 'guide-btn-primary' : 'guide-btn-secondary')), 'onClick');
}

describe('引导页真实导航、登录态与独立窗口组合', () => {
  beforeEach(() => {
    resetBrowser();
    Object.assign(browser, { api: { openStandaloneWindow, ...api } });
    api.storeRead.mockReset().mockResolvedValue('integrated');
    api.storeWrite.mockReset().mockResolvedValue();
    api.updaterVersion.mockReset().mockResolvedValue('1.0.0');
    openStandaloneWindow.mockReset().mockResolvedValue();
    useIslandStore.setState({ state: 'guide', uiStateLocked: false });
  });
  afterEach(async () => {
    const node = findElement(render(), ({ type }) => type === GuideFooter);
    invoke(node, 'onFinish');
    await settle();
    unmountHooks();
    vi.unstubAllGlobals();
  });

  it('根点击停止冒泡，下一页按钮执行真实导航并呈现对应演示', () => {
    const stopPropagation = vi.fn();
    invoke(findElement(render(), ({ props }) => props.className === 'guide-content'), 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    invoke(findElement(footer(), ({ props }) => String(props.className).includes('guide-btn-primary')), 'onClick');
    const node = findElement(render(), ({ type }) => type === GuideInteractivePage);
    expect(node.props.page).toBe(1);
    const tree = GuideInteractivePage(node.props as unknown as Parameters<typeof GuideInteractivePage>[0]);
    expect(textContent(tree)).toContain(i18n.t('guide.interactionCards.scroll.title'));
    expect(elements(tree).some(({ props }) => props.demo === 'scroll')).toBe(true);
  });

  it.each([[1, 'scroll'], [2, 'smtc'], [3, 'todo'], [4, 'theme']] as const)('真实导航到交互页 %i 使用演示 %s', (page, demo) => {
    select(page);
    const node = findElement(render(), ({ type }) => type === GuideInteractivePage);
    const tree = GuideInteractivePage(node.props as unknown as Parameters<typeof GuideInteractivePage>[0]);
    expect(elements(tree).some(({ props }) => props.demo === demo)).toBe(true);
  });

  it('版本IPC拒绝时仍完成引导且不写入版本标记', async () => {
    api.updaterVersion.mockRejectedValue(new Error('version unavailable'));
    const node = findElement(render(), ({ type }) => type === GuideFooter);
    invoke(node, 'onFinish');
    await settle();
    expect(useIslandStore.getState().state).toBe('idle');
    expect(api.storeWrite).not.toHaveBeenCalled();
  });

  it('已登录时真实本地token过滤账号引导页', () => {
    storage.set('user-account-token', 'valid-token');
    const node = findElement(render(), ({ type }) => type === GuideFooter);
    expect(node.props.pageCount).toBe(5);
    select(4);
    expect(findElement(render(), ({ type }) => type === GuideFooter).props.isLast).toBe(true);
  });

  it.each(['login', 'register'] as const)('集成模式 %s 按钮执行真实Store状态导航', async (target) => {
    select(5);
    openAuth(target);
    await settle();
    expect(useIslandStore.getState().state).toBe(target);
    expect(openStandaloneWindow).not.toHaveBeenCalled();
  });

  it.each(['login', 'register'] as const)('独立模式 %s 按钮写入设置页意图并打开窗口', async (target) => {
    api.storeRead.mockResolvedValue('standalone');
    select(5);
    openAuth(target);
    await settle();
    expect(api.storeWrite.mock.calls).toEqual([
      ['standalone-window-active-tab', 'settings'], ['standalone-window-auth-intent', target],
    ]);
    expect(openStandaloneWindow).toHaveBeenCalledOnce();
    expect(useIslandStore.getState().state).toBe('guide');
  });

  it('独立模式写入和窗口拒绝各自被处理，仍按顺序完成调用', async () => {
    api.storeRead.mockResolvedValue('standalone');
    api.storeWrite.mockRejectedValue(new Error('disk unavailable'));
    openStandaloneWindow.mockRejectedValue(new Error('window unavailable'));
    select(5);
    openAuth('login');
    await settle();
    expect(api.storeWrite).toHaveBeenCalledTimes(2);
    expect(openStandaloneWindow).toHaveBeenCalledOnce();
    expect(useIslandStore.getState().state).toBe('guide');
  });

  it.each(['', '2.0.0'])('完成引导按真实版本 %s 判定写入标记', async (version) => {
    api.updaterVersion.mockResolvedValue(version);
    select(5);
    invoke(findElement(footer(), ({ props }) => String(props.className).includes('guide-btn-primary')), 'onClick');
    await settle();
    expect(useIslandStore.getState().state).toBe('idle');
    if (version) expect(api.storeWrite).toHaveBeenCalledExactlyOnceWith('guide-shown-version', version);
    else expect(api.storeWrite).not.toHaveBeenCalled();
  });
});
