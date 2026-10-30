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
 * @file agentUsageTab.test.tsx
 * @description Agent 用量页的加载、失败重试、卡片渲染、额度展示与轮询生命周期测试。
 * @author 鸡哥
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { byClass, elements, invoke, text } from '../../../test/tree';
import type { AgentUsageProviderSnapshot, AgentUsageSnapshot } from '../../../../../../preload/types/agentUsage';

const leaves = vi.hoisted(() => ({
  snapshot: vi.fn<() => Promise<unknown>>(),
}));

const NOW = Date.UTC(2026, 9, 30, 4, 0, 0);
let Component: typeof import('../AgentUsageTab').AgentUsageTab;
let documentTarget: EventTarget & { hidden: boolean };

const tokens = (total: number) => ({ total, input: total * 0.1, output: total * 0.2, cacheRead: total * 0.6, cacheWrite: total * 0.1 });

function provider(overrides: Partial<AgentUsageProviderSnapshot>): AgentUsageProviderSnapshot {
  return { provider: 'claude', available: true, today: tokens(8_332_768), week: tokens(588_081_837), todaySessions: 2, topModel: 'claude-opus-5-5', rateLimits: null, ...overrides };
}

function snapshot(providers: AgentUsageProviderSnapshot[]): AgentUsageSnapshot {
  return { providers, generatedAt: NOW };
}

/** 展开私有函数组件，使断言覆盖卡片与额度条的真实输出。
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
  return deep(renderHook(Component)) as ReactElement;
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
  Component = (await import('../AgentUsageTab')).AgentUsageTab;
});

afterEach(() => {
  unmountHook();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('AgentUsageTab', () => {
  it('首次挂载显示与卡片同构的骨架屏，延迟后才请求快照', async () => {
    leaves.snapshot.mockReturnValue(new Promise(() => {}));
    run();
    flushHookEffects();
    const tree = run();
    const status = byClass(tree, 'au-panel-wrap');
    expect(status.props).toMatchObject({ role: 'status', 'aria-busy': 'true', 'aria-label': 'expanded.agentUsage.loading' });
    const skeletons = elements(tree).filter((node) => String(node.props.className).includes('au-card-skeleton'));
    expect(skeletons.map((node) => node.props.className)).toEqual(['au-card au-card--claude au-card-skeleton', 'au-card au-card--codex au-card-skeleton']);
    expect(skeletons.every((node) => node.props['aria-hidden'] === 'true')).toBe(true);
    expect(elements(skeletons[0]).filter((node) => String(node.props.className).includes('au-skeleton-cell'))).toHaveLength(4);
    expect(text(tree)).toContain('expanded.agentUsage.title');
    expect(text(tree)).not.toContain('expanded.agentUsage.error');
    expect(leaves.snapshot).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(leaves.snapshot).toHaveBeenCalledOnce();
  });

  it('数据到达后骨架屏替换为真实卡片', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([provider({})]));
    await mount();
    const tree = run();
    expect(elements(tree).some((node) => String(node.props.className).includes('au-card-skeleton'))).toBe(false);
    expect(byClass(tree, 'au-panel-wrap').props.role).toBeUndefined();
    expect(text(byClass(tree, 'au-card-today'))).toBe('8.33M');
  });

  it('首次失败显示错误与刷新按钮，点击后重新请求', async () => {
    leaves.snapshot.mockRejectedValueOnce(new Error('scan')).mockReturnValue(new Promise(() => {}));
    await mount();
    expect(text(run())).toContain('expanded.agentUsage.error');
    invoke(byClass(run(), 'au-refresh-btn'), 'onClick');
    expect(leaves.snapshot).toHaveBeenCalledTimes(2);
  });

  it('渲染两张来源卡片：模型、紧凑 token 数、明细与 Claude 无额度提示', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([
      provider({}),
      provider({ provider: 'codex', topModel: 'gpt-6.1-sol', today: tokens(950), todaySessions: 3 }),
    ]));
    await mount();
    const tree = run();
    const cards = elements(tree).filter((node) => String(node.props.className).startsWith('au-card au-card--'));
    expect(cards.map((node) => node.props.className)).toEqual(['au-card au-card--claude', 'au-card au-card--codex']);
    expect(text(cards[0])).toContain('expanded.agentUsage.providers.claude');
    expect(text(cards[0])).toContain('claude-opus-5-5');
    expect(text(byClass(cards[0], 'au-card-today'))).toBe('8.33M');
    expect(text(byClass(cards[1], 'au-card-today'))).toBe('950');
    expect(elements(cards[0]).filter((node) => node.props.className === 'au-card-breakdown-value').map((node) => text(node))).toEqual(['833K', '1.67M', '5.00M', '833K']);
    expect(text(cards[0])).toContain('expanded.agentUsage.noQuotaInLogs');
    expect(text(cards[1])).toContain('expanded.agentUsage.noQuotaData');
    expect(text(tree)).toContain('expanded.agentUsage.updatedAt');
  });

  it('Codex 额度按窗口展示百分比、套餐与重置状态，高用量切换警示色', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([provider({
      provider: 'codex',
      rateLimits: {
        primary: { usedPercent: 95, windowMinutes: 300, resetsAt: NOW + 3_600_000 },
        secondary: { usedPercent: 40, windowMinutes: 10080, resetsAt: NOW - 1 },
        planType: 'prolite',
        updatedAt: NOW,
      },
    })]));
    await mount();
    const tree = run();
    expect(text(byClass(tree, 'au-card-plan'))).toBe('prolite');
    const quotas = elements(tree).filter((node) => node.props.className === 'au-quota');
    expect(quotas.map((node) => text(byClass(node, 'au-quota-label')))).toEqual(['expanded.agentUsage.window.fiveHour', 'expanded.agentUsage.window.weekly']);
    expect(quotas.map((node) => text(byClass(node, 'au-quota-value')))).toEqual(['95%', '0%']);
    expect(byClass(quotas[0], 'au-quota-fill').props.className).toContain('au-quota-fill--danger');
    expect(byClass(quotas[0], 'au-quota-fill').props.style).toEqual({ width: '95%' });
    expect(text(quotas[0])).toContain('expanded.agentUsage.resetIn');
    expect(text(quotas[1])).toContain('expanded.agentUsage.resetDone');
  });

  it('日志目录缺失的来源显示未检测提示，不渲染统计', async () => {
    leaves.snapshot.mockResolvedValue(snapshot([provider({ available: false })]));
    await mount();
    const tree = run();
    expect(byClass(tree, 'au-card').props.className).toContain('au-card--empty');
    expect(text(tree)).toContain('expanded.agentUsage.unavailable');
    expect(elements(tree).some((node) => node.props.className === 'au-card-today')).toBe(false);
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
});
