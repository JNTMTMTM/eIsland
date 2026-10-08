/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

/**
 * @file useToolboxNavigation.test.ts
 * @description 导航隐藏、空配置、晚返回、跨窗口合并及原子保存失败回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, flushHookEffects, renderHook, resetHook, settleHook, translationProbe, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { useToolboxNavigation } from '../useToolboxNavigation';
import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_NAV_CONFIG_STORE_KEY } from '../../../tools/config/commonToolboxConfig';
import { applyToolboxNavEdits, parseToolboxNavConfig } from '../../utils/toolboxNavigation';
import type { DragEvent } from 'react';
import type { TFunction } from 'i18next';
import type { ToolboxNavConfig } from '../../utils/toolboxNavigation';

const read = vi.fn<Window['api']['storeRead']>();
const save = vi.fn<Window['api']['storeCompareAndSwap']>();
let stored: unknown;

/** 读取当前真实 Hook 状态。
 * @returns 导航状态及用户操作
 */
function state() {
  return renderHook(useToolboxNavigation, translationProbe as unknown as TFunction, 'en-US');
}

/** 挂载并等待初始化。
 * @returns 初始化后的导航状态
 */
async function mount() {
  state();
  flushHookEffects();
  await settleHook();
  return state();
}

beforeEach(() => {
  resetHook();
  stored = null;
  read.mockReset().mockImplementation((key) => Promise.resolve(key === TOOLBOX_NAV_CONFIG_STORE_KEY ? structuredClone(stored) : null));
  save.mockReset().mockImplementation((...[key, expected, next]) => {
    expect(key).toBe(TOOLBOX_NAV_CONFIG_STORE_KEY);
    if (JSON.stringify(stored) !== JSON.stringify(expected)) return Promise.resolve('conflict');
    stored = structuredClone(next);
    return Promise.resolve('updated');
  });
  vi.stubGlobal('window', { api: { storeRead: read, storeCompareAndSwap: save } });
});
afterEach(() => { unmountHook(); vi.unstubAllGlobals(); });

