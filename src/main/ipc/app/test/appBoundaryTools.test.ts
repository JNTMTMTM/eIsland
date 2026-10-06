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
 * @file appBoundaryTools.test.ts
 * @description 验证本地工具必填参数、文件属性、搜索队列上限与叶依赖失败响应。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupHarness, resetHarness, mocks, root, directories, entry, invoke, tool, errorContaining } from './appHarness';

beforeEach(resetHarness);
afterEach(cleanupHarness);

describe('local tool argument and filesystem boundaries', () => {
  it.each([
    ['file.grep', {}, 'path'], ['file.search', {}, 'path'],
    ['file.search', { path: root }, 'keyword'], ['file.rename', {}, 'oldPath'],
    ['file.rename', { oldPath: root }, 'newPath'], ['file.replace', {}, 'path'],
    ['file.replace', { path: root }, 'search'], ['file.compress', {}, 'path'],
    ['file.extract', {}, 'path'], ['file.hash', {}, 'path'], ['file.trash', {}, 'path'],
    ['net.ping', {}, 'host'], ['net.dns', {}, 'host'], ['sys.open', {}, 'target'],
    ['volume.set', {}, 'level'], ['brightness.set', {}, 'level'],
    ['registry.read', {}, 'path'], ['registry.write', {}, 'path'],
    ['registry.write', { path: 'HKCU:/Fixture' }, 'name'], ['registry.delete', {}, 'path'],
    ['service.start', {}, 'name'], ['service.stop', {}, 'name'], ['service.restart', {}, 'name'],
    ['schedule.task.create', {}, 'name'], ['schedule.task.create', { name: 'fixture' }, 'command'],
    ['net.hosts', { action: 'add' }, 'ip'], ['net.hosts', { action: 'add', ip: '127.0.0.1' }, 'host'],
    ['island.settings.read', {}, 'key'], ['island.settings.write', {}, 'key'],
    ['island.theme.set', {}, 'mode'], ['island.opacity.set', {}, 'opacity'],
    ['alarm.create', {}, 'hour'], ['alarm.create', { hour: 1 }, 'minute'],
    ['alarm.delete', {}, 'id'], ['alarm.toggle', {}, 'id'], ['alarm.update', {}, 'id'],
    ['todolist.create', {}, 'text'], ['todolist.delete', {}, 'id'],
    ['todolist.toggle', {}, 'id'], ['todolist.update', {}, 'id'],
  ] as const)('%s rejects missing required %s before side effects', async (name, args, field) => {
    expect(await tool(name, args)).toMatchObject({ success: false, error: errorContaining(field) });
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.broadcast).not.toHaveBeenCalled();
  });
  it.each([null, [], 1])('normalizes non-object tool arguments %s to an empty record', async (args) => {
    expect(await tool('file.stat', args)).toMatchObject({ success: false, error: 'file.stat 需要 path' });
    expect(mocks.stat).not.toHaveBeenCalled();
  });
  it('returns complete stat metadata from the filesystem boundary', async () => {
    const metadata = { isFile: () => true, isDirectory: () => false, size: 42, mode: 0o644, atimeMs: 1, mtimeMs: 2, ctimeMs: 3, birthtimeMs: 4 };
    mocks.stat.mockResolvedValue(metadata);
    expect(await tool('file.stat', { path: root })).toMatchObject({ success: true, result: { path: root, exists: true, isFile: true, isDirectory: false, size: 42, mode: 0o644, atimeMs: 1, mtimeMs: 2, ctimeMs: 3, birthtimeMs: 4 } });
  });
  it('uses default file-read line end and string append content', async () => {
    mocks.read.mockResolvedValue('first\nsecond\nthird');
    expect(await tool('file.read', { path: root })).toMatchObject({ success: true });
    expect(await tool('file.append', { path: root, content: 'fixture' })).toMatchObject({ success: true, result: { appendedBytes: 7 } });
    expect(mocks.append).toHaveBeenCalledWith(root, 'fixture', 'utf8');
  });
  it.each([
    { replacement: 42, expected: '42 abc', replaceAll: false },
    { replacement: null, expected: ' ', replaceAll: true },
  ])('normalizes replacement $replacement and writes only actual matches', async ({ replacement, expected, replaceAll }) => {
    mocks.read.mockResolvedValue('abc abc');
    expect(await tool('file.replace', { replacement, replaceAll, path: root, search: 'abc' })).toMatchObject({ success: true, result: { matchCount: replaceAll ? 2 : 1 } });
    expect(mocks.write).toHaveBeenCalledWith(root, expected, 'utf8');
  });
  it('does not rewrite a file when replace-all has no matches', async () => {
    mocks.read.mockResolvedValue('keep');
    expect(await tool('file.replace', { path: root, search: 'absent' })).toMatchObject({ success: true, result: { matchCount: 0 } });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it.each([{ isFile: false, size: 0, message: '不是文件' }, { isFile: true, size: 20 * 1024 * 1024, message: '文件过大' }])('rejects replace target $message', async ({ isFile, size, message }) => {
    mocks.stat.mockResolvedValue({ size, isFile: () => isFile, isDirectory: () => !isFile });
    expect(await tool('file.replace', { path: root, search: 'abc' })).toMatchObject({ success: false, error: errorContaining(message) });
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it.each(['leaf failed', null])('normalizes non-Error leaf rejection %s', async (failure) => {
    mocks.read.mockRejectedValue(failure);
    expect(await tool('file.read', { path: root })).toMatchObject({ success: false, error: failure ?? 'local tool failed' });
  });
  it('normalizes command callback output and rejects brightness callback errors', async () => {
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(null, Buffer.from('bytes'), undefined); });
    expect(await tool('cmd.powershell', { command: 'echo fixture' })).toMatchObject({ success: true, result: { stdout: '', stderr: '' } });
    mocks.exec.mockImplementation((program, args, options, callback) => { void program; void args; void options; callback(new Error('brightness denied'), '', ''); });
    expect(await tool('brightness.get', {})).toMatchObject({ success: false, error: 'brightness denied' });
  });
  it('uses the environment default limit and maps missing application metadata', async () => {
    vi.stubEnv('EISLAND_FIXTURE_DEFAULT_LIMIT', 'fixture');
    expect(await tool('sys.env', { filter: 'EISLAND_FIXTURE_DEFAULT_LIMIT' })).toMatchObject({ success: true, result: { count: 1, totalMatched: 1, variables: { EISLAND_FIXTURE_DEFAULT_LIMIT: 'fixture' } } });
    mocks.software.mockResolvedValue([{ DisplayName: 'Fixture', Publisher: '' }]);
    expect(await tool('sys.installed-apps', {})).toMatchObject({ success: true, result: { count: 1, apps: [{ name: 'Fixture', version: '', publisher: '', installDate: '', installLocation: '' }] } });
  });
  it('accepts no-filter window listing', async () => {
    expect(await tool('win.list', {})).toMatchObject({ success: true, result: { windows: [], count: 0 } });
  });
  it('creates a todo when the old JSON store is not an array', async () => {
    mocks.read.mockResolvedValue('{}');
    expect(await tool('todolist.create', { text: 'fixture' })).toMatchObject({ success: true });
    const [[path, content]] = mocks.write.mock.calls;
    void path;
    expect(typeof content).toBe('string');
    expect(JSON.parse(String(content))).toHaveLength(1);
  });
  it.each(['app:pick-local-search-directory', 'app:pick-skill-file', 'app:pick-feedback-screenshot-file', 'app:pick-feedback-log-file', 'app:pick-file-for-hash'])('%s rejects an accepted empty filename', async (channel) => {
    mocks.openDialog.mockResolvedValue({ canceled: false, filePaths: [''] });
    expect(await invoke(channel)).toBeNull();
  });
});

describe('grep and file-search traversal limits', () => {
  it('filters custom exclusions and extension values while accepting a path with trailing separator', async () => {
    mocks.stat.mockImplementation((path) => Promise.resolve({ isFile: () => path !== root, isDirectory: () => path === root, size: 3 }));
    directories.set(root, [entry('cache', true), entry('README'), entry('match.TXT'), entry('next.txt')]);
    mocks.read.mockResolvedValue('needle');
    expect(await tool('file.grep', { path: `${root  }\\`, pattern: 'needle', extensions: [null, '.TXT'], excludeDirs: [null, ' cache '], limit: 1 })).toMatchObject({ success: true, result: { matches: [{ file: `${root  }\\match.TXT`, line: 1, text: 'needle' }] } });
    expect(mocks.readdir).toHaveBeenCalledOnce();
  });
  it('greps files without an extension filter and skips failed directories', async () => {
    mocks.stat.mockImplementation((path) => Promise.resolve({ isFile: () => path !== root, isDirectory: () => path === root, size: 3 }));
    directories.set(root, [entry('denied', true), entry('README')]);
    mocks.read.mockResolvedValue('needle');
    expect(await tool('file.grep', { path: root, pattern: 'needle' })).toMatchObject({ success: true, result: { matches: [{ file: `${root  }\\README`, line: 1, text: 'needle' }] } });
    expect(mocks.readdir).toHaveBeenCalledTimes(2);
  });
  it('caps the pending grep directory queue at twenty thousand entries', async () => {
    mocks.stat.mockResolvedValue({ isFile: () => false, isDirectory: () => true, size: 0 });
    directories.set(root, Array.from({ length: 20001 }, (value, index) => { void value; return entry(`dir${  index}`, true); }));
    expect(await tool('file.grep', { path: root, pattern: 'needle' })).toMatchObject({ success: true, result: { matches: [] } });
    expect(mocks.readdir).toHaveBeenCalledTimes(20001);
    expect(mocks.readdir).not.toHaveBeenCalledWith(`${root  }\\dir20000`, expect.anything());
  });
  it('passes normalized search extensions and default depth into the real traversal', async () => {
    directories.set(root, [entry('match.TXT'), entry('match'), entry('cache', true)]);
    expect(await tool('file.search', { path: `${root  }\\`, keyword: 'match', extensions: [null, '.txt'], excludeDirs: [null, 'cache'], limit: 0 })).toMatchObject({ success: true, result: { items: [{ name: 'match.TXT', path: `${root  }\\match.TXT`, isDirectory: false }] } });
  });
  it('stops tree recursion once the item budget has been consumed by the directory itself', async () => {
    directories.set(root, [entry('nested', true)]);
    expect(await tool('file.tree', { path: root, limit: 1 })).toMatchObject({ success: true, result: { itemCount: 1, tree: [{ name: 'nested', children: [] }] } });
    expect(mocks.readdir).toHaveBeenCalledOnce();
  });
});

describe('remaining default and failure callbacks', () => {
  it('uses the IPC zero-limit default and tolerates falsey exclusions', async () => {
    directories.set(root, [entry('README'), entry('match.txt')]);
    expect(await invoke('app:search-local-files', root, 'match', { limit: 0, excludeDirs: [null], extensions: ['txt'] })).toEqual([{ name: 'match.txt', path: `${root  }\\match.txt`, isDirectory: false }]);
  });
  it('does not duplicate a separator when IPC supplies a trailing double separator', async () => {
    const doubleRoot = `${root  }\\\\`;
    directories.set(doubleRoot, [entry('match.txt')]);
    expect(await invoke('app:search-local-files', doubleRoot, 'match')).toEqual([{ name: 'match.txt', path: `${doubleRoot  }match.txt`, isDirectory: false }]);
  });
  it('returns an empty IPC search response for malformed renderer input', async () => {
    expect(await invoke('app:search-local-files', null, 'fixture')).toEqual([]);
    expect(mocks.readdir).not.toHaveBeenCalled();
  });
  it('uses the default two-hundred-line read window', async () => {
    mocks.read.mockResolvedValue('first\nsecond\nthird');
    expect(await tool('file.read.lines', { path: root, startLine: 2 })).toMatchObject({ success: true, result: { startLine: 2, endLine: 201, count: 2, lines: [{ line: 2, text: 'second' }, { line: 3, text: 'third' }] } });
  });
  it('returns no grep matches when a directly selected file cannot be read', async () => {
    mocks.read.mockRejectedValue(new Error('read denied'));
    expect(await tool('file.grep', { path: root, pattern: 'needle' })).toMatchObject({ success: true, result: { matches: [] } });
    expect(mocks.readdir).not.toHaveBeenCalled();
  });
  it('uses PID zero for windows with a missing process owner', async () => {
    mocks.windows.mockResolvedValue([{ id: '42', title: 'Fixture', processName: 'fixture.exe', processPath: null, processId: null, iconDataUrl: null }]);
    expect(await tool('win.minimize', { name: 'fixture' })).toMatchObject({ success: true, result: { pid: 0, handle: 42 } });
    expect(await tool('win.restore', { handle: 42 })).toMatchObject({ success: true, result: { pid: 0, handle: 42 } });
    expect(mocks.exec).toHaveBeenCalledTimes(2);
  });
  it('resolves an explicit zero handle using the fallback window search', async () => {
    mocks.windows.mockResolvedValue([{ id: '0', title: 'Fixture', processName: 'fixture.exe', processPath: null, processId: null, iconDataUrl: null }]);
    expect(await tool('win.minimize', { handle: 0 })).toMatchObject({ success: false, error: '无法获取窗口句柄' });
    mocks.windows.mockResolvedValue([{ id: '42', title: 'Fixture', processName: 'fixture.exe', processPath: null, processId: null, iconDataUrl: null }]);
    expect(await tool('win.minimize', { handle: 0 })).toMatchObject({ success: true, result: { pid: 0, handle: 42 } });
    expect(mocks.exec).toHaveBeenCalledOnce();
  });
});

describe('grep root metadata failure', () => {
  it('falls back to directory traversal when root stat fails', async () => {
    mocks.stat.mockRejectedValue(new Error('stat denied'));
    expect(await tool('file.grep', { path: root, pattern: 'needle' })).toMatchObject({ success: true, result: { matches: [] } });
    expect(mocks.stat).toHaveBeenCalledWith(root);
    expect(mocks.readdir).toHaveBeenCalledWith(root, { withFileTypes: true });
  });
});

describe('sys.open own-key regression', () => {
  it.each(['__proto__', 'constructor'])('rejects inherited key %s without an open side effect', async (target) => {
    expect(await tool('sys.open', { target })).toMatchObject({ success: false, error: errorContaining(`sys.open 不支持的 target: ${  target}`) });
    expect(mocks.exec).not.toHaveBeenCalled();
    expect(mocks.external).not.toHaveBeenCalled();
  });
});
