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
 * @file expandedContent.test.tsx
 * @description 展开态全部页面渲染、导航方向、最大展开模式入口和未激活边界测试。
 * @author 鸡哥
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, nodes, render, text, value } from '../../../maxExpand/test/componentHarness';
import { fire } from '../../../maxExpand/components/tools/components/test/toolTestEvents';
import { ExpandedContent } from '../ExpandedContent';

const mocks = vi.hoisted(() => ({
  active: true, animation: true, app: false, loaded: true, startup: 'integrated', tab: 'overview',
  maxTab: 'todo', expand: vi.fn(), hover: vi.fn(), max: vi.fn(), selectMax: vi.fn(), launcher: vi.fn(),
  preload: vi.fn(), wheel: vi.fn(), pages: Array.from({ length: 6 }, () => () => null),
  nav: [{ id: 'overview', visible: true }, { id: 'song', visible: true }, { id: 'tools', visible: true }, { id: 'translation', visible: true }, { id: 'performanceMonitor', visible: true }, { id: 'agentUsage', visible: true }],
  maxNav: [{ id: 'todo', visible: true }, { id: 'album', visible: true }],
}));
vi.mock('../../../../../store/slices', () => ({ default: (selector: (state: object) => unknown) => selector({
  expandTab: mocks.tab, maxExpandTab: mocks.maxTab, setExpandTab: mocks.expand, setHover: mocks.hover,
  setMaxExpand: mocks.max, setMaxExpandTab: mocks.selectMax, showMaxExpandLauncher: mocks.launcher,
}) }));
vi.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
vi.mock('../../../../hooks/islandContentActivity', () => ({ useIslandContentActive: () => mocks.active }));
vi.mock('../../hooks/useExpandNavLayout', () => ({ useExpandNavLayout: () => ({
  navLayoutConfig: mocks.nav, maxExpandNavLayoutConfig: mocks.maxNav, preloadEagerWhenPerformanceModeDisabled: mocks.preload,
}) }));
vi.mock('../../hooks/useExpandTabAnimation', () => ({ useExpandTabAnimation: () => mocks.animation }));
vi.mock('../../hooks/useExpandWheelNav', () => ({ useExpandWheelNav: mocks.wheel }));
vi.mock('../../../maxExpand/hooks/useAppMode', () => ({ useAppMode: () => ({ appModeEnabled: mocks.app, appModeLoaded: mocks.loaded }) }));
vi.mock('../../../maxExpand/config/shellConstants', () => ({
  isStartupModeResolved: () => true, getStartupMode: () => mocks.startup, getStartupModeReady: () => Promise.resolve(),
}));
vi.mock('../../pages/OverviewTab', () => ({ OverviewTab: mocks.pages[0] }));
vi.mock('../../pages/SongTab', () => ({ SongTab: mocks.pages[1] }));
vi.mock('../../pages/ToolsTab', () => ({ ToolsTab: mocks.pages[2] }));
vi.mock('../../pages/TranslationTab', () => ({ TranslationTab: mocks.pages[3] }));
vi.mock('../../pages/PerformanceMonitorTab', () => ({ PerformanceMonitorTab: mocks.pages[4] }));
vi.mock('../../pages/AgentUsageTab', () => ({ AgentUsageTab: mocks.pages[5] }));

/** 展开内容区与导航点子组件，保留页面组件边界，使断言覆盖面板的真实输出。
 * @param tree - 元素树
 * @returns 展开后的元素树
 */
function expandParts(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(expandParts);
  if (!isValidElement<Record<string, unknown>>(tree)) return tree;
  if (typeof tree.type === 'function' && ['ExpandedTabContent', 'ExpandedNavDots'].includes(tree.type.name)) {
    return expandParts((tree.type as (props: object) => ReactNode)(tree.props));
  }
  const children = tree.props.children as ReactNode;
  return { ...tree, props: { ...tree.props, children: Array.isArray(children) ? children.map(expandParts) : expandParts(children) } } as ReactElement;
}

/** 渲染真实面板并展开内部子组件。
 * @returns 元素树
 */
function view(): ReactNode {
  return expandParts(render(ExpandedContent));
}

