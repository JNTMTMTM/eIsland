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
 * @file maxExpandContentShell.test.ts
 * @description 应用导航壳层的可见性、返回操作与传统导航恢复回归测试。
 * @author 鸡哥
 */

import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaxExpandContentShell } from '../MaxExpandContentShell';
import { MaxExpandAppNavigation } from '../components/app';
import type { IslandSlice, MaxExpandTab } from '../../../../store/types';

// 保留 Hook 依赖和清理，使用原生 EventTarget 验证注册到窗口及内容容器的交互。
const hooks = vi.hoisted(() => ({
  cursor: 0,
  refs: [] as { current: unknown }[],
  states: [] as unknown[],
  memos: [] as { deps: unknown[]; value: unknown }[],
  effects: [] as { deps: unknown[]; cleanup?: () => void }[],
  pending: [] as (() => void)[],
}));
const mocks = vi.hoisted(() => ({
  store: {} as Pick<IslandSlice, 'maxExpandTab' | 'maxExpandLauncherVisible' | 'setExpanded' | 'setMaxExpandTab' | 'showMaxExpandLauncher'>,
  appMode: { appModeEnabled: true, appModeLoaded: true },
  navLayout: { navLayoutConfig: [] as { id: string; visible: boolean }[], navLayoutLoaded: true },
  useNavLayout: vi.fn(),
  contentActive: true,
  startupMode: 'integrated',
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      const index = hooks.cursor++;
      if (!(index in hooks.states)) hooks.states[index] = initial;
      return [hooks.states[index], (value: unknown) => { hooks.states[index] = value; }];
    },
    useRef: (value: unknown) => hooks.refs[hooks.cursor++] ??= { current: value },
    useMemo: (factory: () => unknown, deps: unknown[]) => {
      const index = hooks.cursor++;
      const prior = hooks.memos[index];
      if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: factory() };
      return hooks.memos[index].value;
    },
    useCallback: (callback: unknown, deps: unknown[]) => {
      const index = hooks.cursor++;
      const prior = hooks.memos[index];
      if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) hooks.memos[index] = { deps, value: callback };
      return hooks.memos[index].value;
    },
    useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
      const index = hooks.cursor++;
      const prior = hooks.effects[index];
      if (!prior || deps.some((dep, i) => dep !== prior.deps[i])) {
        hooks.pending.push(() => {
          prior?.cleanup?.();
          hooks.effects[index] = { deps, cleanup: effect() };
        });
      }
    },
  };
});
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
vi.mock('../../../../store/slices', () => ({ default: (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store) }));
vi.mock('../../../hooks/islandContentActivity', () => ({ useIslandContentActive: () => mocks.contentActive }));
vi.mock('../hooks/useAppMode', () => ({ useAppMode: () => mocks.appMode }));
vi.mock('../hooks/useNavLayout', () => ({ useNavLayout: mocks.useNavLayout }));
vi.mock('../hooks/useContentReady', () => ({ useContentReady: () => true }));
vi.mock('../hooks/useTabAnimation', () => ({ useTabAnimation: () => false }));
vi.mock('../hooks/useWheelNavigation', () => ({ shouldIgnoreWheelEvent: () => false }));
vi.mock('../config/shellConstants', () => ({
  getStartupMode: () => mocks.startupMode,
  getStartupModeReady: () => Promise.resolve(),
  isStartupModeResolved: () => true,
}));
vi.mock('../maxExpandLoading', () => ({ default: () => createElement('div', { 'data-loading': true }) }));
vi.mock('../components/app', () => ({
  default: (props: { onSelectApp: (tab: MaxExpandTab) => void }) => createElement('button', {
    'data-launcher': true,
    onClick: () => props.onSelectApp('calendar'),
  }),
  MaxExpandAppNavigation: (props: {
    launcherVisible: boolean;
    onSelectApp: (tab: MaxExpandTab) => void;
    onBackToLauncher: () => void;
    children: ReactNode;
  }) => createElement('div', {
    'data-app-navigation': true,
    'data-launcher-visible': props.launcherVisible,
  },
  createElement('button', {
    'data-launcher': true,
    hidden: !props.launcherVisible,
    onClick: () => props.onSelectApp('calendar'),
  }),
  !props.launcherVisible && createElement('div', {}, props.children, createElement('button', {
    'data-home-control': true,
    onClick: props.onBackToLauncher,
  }))),
}));