describe('toolbox navigation persistence', () => {
  it('preserves hidden cards and their saved order while appending new defaults', () => {
    const config = parseToolboxNavConfig(['software', 'software', 'bad'], ['translate', 'download-create', 'software', 'bad']);
    expect(config.visibleOrder[0]).toBe('software');
    expect(config.hiddenOrder).toEqual(['translate', 'download-create']);
    expect(config.visibleOrder).not.toContain('translate');
    expect(config.visibleOrder).toHaveLength(10);
  });

  it.each([null, {}, ['bad', 7]])('restores defaults for missing or invalid configuration: %j', (raw) => {
    expect(parseToolboxNavConfig(raw, null).visibleOrder).toEqual(DEFAULT_TOOLBOX_NAV_ORDER);
  });

  it('keeps an explicitly empty visible order even without a hidden list', () => {
    expect(parseToolboxNavConfig([], null)).toEqual({ visibleOrder: [], hiddenOrder: DEFAULT_TOOLBOX_NAV_ORDER });
  });

  it('migrates legacy hidden cards into a single stored configuration', async () => {
    read.mockImplementation((key) => {
      if (key === 'toolbox-nav-order') return Promise.resolve(['software']);
      if (key === 'toolbox-hidden-nav-order') return Promise.resolve(['translate']);
      return Promise.resolve(stored);
    });
    await mount();
    expect(state().hiddenCards.map((card) => card.id)).toEqual(['translate']);
    await state().toggleNavEditMode();
    await state().toggleNavEditMode();
    expect(save).toHaveBeenCalledWith(TOOLBOX_NAV_CONFIG_STORE_KEY, null, expect.objectContaining({ hiddenOrder: ['translate'] }));
    expect(state().visibleCards.map((card) => card.id)).not.toContain('translate');
  });

  it('saves removing every card and reloads the empty order', async () => {
    await mount();
    await state().toggleNavEditMode();
    DEFAULT_TOOLBOX_NAV_ORDER.forEach((id) => state().removeCard(id));
    await state().toggleNavEditMode();
    expect(stored).toEqual({ visibleOrder: [], hiddenOrder: DEFAULT_TOOLBOX_NAV_ORDER });
    unmountHook(); resetHook();
    await mount();
    expect(state().visibleCards).toEqual([]);
    expect(state().hiddenCards).toHaveLength(12);
  });

  it.each(['remove', 'add', 'move', 'reset'] as const)('pending initialization cannot discard %s', async (action) => {
    const pending = deferred<unknown>();
    read.mockReturnValueOnce(pending.promise);
    state(); flushHookEffects();
    if (action === 'remove') state().removeCard('software');
    if (action === 'add') { state().removeCard('software'); state().addCard('software'); }
    if (action === 'reset') state().resetToolboxNavConfig();
    if (action === 'move') {
      const event = { preventDefault: vi.fn(), dataTransfer: {} } as unknown as DragEvent<HTMLDivElement>;
      state().handleDragStart(event, 0); state().handleDrop(event, 2);
    }
    const expected = state().visibleCards.map((card) => card.id);
    pending.resolve({ visibleOrder: ['translate'], hiddenOrder: DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => id !== 'translate') });
    await settleHook();
    expect(state().visibleCards.map((card) => card.id)).toEqual(expected);
  });

  it('merges stale-window edits with newer hidden cards and retries a competing save', async () => {
    await mount();
    await state().toggleNavEditMode();
    state().removeCard('software');
    stored = parseToolboxNavConfig(DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => id !== 'translate'), ['translate']);
    save.mockImplementationOnce(() => {
      stored = applyToolboxNavEdits(stored as ToolboxNavConfig, [{ type: 'remove', id: 'networkService' }]);
      return Promise.resolve('conflict');
    });
    await state().toggleNavEditMode();
    expect(save).toHaveBeenCalledTimes(2);
    expect((stored as ToolboxNavConfig).hiddenOrder).toEqual(['translate', 'networkService', 'software']);
    expect(state().navEditMode).toBe(false);
  });

  it('preserves a remote removal and reorder when locally moving a different card', () => {
    const latest = parseToolboxNavConfig(['translate', 'software', ...DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => !['translate', 'software', 'networkService'].includes(id))], ['networkService']);
    const next = applyToolboxNavEdits(latest, [{ type: 'move', id: 'download-create', before: 'fileService-hash' }]);
    expect(next.visibleOrder.slice(0, 2)).toEqual(['translate', 'software']);
    expect(next.hiddenOrder).toEqual(['networkService']);
    expect(next.visibleOrder.indexOf('download-create') + 1).toBe(next.visibleOrder.indexOf('fileService-hash'));
  });

  it.each(['error', 'reject', 'conflict', 'read'] as const)('retains edits and reports %s failure, then allows retry', async (failure) => {
    await mount();
    await state().toggleNavEditMode();
    state().removeCard('software');
    if (failure === 'error') save.mockResolvedValueOnce('error');
    if (failure === 'reject') save.mockRejectedValueOnce(new Error('offline'));
    if (failure === 'conflict') save.mockResolvedValue('conflict');
    if (failure === 'read') read.mockRejectedValueOnce(new Error('read denied'));
    await state().toggleNavEditMode();
    expect(stored).toBeNull();
    expect(state()).toMatchObject({ navEditMode: true, navSaveError: true, navSaving: false });
    expect(state().hiddenCards.map((card) => card.id)).toEqual(['software']);
    save.mockImplementation((...[, , next]) => { stored = next; return Promise.resolve('updated'); });
    await state().toggleNavEditMode();
    expect(state()).toMatchObject({ navEditMode: false, navSaveError: false });
    expect((stored as ToolboxNavConfig).hiddenOrder).toEqual(['software']);
  });

  it('blocks duplicate saves and edits while a commit is pending', async () => {
    await mount(); await state().toggleNavEditMode();
    state().removeCard('software');
    const pending = deferred<'updated'>();
    save.mockReturnValueOnce(pending.promise);
    const saving = state().toggleNavEditMode();
    await settleHook();
    expect(state().navSaving).toBe(true);
    state().addCard('software'); state().resetToolboxNavConfig();
    await state().toggleNavEditMode();
    expect(save).toHaveBeenCalledTimes(1);
    expect(state().hiddenCards.map((card) => card.id)).toEqual(['software']);
    pending.resolve('updated'); await saving;
    expect(state().navSaving).toBe(false);
  });
});