describe('ExpandedContent', () => {
  beforeEach(() => {
    mocks.active = true; mocks.animation = true; mocks.app = false; mocks.loaded = true;
    mocks.startup = 'integrated'; mocks.tab = 'overview'; mocks.maxTab = 'todo';
    mocks.nav = ['overview', 'song', 'tools', 'translation', 'performanceMonitor', 'agentUsage'].map((id) => ({ id, visible: true }));
    mocks.maxNav = [{ id: 'todo', visible: true }, { id: 'album', visible: true }];
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it.each(['overview', 'song', 'tools', 'translation', 'performanceMonitor', 'agentUsage'] as const)('渲染 %s 实际页面选择与导航激活', (tab) => {
    mocks.tab = tab;
    const tree = view();
    expect(nodes(tree, mocks.pages[['overview', 'song', 'tools', 'translation', 'performanceMonitor', 'agentUsage'].indexOf(tab)])).toHaveLength(1);
    expect(nodes(tree, '.expand-nav-dot')).toHaveLength(8);
    const selected = nodes(tree, '.expand-nav-dot').find((node) => String(node.props.className).includes('active'));
    expect(selected?.props.title).toContain(tab);
  });

  it('点击导航设置方向动画和目标页，容器阻止冒泡，返回hover', () => {
    fire(view(), '.expand-nav-dot', 'onClick', 2);
    expect(mocks.expand).toHaveBeenCalledWith('song');
    expect(value(view(), '.expand-tab-transition', 'className')).toContain('slide-right');
    mocks.tab = 'song';
    fire(view(), '.expand-nav-dot', 'onClick', 1);
    expect(value(view(), '.expand-tab-transition', 'className')).toContain('slide-left');
    mocks.animation = false;
    expect(value(view(), '.expand-tab-transition', 'className')).toBe('expand-tab-transition');
    const event = { stopPropagation: vi.fn() };
    fire(view(), '.expand-tab-content', 'onClick', 0, event);
    fire(view(), '.expand-nav-dots', 'onClick', 0, event);
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
    fire(view(), '.expand-nav-dot', 'onClick', 0);
    expect(mocks.hover).toHaveBeenCalledOnce();
  });

  it('未激活面板的点击不切换任何页', () => {
    mocks.active = false;
    const tree = view();
    nodes(tree, '.expand-nav-dot').forEach((node) => { (node.props.onClick as () => void)(); });
    expect(mocks.expand).not.toHaveBeenCalled(); expect(mocks.hover).not.toHaveBeenCalled(); expect(mocks.max).not.toHaveBeenCalled();
  });

  it('最大展开保留可见的当前页，隐藏当前页则选择第一可见页', () => {
    let tree = view();
    fire(tree, '.expand-nav-dot', 'onClick', nodes(tree, '.expand-nav-dot').length - 1);
    expect(mocks.selectMax).not.toHaveBeenCalled(); expect(mocks.preload).toHaveBeenCalledOnce(); expect(mocks.max).toHaveBeenCalledOnce();
    mocks.maxTab = 'calendar';
    tree = view();
    fire(tree, '.expand-nav-dot', 'onClick', nodes(tree, '.expand-nav-dot').length - 1);
    expect(mocks.selectMax).toHaveBeenCalledWith('todo');
  });

  it('应用模式打开启动器，未加载或独立模式无可见应用隐藏最大展开入口', async () => {
    mocks.app = true;
    fire(view(), '.expand-nav-dot', 'onClick', 7);
    expect(mocks.launcher).toHaveBeenCalledOnce();
    mocks.app = false; mocks.loaded = false;
    expect(nodes(view(), '.expand-nav-dot')).toHaveLength(7);
    mocks.loaded = true; mocks.startup = 'standalone'; mocks.maxNav = [];
    flushEffects(); await Promise.resolve();
    expect(nodes(view(), '.expand-nav-dot')).toHaveLength(7);
  });

  it('集成模式无可见应用时回到设置；隐藏展开页通过effect纠正', async () => {
    mocks.maxNav = []; mocks.maxTab = 'calendar';
    fire(view(), '.expand-nav-dot', 'onClick', 7);
    expect(mocks.selectMax).toHaveBeenCalledWith('settings');
    mocks.nav = [{ id: 'overview', visible: false }, { id: 'song', visible: true }];
    const tree = view();
    expect(nodes(tree, '.expand-nav-dot')).toHaveLength(3);
    flushEffects(); await Promise.resolve();
    expect(mocks.expand).toHaveBeenCalledWith('song');
    expect(text(tree)).toBe('');
  });
});
