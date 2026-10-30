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
 * @file agentQuotaWidget.test.tsx
 * @description AgentQuotaWidget 骨架加载、额度行与提示渲染、失败态、标题跳转与可见性轮询测试。
 * @author 鸡哥
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, invoke, text } from '../../../../../../test/tree';
import { AgentIcon } from '../../../../../../../../utils/SvgIcon';
import type { AgentUsageProviderSnapshot, AgentUsageSnapshot } from '../../../../../../../../../preload/types/agentUsage';

const leaves = vi.hoisted(() => ({
  snapshot: vi.fn<() => Promise<unknown>>(),
  setExpandTab: vi.fn<(tab: string) => void>(),
}));
vi.mock('../../../../../../../../store/slices', () => ({
  default: (selector: (store: { setExpandTab: (tab: string) => void }) => unknown) => selector({ setExpandTab: leaves.setExpandTab }),
}));

const NOW = Date.UTC(2026, 9, 30, 4, 0, 0);
let Widget: typeof import('../AgentQuotaWidget').AgentQuotaWidget;
let documentTarget: EventTarget & { hidden: boolean };

const tokens = (total: number) => ({ total, input: total, output: 0, cacheRead: 0, cacheWrite: 0 });

function provider(overrides: Partial<AgentUsageProviderSnapshot>): AgentUsageProviderSnapshot {
  return { provider: 'claude', available: true, today: tokens(8_332_768), week: tokens(9_000_000), todaySessions: 1, topModel: null, rateLimits: null, ...overrides };
}

function snapshot(providers: AgentUsageProviderSnapshot[]): AgentUsageSnapshot {
  return { providers, generatedAt: NOW };
}

/**
 * 展开私有函数组件，使断言覆盖条目与额度行的真实输出。
 * @param tree - 元素树
 * @returns 展开后的元素树
 */
function deep(tree: ReactNode): ReactNode {
  if (Array.isArray(tree)) return tree.map(deep);
  if (!isValidElement<Record<string, unknown>>(tree)) return tree;
  if (typeof tree.type === 'function') return deep((tree.type as (props: object) => ReactNode)(tree.props));
  const children = tree.props.children as ReactNode;
  return { ...tree, props: { ...tree.props, children: Array.isArray(children) ? children.map(deep) : deep(children) } } as ReactElement;
}

function run(): ReactElement {
  return deep(renderHook(Widget)) as ReactElement;
}

async function mount(): Promise<void> {
  run();
  flushHookEffects();
  await vi.advanceTimersByTimeAsync(200);
  await settleHook();
  run();
  flushHookEffects();
}

beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  documentTarget = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', documentTarget);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    setTimeout, clearTimeout, setInterval, clearInterval,
    api: { agentUsageSnapshotGet: leaves.snapshot },
  }));
  Widget = (await import('../AgentQuotaWidget')).AgentQuotaWidget;
});

afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AgentQuotaWidget', () => {
  it('首次挂载显示带来源图标的骨架，延迟后才请求快照', async () => {
    leaves.snapshot.mockReturnValue(new Promise(() => {}));
    run();
    flushHookEffects();
    const skeleton = byClass(run(), 'ov-dash-agent-quota-skeleton');
    expect(skeleton.props['aria-hidden']).toBe('true');
    expect(elements(skeleton).filter((node) => node.props.className === 'ov-dash-agent-quota-icon').map((node) => node.props.src)).toEqual([AgentIcon.CLAUDE, AgentIcon.CODEX]);
    expect(leaves.snapshot).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(leaves.snapshot).toHaveBeenCalledOnce();
  });

  it('Codex 按窗口展示额度条与警示色，Claude 展示今日 token 与无额度提示', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([
      provider({}),
      provider({
        provider: 'codex',
        today: tokens(1_200_000),
        rateLimits: {
          primary: { usedPercent: 95, windowMinutes: 300, resetsAt: NOW + 3_600_000 },
          secondary: { usedPercent: 40, windowMinutes: 10080, resetsAt: NOW - 1 },
          planType: 'plus',
          updatedAt: NOW,
        },
      }),
    ]));
    await mount();
    const tree = run();
    const items = elements(tree).filter((node) => String(node.props.className).startsWith('ov-dash-agent-quota-item '));
    expect(items.map((node) => byClass(node, 'ov-dash-agent-quota-icon').props.src)).toEqual([AgentIcon.CLAUDE, AgentIcon.CODEX]);
    expect(items.map((node) => text(byClass(node, 'ov-dash-agent-quota-today')))).toEqual(['8.33M', '1.20M']);
    expect(text(items[0])).toContain('expanded.agentUsage.noQuotaInLogs');
    const rows = elements(items[1]).filter((node) => node.props.className === 'ov-dash-agent-quota-row');
    expect(rows.map((node) => text(byClass(node, 'ov-dash-agent-quota-window')))).toEqual(['expanded.agentUsage.window.fiveHour', 'expanded.agentUsage.window.weekly']);
    expect(rows.map((node) => text(byClass(node, 'ov-dash-agent-quota-percent')))).toEqual(['95%', '0%']);
    expect(byClass(rows[0], 'ov-dash-agent-quota-fill').props).toMatchObject({ className: 'ov-dash-agent-quota-fill ov-dash-agent-quota-fill--danger', style: { width: '95%' } });
    expect(byClass(rows[1], 'ov-dash-agent-quota-fill').props.className).toBe('ov-dash-agent-quota-fill');
  });

  it('日志目录缺失时显示未检测提示且不显示 token 数', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([provider({ available: false })]));
    await mount();
    const tree = run();
    expect(text(tree)).toContain('expanded.agentUsage.unavailable');
    expect(elements(tree).some((node) => node.props.className === 'ov-dash-agent-quota-today')).toBe(false);
  });

  it('首次读取失败显示错误文案', async () => {
    leaves.snapshot.mockRejectedValue(new Error('scan'));
    await mount();
    expect(text(byClass(run(), 'ov-dash-agent-quota-empty'))).toBe('expanded.agentUsage.error');
  });

  it('点击或键盘激活标题切换到 Agent 用量页', async () => {
    leaves.snapshot.mockReturnValue(new Promise(() => {}));
    await mount();
    const title = byClass(run(), 'ov-dash-widget-title--link');
    expect(title.props).toMatchObject({ role: 'button', tabIndex: 0 });
    expect(text(title)).toBe('overview.agentQuota.title');
    invoke(title, 'onClick');
    const preventDefault = vi.fn();
    invoke(title, 'onKeyDown', { preventDefault, key: 'Tab' });
    invoke(title, 'onKeyDown', { preventDefault, key: 'Enter' });
    invoke(title, 'onKeyDown', { preventDefault, key: ' ' });
    expect(leaves.setExpandTab.mock.calls).toEqual([['agentUsage'], ['agentUsage'], ['agentUsage']]);
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  it('可见期间每分钟刷新，隐藏后停止，卸载后不再请求', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([provider({})]));
    await mount();
    expect(leaves.snapshot).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
    documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
    documentTarget.hidden = false;
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    expect(leaves.snapshot).toHaveBeenCalledTimes(3);
    unmountHook();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(leaves.snapshot).toHaveBeenCalledTimes(3);
  });

  it('上一次扫描未返回时跳过本轮轮询', async () => {
    leaves.snapshot.mockReturnValue(new Promise(() => {}));
    await mount();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(leaves.snapshot).toHaveBeenCalledOnce();
  });
});
