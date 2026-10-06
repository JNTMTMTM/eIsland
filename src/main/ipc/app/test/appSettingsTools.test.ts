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
 * @file appSettingsTools.test.ts
 * @description 设置、闹钟与待办本地工具的持久化、参数边界、广播及失败测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, mocks, tool, errorContaining } from './appHarness';
beforeEach(resetHarness);
afterEach(cleanupHarness);

describe('island settings storage and broadcasts', () => {
  it('lists registry entries with parsed values and defaults for missing or invalid stores', async () => {
    mocks.exists.mockImplementation((path) => !path.endsWith('island-opacity.json'));
    mocks.read.mockImplementation((path) => Promise.resolve(String(path).endsWith('theme-mode.json') ? '"light"' : '{broken'));
    const response = await tool('island.settings.list', {});
    expect(response.success).toBe(true);
    const result = response.result as { count: number; settings: Array<{ key: string; description: string; type: string; value: unknown }> };
    expect(result.count).toBe(result.settings.length);
    expect(result.settings.length).toBeGreaterThan(10);
    expect(result.settings.find((item) => item.key === 'theme-mode')).toEqual({ key: 'theme-mode', description: '主题模式 (dark/light/system)', type: 'string', value: 'light' });
    expect(result.settings.find((item) => item.key === 'island-opacity')?.value).toBeNull();
    expect(result.settings.find((item) => item.key === 'clipboard-url-monitor-enabled')?.value).toBeNull();
  });
  it('reads known and unknown keys while preserving missing or malformed values as null', async () => {
    mocks.read.mockResolvedValue('{"enabled":true}');
    expect(await tool('island.settings.read', { key: 'theme-mode' })).toMatchObject({ success: true, result: { key: 'theme-mode', value: { enabled: true }, description: '主题模式 (dark/light/system)' } });
    expect(await tool('island.settings.read', { key: 'custom-fixture' })).toMatchObject({ success: true, result: { description: null } });
    mocks.exists.mockReturnValue(false);
    expect(await tool('island.settings.read', { key: 'theme-mode' })).toMatchObject({ success: true, result: { value: null } });
    mocks.exists.mockReturnValue(true);
    mocks.read.mockRejectedValue(new Error('unreadable'));
    expect(await tool('island.settings.read', { key: 'theme-mode' })).toMatchObject({ success: true, result: { value: null } });
  });
  it('writes settings before sending generic and dedicated broadcasts', async () => {
    expect(await tool('island.settings.write', { key: 'theme-mode', value: 'light' })).toMatchObject({ success: true, result: { value: 'light', written: true } });
    expect(mocks.write).toHaveBeenCalledWith('C:\\pictures\\eIsland_store\\theme-mode.json', '"light"', 'utf8');
    expect(mocks.broadcast.mock.calls).toEqual([[-1, 'theme:mode', 'light'], [-1, 'store:theme-mode', 'light']]);
    mocks.broadcast.mockClear();
    await tool('island.settings.write', { key: 'custom-fixture', value: { a: 1 } });
    expect(mocks.broadcast.mock.calls).toEqual([[-1, 'store:custom-fixture', { a: 1 }]]);
  });
  it.each([
    { stored: '"dark"', expected: 'dark' }, { stored: '"light"', expected: 'light' },
    { stored: '"system"', expected: 'system' }, { stored: '"unknown"', expected: 'dark' },
    { stored: '{broken', expected: 'dark' },
  ])('reads theme value $stored with fallback validation', async ({ stored, expected }) => {
    mocks.read.mockResolvedValue(stored);
    expect(await tool('island.theme.get', {})).toMatchObject({ success: true, result: { mode: expected } });
  });
  it.each(['dark', 'light', 'system', 'unknown'])('writes validated theme %s and its broadcast', async (mode) => {
    const expected = mode === 'unknown' ? 'dark' : mode;
    expect(await tool('island.theme.set', { mode })).toMatchObject({ success: true, result: { mode: expected, applied: true } });
    expect(mocks.write).toHaveBeenCalledWith('C:\\pictures\\eIsland_store\\theme-mode.json', JSON.stringify(expected), 'utf8');
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'theme:mode', expected);
  });
  it.each([
    { stored: '1', expected: 10 }, { stored: '140', expected: 100 }, { stored: '50.6', expected: 51 },
    { stored: '"bad"', expected: 100 }, { stored: '{broken', expected: 100 },
  ])('reads opacity $stored and enforces the numeric range', async ({ stored, expected }) => {
    mocks.read.mockResolvedValue(stored);
    expect(await tool('island.opacity.get', {})).toMatchObject({ success: true, result: { opacity: expected } });
  });
  it.each([{ opacity: 1, expected: 10 }, { opacity: 120, expected: 100 }, { opacity: 40.6, expected: 41 }])('writes normalized opacity $opacity', async ({ opacity, expected }) => {
    expect(await tool('island.opacity.set', { opacity })).toMatchObject({ success: true, result: { opacity: expected, applied: true } });
    expect(mocks.write).toHaveBeenCalledWith('C:\\pictures\\eIsland_store\\island-opacity.json', JSON.stringify(expected), 'utf8');
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'island:opacity', expected);
  });
  it('uses defaults when theme and opacity files are absent', async () => {
    mocks.exists.mockReturnValue(false);
    expect(await tool('island.theme.get', {})).toMatchObject({ success: true, result: { mode: 'dark' } });
    expect(await tool('island.opacity.get', {})).toMatchObject({ success: true, result: { opacity: 100 } });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('restarts only after the configured delay', async () => {
    vi.useFakeTimers();
    expect(await tool('island.restart', {})).toMatchObject({ success: true, result: { restarting: true } });
    vi.advanceTimersByTime(499);
    expect(mocks.relaunch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(mocks.relaunch).toHaveBeenCalledOnce();
    expect(mocks.exit).toHaveBeenCalledWith(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('alarm and todo storage mutations', () => {
  it.each(['alarm.list', 'todolist.list'])('%s parses stored lists and validates list shape', async (name) => {
    mocks.read.mockResolvedValue('[{"id":1}]');
    expect(await tool(name, {})).toMatchObject({ success: true, result: { count: 1 } });
    mocks.read.mockResolvedValue('{}');
    expect(await tool(name, {})).toMatchObject({ success: true, result: { count: 0 } });
    mocks.read.mockResolvedValue('{broken');
    expect(await tool(name, {})).toMatchObject({ success: true, result: { count: 0 } });
    mocks.exists.mockReturnValue(false);
    expect(await tool(name, {})).toMatchObject({ success: true, result: { count: 0 } });
  });
  it('creates bounded alarms, filters repeat days and retains existing alarms', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    mocks.read.mockResolvedValue('[{"id":1,"label":"keep"}]');
    expect(await tool('alarm.create', { hour: 99, minute: -1, second: 61, label: ' Wake ', repeat: [0, 6, 7, -1, '2'], enabled: false })).toMatchObject({
      success: true, result: { created: { id: 12345, hour: 23, minute: 0, second: 59, label: 'Wake', enabled: false, repeat: [0, 6], createdAt: 12345 } },
    });
    const written: unknown = JSON.parse(String(mocks.write.mock.calls[0][1]));
    expect(written).toEqual([{ id: 1, label: 'keep' }, { id: 12345, hour: 23, minute: 0, second: 59, label: 'Wake', enabled: false, repeat: [0, 6], createdAt: 12345 }]);
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'store:alarms', written);
  });
  it('creates alarm defaults from malformed or absent storage', async () => {
    mocks.read.mockResolvedValue('{broken');
    expect(await tool('alarm.create', { hour: 1, minute: 2 })).toMatchObject({ success: true, result: { created: { second: 0, label: '', enabled: true, repeat: [] } } });
    mocks.exists.mockReturnValue(false);
    expect(await tool('alarm.create', { hour: 1, minute: 2 })).toMatchObject({ success: true });
  });
  it.each([
    { name: 'alarm.delete', args: { id: 1.9 }, expected: { deletedId: 1, remaining: 1 }, list: [{ id: 2, enabled: true }] },
    { name: 'alarm.toggle', args: { id: 1, enabled: true }, expected: { id: 1, enabled: true }, list: [{ id: 1, enabled: true, hour: 1 }, { id: 2, enabled: true }] },
    { name: 'alarm.update', args: { id: 1, hour: -1, minute: 99, second: -1, label: '', repeat: [1, 6, 7, '2'] }, expected: { updated: { id: 1, hour: 0, minute: 59, second: 0, label: '', repeat: [1, 6] } }, list: [{ id: 1, enabled: false, hour: 0, minute: 59, second: 0, label: '', repeat: [1, 6] }, { id: 2, enabled: true }] },
  ])('$name updates only the selected alarm and broadcasts the persisted state', async ({ name, args, expected, list }) => {
    mocks.read.mockResolvedValue('[{"id":1,"enabled":false,"hour":1},{"id":2,"enabled":true}]');
    expect(await tool(name, args)).toMatchObject({ success: true, result: expected });
    const written: unknown = JSON.parse(String(mocks.write.mock.calls[0][1]));
    expect(written).toEqual(list);
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'store:alarms', list);
  });
  it('retains alarm fields omitted from an update and allows explicit disable', async () => {
    mocks.read.mockResolvedValue('[{"id":1,"hour":7,"minute":8,"second":9,"label":"keep","repeat":[0],"enabled":true}]');
    expect(await tool('alarm.update', { id: 1 })).toMatchObject({ success: true, result: { updated: { hour: 7, minute: 8, second: 9, label: 'keep', repeat: [0] } } });
    expect(await tool('alarm.toggle', { id: 1 })).toMatchObject({ success: true, result: { enabled: false } });
  });
  it('creates todos with optional metadata and preserves the prior list', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    mocks.read.mockResolvedValue('[{"id":1,"text":"keep"}]');
    expect(await tool('todolist.create', { text: ' Task ', priority: 'high', size: 'small', description: ' Detail ' })).toMatchObject({
      success: true, result: { created: { id: 12345, text: 'Task', done: false, createdAt: 12345, description: 'Detail', subTodos: [], priority: 'high', size: 'small' } },
    });
    const written: unknown = JSON.parse(String(mocks.write.mock.calls[0][1]));
    expect(written).toEqual([{ id: 1, text: 'keep' }, { id: 12345, text: 'Task', done: false, createdAt: 12345, description: 'Detail', subTodos: [], priority: 'high', size: 'small' }]);
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'store:todos', written);
    expect(mocks.mkdir).not.toHaveBeenCalled();
  });
  it('creates todo defaults and initializes an absent store directory', async () => {
    mocks.exists.mockReturnValue(false);
    expect(await tool('todolist.create', { text: 'Task' })).toMatchObject({ success: true, result: { created: { text: 'Task', description: '', done: false, subTodos: [] } } });
    expect(mocks.mkdir).toHaveBeenCalledWith('C:\\pictures\\eIsland_store', { recursive: true });
  });
  it.each([
    { name: 'todolist.delete', args: { id: 1.9 }, expected: { deleted: 1, remaining: 1 }, list: [{ id: 2, text: 'keep' }] },
    { name: 'todolist.toggle', args: { id: 1 }, expected: { id: 1, done: true }, list: [{ id: 1, text: 'old', done: true, priority: 'high', size: 'large', description: 'old' }, { id: 2, text: 'keep' }] },
    { name: 'todolist.update', args: { id: 1, text: ' New ', priority: '', size: 'small', description: '' }, expected: { updated: { text: 'New', size: 'small', description: '' } }, list: [{ id: 1, text: 'New', done: false, size: 'small', description: '' }, { id: 2, text: 'keep' }] },
  ])('$name persists only the target mutation and broadcasts it', async ({ name, args, expected, list }) => {
    mocks.read.mockResolvedValue('[{"id":1,"text":"old","done":false,"priority":"high","size":"large","description":"old"},{"id":2,"text":"keep"}]');
    expect(await tool(name, args)).toMatchObject({ success: true, result: expected });
    const written: unknown = JSON.parse(String(mocks.write.mock.calls[0][1]));
    expect(written).toEqual(list);
    expect(mocks.broadcast).toHaveBeenCalledWith(-1, 'store:todos', list);
  });
  it('toggles completed todos back and preserves values omitted from updates', async () => {
    mocks.read.mockResolvedValue('[{"id":1,"text":"keep","done":true,"priority":"high","size":"large","description":"keep"}]');
    expect(await tool('todolist.toggle', { id: 1 })).toMatchObject({ success: true, result: { done: false } });
    expect(await tool('todolist.update', { id: 1, text: ' ' })).toMatchObject({ success: true, result: { updated: { text: 'keep', priority: 'high', size: 'large', description: 'keep' } } });
    expect(await tool('todolist.update', { id: 1, size: '', priority: 'low' })).toMatchObject({ success: true, result: { updated: { priority: 'low', size: undefined } } });
  });
  it.each(['alarm.delete', 'alarm.toggle', 'alarm.update', 'todolist.delete', 'todolist.toggle', 'todolist.update'])('%s avoids writes and broadcasts for missing targets and invalid stores', async (name) => {
    await ['[]', '{}', '{broken'].reduce(async (previous, stored) => {
      await previous;
      mocks.read.mockResolvedValue(stored);
      expect(await tool(name, { id: 99 })).toMatchObject({ success: false, error: errorContaining('ID 99 不存在') });
    }, Promise.resolve());
    mocks.exists.mockReturnValue(false);
    expect(await tool(name, { id: 99 })).toMatchObject({ success: false, error: errorContaining('ID 99 不存在') });
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });
  it.each([
    { name: 'island.settings.write', args: { key: 'theme-mode', value: 'light' } },
    { name: 'island.theme.set', args: { mode: 'light' } },
    { name: 'island.opacity.set', args: { opacity: 50 } },
    { name: 'alarm.create', args: { hour: 1, minute: 2 } },
    { name: 'alarm.delete', args: { id: 1 } },
    { name: 'alarm.toggle', args: { id: 1 } },
    { name: 'alarm.update', args: { id: 1 } },
    { name: 'todolist.create', args: { text: 'fixture' } },
    { name: 'todolist.delete', args: { id: 1 } },
    { name: 'todolist.toggle', args: { id: 1 } },
    { name: 'todolist.update', args: { id: 1 } },
  ])('$name does not broadcast a failed write', async ({ name, args }) => {
    mocks.read.mockResolvedValue('[{"id":1}]');
    mocks.write.mockRejectedValue(new Error('disk full'));
    expect(await tool(name, args)).toMatchObject({ success: false, error: 'disk full' });
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });
});
