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
 * @file maxExpandShellRuntime.test.tsx
 * @description 全展开壳层真实 Store 与配置 Hook 集成、键盘滚轮导航及应用模式边界测试
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHookReactMock, deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../hooks/test/startupHookHarness';
import type { StateCreator } from 'zustand';
import type { MaxExpandContentShellProps } from '../MaxExpandContentShell';

const context = vi.hoisted(() => ({ active: true }));
vi.doMock('react', async () => ({ ...createHookReactMock(await vi.importActual<typeof import('react')>('react')), useContext: () => context.active }));
vi.doMock('react-i18next', async () => ({ ...await vi.importActual<typeof import('react-i18next')>('react-i18next'), useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
// 仅替换 React 订阅绑定，状态创建、业务 action 及监听均由真实 vanilla Store 执行。
vi.mock('zustand', async (original) => {
  const actual = await original<typeof import('zustand')>();
  const { createStore } = await vi.importActual<typeof import('zustand/vanilla')>('zustand/vanilla');
  const bind = (initializer: StateCreator<unknown>) => {
    const store = createStore(initializer);
    return Object.assign((selector?: (state: unknown) => unknown) => selector ? selector(store.getState()) : store.getState(), store);
  };
  return { ...actual, create: ((initializer?: StateCreator<unknown>) => initializer ? bind(initializer) : bind) as typeof actual.create };
});

class NativeElement extends EventTarget {
  tagName = 'DIV';

  isContentEditable = false;

  excluded = false;

  closest = () => this.excluded ? this : null;
}
let shell: typeof import('../MaxExpandContentShell');
let store: typeof import('../../../../store/slices').default;
let config: typeof import('../components/setting/utils/settingsConfig');
let reads: Map<string, unknown>;
let settings: EventEmitter;
let root: NativeElement;
let nativeWindow: EventTarget;
const renderContent = vi.fn<MaxExpandContentShellProps['renderActiveTab']>((tab, fallback, ready) => ready ? <span>{tab}</span> : fallback);

beforeEach(async () => {
  vi.resetModules(); resetHook(); context.active = true; renderContent.mockClear();
  reads = new Map(); settings = new EventEmitter(); root = new NativeElement();
  vi.stubGlobal('HTMLElement', NativeElement); vi.stubGlobal('Element', NativeElement);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  nativeWindow = Object.assign(new EventTarget(), { requestAnimationFrame, cancelAnimationFrame, localStorage, location: { hostname: 'localhost', pathname: '/DynamicIsland.html' }, matchMedia: () => Object.assign(new EventTarget(), { matches: false }), api: {
    storeRead: (key: string) => Promise.resolve(reads.get(key)),
    onSettingsChanged: (listener: (...args: unknown[]) => void) => { settings.on('changed', listener); return () => settings.off('changed', listener); },
    expandWindowFull: vi.fn(), disableMousePassthrough: vi.fn(),
  }, electron: { ipcRenderer: { send: vi.fn(), on: vi.fn(), removeListener: vi.fn() } } });
  vi.stubGlobal('window', nativeWindow);
  config = await import('../components/setting/utils/settingsConfig');
  store = (await import('../../../../store/slices')).default;
  shell = await import('../MaxExpandContentShell');
  store.setState({ state: 'maxExpand', maxExpandTab: 'todo', maxExpandLauncherVisible: false });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

/** 渲染真实壳层并提交公开根元素与 effect。
 * @param props - 公开壳层参数
 * @returns 真实根元素
 */
function draw(props: Partial<MaxExpandContentShellProps> = {}): React.ReactElement<Record<string, unknown>> {
  const element = renderHook(shell.MaxExpandContentShell, { renderActiveTab: renderContent, ...props }) as React.ReactElement<Record<string, unknown>>;
  (element.props.ref as React.RefObject<NativeElement>).current = root;
  flushHookEffects(); return element;
}
/** 等待配置 Promise 并重新渲染真实 Hook。
 * @param props - 公开壳层参数
 * @returns 读取完成的真实根元素
 */
async function ready(props: Partial<MaxExpandContentShellProps> = {}): Promise<React.ReactElement<Record<string, unknown>>> {
  draw(props); await settleHook(); draw(props); await settleHook(); return draw(props);
}
/** 遍历公开 React 元素。
 * @param element - 元素树
 * @returns 真实元素节点
 */
function nodes(element: React.ReactNode): React.ReactElement<Record<string, unknown>>[] {
  if (!React.isValidElement<Record<string, unknown>>(element)) return [];
  return [element, ...React.Children.toArray(element.props.children as React.ReactNode).flatMap(nodes)];
}
/** 发出浏览器原生键盘事件。
 * @param properties - 原生事件字段
 * @param target - 聚焦元素
 * @returns 事件
 */
function key(properties: Record<string, unknown> = {}, target: EventTarget = nativeWindow): Event {
  const event = new Event('keydown', { cancelable: true });
  Object.entries({ key: 'Tab', repeat: false, shiftKey: false, ...properties }).forEach(([name, value]) => Object.defineProperty(event, name, { value }));
  Object.defineProperty(event, 'target', { value: target }); nativeWindow.dispatchEvent(event); return event;
}

it('holds the requested tab until both real configuration reads finish and cancels on unmount', async () => {
  const pending = deferred<unknown>(); reads.set(config.MAXEXPAND_APP_MODE_ENABLED_STORE_KEY, pending.promise);
  const loading = draw(); expect(renderContent).not.toHaveBeenCalled();
  expect(nodes(loading).find((node) => node.props.className === 'settings-nav-dots')?.props.style).toEqual({ visibility: 'hidden' });
  key(); expect(store.getState().maxExpandTab).toBe('todo'); unmountHook(); pending.resolve(false); await settleHook();
  expect(renderContent).not.toHaveBeenCalled();
});

it('executes forward/backward wheel and keyboard navigation, native exclusions and cleanup', async () => {
  await ready({ deferContent: false });
  const forward = key(); expect(forward.defaultPrevented).toBe(true); expect(store.getState().maxExpandTab).not.toBe('todo'); draw();
  key({ shiftKey: true }); expect(store.getState().maxExpandTab).toBe('todo'); draw();
  ['Enter', 'Tab'].forEach((value) => { const event = key({ key: value, repeat: value === 'Tab' }); expect(event.defaultPrevented).toBe(false); });
  const prevented = new Event('keydown', { cancelable: true }); Object.defineProperty(prevented, 'key', { value: 'Tab' }); prevented.preventDefault(); nativeWindow.dispatchEvent(prevented);
  ['INPUT','TEXTAREA','SELECT','DIV'].forEach((tag) => { const target = new NativeElement(); target.tagName = tag; target.isContentEditable = tag === 'DIV'; expect(key({},target).defaultPrevented).toBe(false); });
  [10,-10].forEach((deltaY) => { const event = new Event('wheel', { cancelable: true }); Object.defineProperty(event,'deltaY',{ value:deltaY }); root.dispatchEvent(event); expect(event.defaultPrevented).toBe(true); draw(); });
  root.excluded = true; const excluded = new Event('wheel', { cancelable: true }); root.dispatchEvent(excluded); expect(excluded.defaultPrevented).toBe(false);
  const current = store.getState().maxExpandTab; unmountHook(); key(); expect(store.getState().maxExpandTab).toBe(current);
});

it('uses real navigation callbacks, slide direction, animation broadcasts and expanded action', async () => {
  let element = await ready({ deferContent: false });
  const buttons = nodes(element).filter((node) => node.type === 'button');
  const last = buttons.at(-1)!; (last.props.onClick as () => void)(); expect(store.getState().maxExpandTab).toBe('settings'); element = draw({ deferContent:false });
  (buttons[1].props.onClick as () => void)(); element = draw({ deferContent:false }); expect(nodes(element).some((node) => node.props.className === 'max-expand-tab-transition max-expand-tab-slide-left')).toBe(true);
  settings.emit('changed','settings:maxexpand-tab-animation',false); element = draw({ deferContent:false }); expect(nodes(element).some((node) => node.props.className === 'max-expand-tab-transition')).toBe(true);
  const stopPropagation = vi.fn(); nodes(element).filter((node) => typeof node.props.onClick === 'function' && node.type === 'div').forEach((node) => (node.props.onClick as (event: unknown) => void)({ stopPropagation })); expect(stopPropagation).toHaveBeenCalledTimes(2);
  (buttons[0].props.onClick as () => void)(); expect(store.getState().state).toBe('expanded');
});

it('keeps inactive content unchanged and replaces a hidden active tab after real normalized layout broadcast', async () => {
  context.active = false; await ready(); const hidden = config.MAXEXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible: false }));
  settings.emit('changed',`store:${config.MAXEXPAND_NAV_LAYOUT_STORE_KEY}`,hidden); draw(); expect(store.getState().maxExpandTab).toBe('todo');
  context.active = true; draw(); expect(store.getState().maxExpandTab).toBe('settings');
});

it('renders real app navigation and exposes real launcher/select/expanded actions', async () => {
  reads.set(config.MAXEXPAND_APP_MODE_ENABLED_STORE_KEY,true); let element = await ready({ deferContent:false });
  const navigation = nodes(element).find((node) => typeof node.props.onBackToLauncher === 'function')!;
  expect(navigation.props.launcherVisible).toBe(false); (navigation.props.onBackToLauncher as () => void)(); element = draw({ deferContent:false }); expect(element.props.className).toContain('max-expand-app-mode-launcher');
  const launcher = nodes(element).find((node) => typeof node.props.onSelectApp === 'function')!;
  (launcher.props.onSelectApp as (id: string) => void)('calculator'); expect(store.getState().maxExpandTab).toBe('calculator'); expect(store.getState().maxExpandLauncherVisible).toBe(false);
  (launcher.props.onBackToExpanded as () => void)(); expect(store.getState().state).toBe('expanded');
});

it('collapses a standalone shell with all configured applications hidden', async () => {
  reads.set('standalone-window-mode','standalone');
  reads.set(config.MAXEXPAND_NAV_LAYOUT_STORE_KEY,config.MAXEXPAND_CONFIGURABLE_TABS.map((id) => ({ id, visible:false })));
  vi.resetModules(); resetHook(); store = (await import('../../../../store/slices')).default; shell = await import('../MaxExpandContentShell');
  store.setState({ state:'maxExpand', maxExpandTab:'todo' });
  const element = await ready({ deferContent:false });
  expect(store.getState().state).toBe('expanded');
  expect(nodes(element).filter((node) => node.type === 'button')).toHaveLength(1);
  expect(key().defaultPrevented).toBe(false);
  expect(store.getState().maxExpandTab).toBe('todo');
});

it('resolves a pending standalone startup configuration after the shell mounts', async () => {
  const startup = deferred<unknown>(); reads.set('standalone-window-mode',startup.promise);
  vi.resetModules(); resetHook(); store = (await import('../../../../store/slices')).default; shell = await import('../MaxExpandContentShell');
  draw({ deferContent:false }); startup.resolve('standalone'); await settleHook();
  const element = await ready({ deferContent:false });
  expect(nodes(element).filter((node) => node.type === 'button').some((node) => node.props.title === 'maxExpand.nav.settings')).toBe(false);
});
