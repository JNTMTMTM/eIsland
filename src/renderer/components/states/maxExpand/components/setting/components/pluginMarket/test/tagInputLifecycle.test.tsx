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
 * @file tagInputLifecycle.test.tsx
 * @description 标签输入真实状态、防抖搜索、建议选择、键盘导航、外部点击和资源清理回归。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TagInput } from '../TagInput';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle, runEffects, unmountHooks } from '../../../hooks/test/settingsCoverageHarness';
import type { ComponentProps } from 'react';
import type * as UserApi from '../../../../../../../../api/user/userAccountApi';

const io = vi.hoisted(() => ({ token: ((): string | null => 'token')(), search: vi.fn<typeof UserApi.searchUserTags>() }));
vi.mock('../../../../../../../../api/user/userAccountApi', () => ({ searchUserTags: io.search }));
vi.mock('../../../../../../../../utils/userAccount', () => ({ readLocalToken: () => io.token }));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../hooks/test/settingsCoverageHarness')).lifecycleHooks,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const addEventListener = vi.fn<(type: string, listener: (event: MouseEvent) => void) => void>();
const removeEventListener = vi.fn<(type: string, listener: (event: MouseEvent) => void) => void>();
const onChange = vi.fn<(value: string) => void>();
let props: ComponentProps<typeof TagInput>;

/**
 * 重新渲染实际标签组件，保持真实状态与 memo 身份。
 * @param changes - 父组件提供的值和交互配置。
 * @returns 真实元素树。
 */
function view(changes: Partial<ComponentProps<typeof TagInput>> = {}) {
  props = { ...props, ...changes };
  return renderWithHooks(() => TagInput(props));
}
/**
 * 获取真实输入框。
 * @returns 实际输入元素。
 */
function input() {
  return findElement(view(), (node) => node.type === 'input');
}
/**
 * 调用真实输入框的变更回调。
 * @param value - 用户编辑的草稿。
 * @returns 无返回值。
 */
function type(value: string): void {
  invoke(input(), 'onChange', { target: { value } });
  view();
  runEffects();
}
/**
 * 调用实际键盘回调。
 * @param key - 按键名称。
 * @returns 浏览器默认行为阻止记录。
 */
function key(key: string) {
  const preventDefault = vi.fn();
  invoke(input(), 'onKeyDown', { key, preventDefault });
  return preventDefault;
}
/**
 * 完成真正注册的防抖查询与异步回调。
 * @returns 等待请求消费的 Promise。
 */
async function query(): Promise<void> {
  vi.advanceTimersByTime(180);
  await Promise.resolve();
  await Promise.resolve();
  view();
  runEffects();
}

beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  vi.useFakeTimers();
  io.token = 'token';
  io.search.mockReset().mockResolvedValue({ ok: true, code: 200, message: '', data: [] });
  props = { onChange, value: '' };
  vi.stubGlobal('window', { addEventListener, removeEventListener });
});
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('real tag draft, chips and suggestion interactions', () => {
  it('normalizes mixed delimiters, blank chips, duplicate case and persisted long tag names', () => {
    const tree = view({ value: `  Nature,，nature，City,${'x'.repeat(35)}` });
    expect(textContent(tree)).toContain('Nature');
    expect(textContent(tree)).toContain('City');
    expect(textContent(tree)).toContain('x'.repeat(30));
    expect(textContent(tree)).not.toContain('x'.repeat(31));
    expect(elements(tree).filter((node) => elementProps(node).className === 'settings-plugin-market-tag-chip')).toHaveLength(3);
  });
  it.each(['Enter', ',', '，'])('commits a trimmed draft using %s and clears the real draft', (pressed) => {
    view({ value: 'Nature' });
    type('  Sky  ');
    expect(key(pressed)).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('Nature,Sky');
    expect(elementProps(input()).value).toBe('');
  });
  it('suppresses duplicate drafts and handles empty Enter and comma without commits', () => {
    view({ value: 'Nature' });
    type(' nature ');
    key('Enter');
    expect(onChange).not.toHaveBeenCalled();
    expect(elementProps(input()).value).toBe('');
    type('  ');
    key('Enter');
    key(',');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('handles chip removal and Backspace only when the draft is empty and chips exist', () => {
    view({ value: 'Nature,City' });
    const stopPropagation = vi.fn();
    invoke(findElement(view(), (node) => elementProps(node).className === 'settings-plugin-market-tag-chip-remove'), 'onClick', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenLastCalledWith('City');
    key('Backspace');
    expect(onChange).toHaveBeenLastCalledWith('Nature');
    onChange.mockClear();
    type('draft');
    key('Backspace');
    view({ value: '' });
    type('');
    key('Backspace');
    key('Tab');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('uses explicit, default and hidden placeholders and exposes disabled styling', () => {
    expect(elementProps(findElement(view({ placeholder: 'Custom' }), (node) => node.type === 'input')).placeholder).toBe('Custom');
    expect(elementProps(findElement(view({ placeholder: undefined }), (node) => node.type === 'input')).placeholder).toBe('settings.pluginMarket.tag.placeholder');
    expect(elementProps(findElement(view({ value: 'One', maxTags: 1 }), (node) => node.type === 'input'))).toMatchObject({ placeholder: '', disabled: true });
    const tree = view({ disabled: true });
    expect(elements(tree).some((node) => elementProps(node).className === 'settings-plugin-market-tag-input disabled')).toBe(true);
    key('Enter');
    expect(onChange).not.toHaveBeenCalled();
  });
  it('focuses an attached public input ref and tolerates a missing input element', () => {
    const tree = view();
    const wrap = findElement(tree, (node) => elementProps(node).className === 'settings-plugin-market-tag-input ');
    invoke(wrap, 'onClick');
    const focus = vi.fn();
    const inputRef = elementProps(findElement(tree, (node) => node.type === 'input')).ref as { current: HTMLInputElement | null };
    inputRef.current = { focus } as unknown as HTMLInputElement;
    invoke(wrap, 'onClick');
    expect(focus).toHaveBeenCalledOnce();
  });
  it('filters existing tags, highlights with both arrows, wraps and commits the actual selected suggestion', async () => {
    io.search.mockResolvedValue({ ok: true, code: 200, message: '', data: [{ id: 1, name: 'Nature', slug: 'nature' }, { id: 2, name: 'Sky', slug: 'sky', usageCount: 7 }, { id: 3, name: 'City', slug: 'city' }] });
    view({ value: 'Nature' });
    invoke(input(), 'onFocus');
    view();
    runEffects();
    await query();
    expect(io.search).toHaveBeenCalledWith('token', '', 15);
    expect(textContent(view())).toContain('Sky7City0');
    expect(elements(view()).filter((node) => String(elementProps(node).className).includes('settings-plugin-market-tag-suggestion'))).toHaveLength(4);
    key('ArrowUp');
    key('ArrowUp');
    key('ArrowDown');
    key('ArrowDown');
    const active = findElement(view(), (node) => elementProps(node).className === 'settings-plugin-market-tag-suggestion active');
    expect(textContent(active)).toBe('Sky7');
    key('Enter');
    expect(onChange).toHaveBeenCalledWith('Nature,Sky');
    expect(textContent(view())).not.toContain('City0');
  });
  it('mouse hover and selection prevent blur and enforce the public tag count cap', async () => {
    io.search.mockResolvedValue({ ok: true, code: 200, message: '', data: [{ id: 1, name: 'Sky', slug: 'sky' }] });
    view({ value: 'Nature', maxTags: 2 });
    // A retained dropdown can still deliver a public mouse selection after the cap is reduced.
    invoke(input(), 'onFocus');
    view(); runEffects();
    await query();
    view({ maxTags: 1 });
    const suggestion = findElement(view(), (node) => elementProps(node).className === 'settings-plugin-market-tag-suggestion ');
    invoke(suggestion, 'onMouseEnter');
    expect(elementProps(findElement(view(), (node) => textContent(node) === 'Sky0' && node.type === 'button')).className).toContain('active');
    const preventDefault = vi.fn();
    invoke(suggestion, 'onMouseDown', { preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('Nature');
  });
  it('creates a custom tag from the actual no-results dropdown', () => {
    view();
    type('  Custom  ');
    const create = findElement(view(), (node) => elementProps(node).className === 'settings-plugin-market-tag-suggestion new');
    const preventDefault = vi.fn();
    invoke(create, 'onMouseDown', { preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('Custom');
  });
  it('ignores a whitespace-only tag name supplied by the suggestion API', async () => {
    io.search.mockResolvedValue({ ok: true, code: 200, message: '', data: [{ id: 1, name: ' ', slug: 'damaged' }] });
    view(); invoke(input(), 'onFocus'); view(); runEffects(); await query();
    invoke(findElement(view(), (node) => node.type === 'button' && elementProps(node).className === 'settings-plugin-market-tag-suggestion '), 'onMouseDown', { preventDefault: vi.fn() });
    expect(onChange).not.toHaveBeenCalled();
  });
  it('debounces changed input, cancels old timers and cleans up timers and global click listeners', async () => {
    view(); runEffects();
    type('a');
    vi.advanceTimersByTime(100);
    type('ab');
    vi.advanceTimersByTime(179);
    expect(io.search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(io.search).toHaveBeenCalledExactlyOnceWith('token', 'ab', 15);
    type('abc');
    expect(vi.getTimerCount()).toBe(1);
    unmountHooks();
    expect(vi.getTimerCount()).toBe(0);
    expect(removeEventListener).toHaveBeenCalledWith('mousedown', addEventListener.mock.calls[0][1]);
  });
  it('closes on Escape and outside clicks, ignores inner clicks and supports an unattached container', () => {
    const tree = view(); runEffects();
    const [[, handler]] = addEventListener.mock.calls;
    handler({ target: {} } as MouseEvent);
    const contains = vi.fn<(target: Node) => boolean>().mockReturnValue(true);
    const ref = elementProps(tree).ref as { current: HTMLDivElement | null };
    ref.current = { contains } as unknown as HTMLDivElement;
    type('new');
    handler({ target: {} } as MouseEvent);
    expect(textContent(view())).toContain('settings.pluginMarket.tag.createNew');
    contains.mockReturnValue(false);
    handler({ target: {} } as MouseEvent);
    expect(textContent(view())).not.toContain('settings.pluginMarket.tag.createNew');
    type('new');
    key('Escape');
    expect(textContent(view())).not.toContain('settings.pluginMarket.tag.createNew');
    view(); runEffects();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('skips unauthenticated suggestion requests and consumes rejected or malformed response data', async () => {
    view(); type('keyword'); io.token = null;
    await query();
    expect(io.search).not.toHaveBeenCalled();
    io.token = 'token';
    io.search.mockRejectedValue(new Error('search'));
    type('different'); await query();
    expect(io.search).toHaveBeenCalledOnce();
    io.search.mockResolvedValue({ ok: false, code: 400, message: 'denied' });
    type('failed'); await query();
    io.search.mockResolvedValue({ ok: true, code: 200, message: '' });
    type('malformed'); await query();
    expect(textContent(view())).toContain('settings.pluginMarket.tag.createNew');
  });
});
