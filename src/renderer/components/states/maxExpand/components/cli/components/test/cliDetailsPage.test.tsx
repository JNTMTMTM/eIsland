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
 * @file cliDetailsPage.test.tsx
 * @description CLI 详情分页的正文补全、异步请求竞态与卸载取消测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { elements, find, invoke, text } from '../../../../../test/tree';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { CliDetailsPage } from '../CliDetailsPage';
vi.mock('react', async (original) => {
  const { createHookReactMock } = await import('../../../../../../hooks/test/startupHookHarness');
  return createHookReactMock(await original<typeof import('react')>());
});
type Detail = Awaited<ReturnType<Window['api']['codexEventDetail']>>;
type Props = Parameters<typeof CliDetailsPage>[0];
const claude = vi.fn<Window['api']['claudeCodeEventDetail']>();
const codex = vi.fn<Window['api']['codexEventDetail']>();
const t = (key: string): string => key;
/** 创建有界正文页面。
 * @param value - 当前页内容。
 * @param offset - 当前页开始位置。
 * @param nextOffset - 下一页位置，null 表示当前末尾。
 * @returns IPC 页面。
 */
function page(value: string, offset = 0, nextOffset: number | null = null): Detail {
  return { text: value, offset, nextOffset, totalBytes: nextOffset ?? offset + value.length };
}
/** 提交真实组件依赖变化，并读取 effect 清空旧页面后的渲染。
 * @param props - 详情目标与版本。
 * @returns 当前元素树。
 */
function render(props: Props) {
  renderHook(CliDetailsPage, props); flushHookEffects();
  return renderHook(CliDetailsPage, props);
}
beforeEach(() => {
  resetHook(); claude.mockReset(); codex.mockReset();
  vi.stubGlobal('window', { api: { claudeCodeEventDetail: claude, codexEventDetail: codex } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

it.each(['claude', 'codex'] as const)('reloads only the changed event revision for %s', async (provider) => {
  const read = provider === 'claude' ? claude : codex;
  read.mockResolvedValueOnce(page('initial')).mockResolvedValueOnce(page('initial plus completed tool output'));
  const props: Props = { id: 'same-event', provider, revision: 0, t };
  render(props); await settleHook();
  expect(text(render(props))).toContain('initial');
  render(props); expect(read).toHaveBeenCalledOnce();
  const updated = { ...props, revision: 1 };
  expect(text(render(updated))).toContain('maxExpand.cli.detailLoading');
  expect(read.mock.calls).toEqual([['same-event', 0], ['same-event', 0]]);
  await settleHook();
  expect(text(render(updated))).toContain('initial plus completed tool output');
  expect(provider === 'claude' ? codex : claude).not.toHaveBeenCalled();
});

it.each(['resolve', 'reject'] as const)('ignores an obsolete request that later %ss after a new revision', async (completion) => {
  const stale = deferred<Detail>(); const fresh = deferred<Detail>();
  claude.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  const props: Props = { id: 'same-event', provider: 'claude', revision: 0, t };
  render(props);
  const updated = { ...props, revision: 1 };
  render(updated); fresh.resolve(page('current detail')); await settleHook();
  expect(text(render(updated))).toContain('current detail');
  if (completion === 'resolve') stale.resolve(page('stale detail'));
  else stale.reject(new Error('obsolete read failure'));
  await settleHook();
  const tree = render(updated);
  expect(text(tree)).toContain('current detail');
  expect(text(tree)).not.toContain('stale detail');
  expect(text(tree)).not.toContain('maxExpand.cli.detailUnavailable');
  expect(claude).toHaveBeenCalledTimes(2);
});

it('replaces the current page on navigation and ignores pending work after close', async () => {
  const second = deferred<Detail>(); const returning = deferred<Detail>();
  claude.mockResolvedValueOnce(page('first-page-only', 0, 65_536)).mockReturnValueOnce(second.promise).mockReturnValueOnce(returning.promise);
  const props: Props = { id: 'paged-event', provider: 'claude', t };
  render(props); await settleHook();
  let tree = render(props);
  invoke(find(tree, (node) => node.type === 'button' && text(node) === 'maxExpand.cli.detailNext'), 'onClick');
  tree = render(props);
  expect(claude).toHaveBeenLastCalledWith('paged-event', 65_536);
  expect(elements(tree).filter((node) => node.type === 'pre')).toHaveLength(0);
  second.resolve(page('second-page-only', 65_536)); await settleHook();
  tree = render(props);
  expect(elements(tree).filter((node) => node.type === 'pre')).toHaveLength(1);
  expect(text(tree)).toContain('second-page-only'); expect(text(tree)).not.toContain('first-page-only');
  expect(find(tree, (node) => node.type === 'button' && text(node) === 'maxExpand.cli.detailNext').props.disabled).toBe(true);
  invoke(find(tree, (node) => node.type === 'button' && text(node) === 'maxExpand.cli.detailPrevious'), 'onClick');
  render(props); expect(claude).toHaveBeenLastCalledWith('paged-event', 0);
  unmountHook(); returning.resolve(page('closed-page-response')); await settleHook();
  // 只读取已卸载实例保留的测试状态，不提交新的 effect；晚响应不得写入正文。
  expect(text(renderHook(CliDetailsPage, props))).not.toContain('closed-page-response');
  expect(claude).toHaveBeenCalledTimes(3);
});