interface TreeProps {
  children?: ReactNode;
  ref?: { current: unknown };
  activeTab?: MaxExpandTab;
  launcherVisible?: boolean;
  animationEnabled?: boolean;
  contentActive?: boolean;
  onSelectApp?: (tab: MaxExpandTab) => void;
  onBackToExpanded?: () => void;
  onBackToLauncher?: () => void;
}

function findComponent(tree: ReactNode, type: unknown): ReactElement<TreeProps> | undefined {
  if (!isValidElement<TreeProps>(tree)) return undefined;
  if (tree.type === type) return tree;
  return Children.toArray(tree.props.children)
    .map((child) => findComponent(child, type))
    .find((child) => child !== undefined);
}

describe('MaxExpandContentShell app mode', () => {
  let content: EventTarget;
  const renderActiveTab = vi.fn((tab: MaxExpandTab) => createElement('section', { 'data-active-app': tab }));

  function render(): { tree: ReactElement<TreeProps>; markup: string } {
    hooks.cursor = 0;
    const tree = MaxExpandContentShell({ renderActiveTab }) as ReactElement<TreeProps>;
    if (tree.props.ref) tree.props.ref.current = content;
    hooks.pending.splice(0).forEach((effect) => effect());
    return { tree, markup: renderToStaticMarkup(tree) };
  }

  function pressTab(): Event {
    const event = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Tab', repeat: false, shiftKey: false });
    window.dispatchEvent(event);
    return event;
  }

  function wheel(): Event {
    const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 1 });
    content.dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    hooks.cursor = 0;
    hooks.refs = [];
    hooks.states = [];
    hooks.memos = [];
    hooks.effects = [];
    hooks.pending = [];
    mocks.store = {
      maxExpandTab: 'todo',
      maxExpandLauncherVisible: true,
      setExpanded: vi.fn(),
      setMaxExpandTab: vi.fn((tab: MaxExpandTab) => {
        mocks.store.maxExpandTab = tab;
        mocks.store.maxExpandLauncherVisible = false;
      }),
      showMaxExpandLauncher: vi.fn(() => { mocks.store.maxExpandLauncherVisible = true; }),
    };
    mocks.appMode = { appModeEnabled: true, appModeLoaded: true };
    mocks.navLayout = {
      navLayoutConfig: [{ id: 'calendar', visible: true }, { id: 'todo', visible: true }, { id: 'alarm', visible: false }],
      navLayoutLoaded: true,
    };
    mocks.useNavLayout.mockImplementation(() => mocks.navLayout);
    mocks.contentActive = true;
    mocks.startupMode = 'integrated';
    content = new EventTarget();
    vi.stubGlobal('window', new EventTarget());
    vi.stubGlobal('HTMLElement', class {});
  });

  afterEach(() => {
    hooks.effects.forEach((effect) => effect?.cleanup?.());
    vi.unstubAllGlobals();
  });

  it('全部传统页面隐藏时仍显示导航页，不显示控制条或被踢回 expanded', () => {
    mocks.startupMode = 'standalone';
    mocks.navLayout.navLayoutConfig = mocks.navLayout.navLayoutConfig.map((item) => ({ ...item, visible: false }));
    const { markup } = render();

    expect(markup).toContain('data-launcher="true"');
    expect(markup).toContain('data-launcher-visible="true"');
    expect(markup).not.toContain('data-home-control');
    expect(markup).not.toContain('settings-nav-dots');
    expect(renderActiveTab).not.toHaveBeenCalled();
    expect(mocks.store.setExpanded).not.toHaveBeenCalled();
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
    expect(mocks.useNavLayout).toHaveBeenLastCalledWith(false);
  });

  it('点击应用后渲染该应用和控制条，返回导航页后卸载应用', () => {
    const home = render();
    const homeNavigation = findComponent(home.tree, MaxExpandAppNavigation);
    expect(homeNavigation?.props).toMatchObject({
      activeTab: 'todo',
      launcherVisible: true,
      animationEnabled: false,
      contentActive: true,
    });
    homeNavigation?.props.onSelectApp?.('calendar');
    const application = render();
    const appNavigation = findComponent(application.tree, MaxExpandAppNavigation);

    expect(application.markup).toContain('data-active-app="calendar"');
    expect(application.markup).toContain('data-home-control="true"');
    expect(application.markup).toContain('data-launcher-visible="false"');
    expect(application.markup).toContain('data-launcher="true" hidden=""');
    expect(application.markup).not.toContain('settings-nav-dots');
    expect(appNavigation?.props).toMatchObject({ activeTab: 'calendar', launcherVisible: false });

    appNavigation?.props.onBackToLauncher?.();
    renderActiveTab.mockClear();
    const returnedHome = render().markup;
    expect(returnedHome).toContain('data-launcher="true"');
    expect(returnedHome).toContain('data-launcher-visible="true"');
    expect(returnedHome).not.toContain('data-home-control');
    expect(renderActiveTab).not.toHaveBeenCalled();
    expect(mocks.store.showMaxExpandLauncher).toHaveBeenCalledOnce();
  });

  it('应用控制条返回展开界面时不打开应用导航页或切换应用', () => {
    mocks.store.maxExpandLauncherVisible = false;
    const application = render();
    const navigation = findComponent(application.tree, MaxExpandAppNavigation);

    expect(navigation?.props.onBackToExpanded).toBe(mocks.store.setExpanded);
    navigation?.props.onBackToExpanded?.();

    expect(mocks.store.setExpanded).toHaveBeenCalledOnce();
    expect(mocks.store.showMaxExpandLauncher).not.toHaveBeenCalled();
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
  });

  it('配置读取前保留指定应用且不注册传统 Tab 或滚轮处理', () => {
    mocks.appMode = { appModeEnabled: false, appModeLoaded: false };
    mocks.store.maxExpandTab = 'alarm';
    const { markup } = render();

    expect(markup).toContain('data-loading="true"');
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
    expect(pressTab().defaultPrevented).toBe(false);
    expect(wheel().defaultPrevented).toBe(false);
    expect(mocks.useNavLayout).toHaveBeenLastCalledWith(false);
  });

  it('关闭应用化模式后恢复保存的可见性与顺序，再次开启后移除传统监听', () => {
    mocks.store.maxExpandTab = 'alarm';
    mocks.store.maxExpandLauncherVisible = false;
    render();
    expect(pressTab().defaultPrevented).toBe(false);
    expect(wheel().defaultPrevented).toBe(false);
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();

    mocks.appMode.appModeEnabled = false;
    const legacy = render();
    expect(mocks.store.setMaxExpandTab).toHaveBeenLastCalledWith('calendar');
    expect(legacy.markup).toContain('settings-nav-dots');
    expect(legacy.markup).not.toContain('data-home-control');
    expect(legacy.markup).not.toContain('data-app-navigation');
    expect(legacy.markup.indexOf('title="maxExpand.nav.calendar"')).toBeLessThan(legacy.markup.indexOf('title="maxExpand.nav.todo"'));
    expect(legacy.markup).not.toContain('title="maxExpand.nav.alarm"');
    render();
    expect(pressTab().defaultPrevented).toBe(true);
    expect(mocks.store.maxExpandTab).toBe('todo');
    render();
    expect(wheel().defaultPrevented).toBe(true);
    expect(mocks.store.maxExpandTab).toBe('settings');

    mocks.appMode.appModeEnabled = true;
    render();
    vi.mocked(mocks.store.setMaxExpandTab).mockClear();
    expect(pressTab().defaultPrevented).toBe(false);
    expect(wheel().defaultPrevented).toBe(false);
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
  });

  it('传统布局重新读取期间不校正应用或响应切页输入', () => {
    mocks.appMode.appModeEnabled = false;
    mocks.navLayout.navLayoutLoaded = false;
    mocks.store.maxExpandTab = 'alarm';
    render();

    expect(pressTab().defaultPrevented).toBe(false);
    expect(wheel().defaultPrevented).toBe(false);
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
  });

  it('退出时保留的隐藏壳层不纠正页面，也不响应导航输入', () => {
    mocks.appMode.appModeEnabled = false;
    mocks.contentActive = false;
    mocks.store.maxExpandTab = 'alarm';
    render();

    expect(pressTab().defaultPrevented).toBe(false);
    expect(wheel().defaultPrevented).toBe(false);
    expect(mocks.store.setMaxExpandTab).not.toHaveBeenCalled();
    expect(mocks.store.setExpanded).not.toHaveBeenCalled();
  });
});
