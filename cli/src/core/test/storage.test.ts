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
 * @file storage.test.ts
 * @description 验证应用存储目录定位、敏感内容遮蔽、存储项删除，以及存储目录的读取、排序与异常归类
 * @author 鸡哥
 */

import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  deleteStoreEntry, loadStoreSnapshot, MASK, maskSecrets, readStore, resolveStoreDir,
} from '../storage';

const sandbox = mkdtempSync(path.join(tmpdir(), 'eisland-cli-storage-'));
const storeDir = path.join(sandbox, 'eIsland_store');
mkdirSync(storeDir);
writeFileSync(path.join(storeDir, 'theme-mode.json'), JSON.stringify('dark'));
writeFileSync(path.join(storeDir, 'todos.json'), JSON.stringify([{ id: 1, title: 'a' }]));
writeFileSync(path.join(storeDir, 'user-account-token.json'), JSON.stringify('secret-token'));
writeFileSync(path.join(storeDir, 'broken.json'), '{ not json');
writeFileSync(path.join(storeDir, 'notes.txt'), 'ignored');

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('resolveStoreDir', () => {
  it('按 Electron userData 规则定位各平台目录', () => {
    expect(resolveStoreDir({ platform: 'win32', env: { APPDATA: 'C:\\Roaming' }, home: 'C:\\Users\\me' }))
      .toBe(path.join('C:\\Roaming', 'eisland', 'eIsland_store'));
    expect(resolveStoreDir({ platform: 'win32', env: {}, home: '/home' }))
      .toBe(path.join('/home', 'AppData', 'Roaming', 'eisland', 'eIsland_store'));
    expect(resolveStoreDir({ platform: 'darwin', env: {}, home: '/Users/me' }))
      .toBe(path.join('/Users/me', 'Library', 'Application Support', 'eisland', 'eIsland_store'));
    expect(resolveStoreDir({ platform: 'linux', env: { XDG_CONFIG_HOME: '/cfg' }, home: '/home/me' }))
      .toBe(path.join('/cfg', 'eisland', 'eIsland_store'));
    expect(resolveStoreDir({ platform: 'linux', env: {}, home: '/home/me' }))
      .toBe(path.join('/home/me', '.config', 'eisland', 'eIsland_store'));
  });
});

describe('maskSecrets', () => {
  it('凭据类存储键遮蔽整个值', () => {
    expect(maskSecrets('user-account-token', 'abc')).toEqual({ value: MASK, masked: true });
    expect(maskSecrets('mail-password', { a: 1 })).toEqual({ value: MASK, masked: true });
  });

  it('递归遮蔽凭据与个人信息字段，保留其余结构', () => {
    const value = {
      username: 'me',
      email: 'me@example.com',
      author: 'kept',
      accounts: [{ host: 'smtp', smtpPassword: 'p', accessToken: 't', apiKey: 'k' }],
      empty: { password: '' },
    };
    expect(maskSecrets('mail-accounts-config', value)).toEqual({
      masked: true,
      value: {
        username: 'me',
        email: MASK,
        author: 'kept',
        accounts: [{ host: 'smtp', smtpPassword: MASK, accessToken: MASK, apiKey: MASK }],
        empty: { password: '' },
      },
    });
  });

  it('没有敏感内容时原样返回', () => {
    expect(maskSecrets('theme-mode', 'dark')).toEqual({ value: 'dark', masked: false });
  });
});

describe('readStore', () => {
  it('按键名排序读取全部 JSON 文件，遮蔽并标记解析失败项', () => {
    const entries = readStore(storeDir) ?? [];
    expect(entries.map((entry) => entry.key)).toEqual(['broken', 'theme-mode', 'todos', 'user-account-token']);
    const [broken, theme, todos, token] = entries;
    expect(broken.error).toEqual(expect.any(String));
    expect(broken.value).toBeUndefined();
    expect(theme).toEqual(expect.objectContaining({ value: 'dark', masked: false, error: null, size: 6 }));
    expect(todos.value).toEqual([{ id: 1, title: 'a' }]);
    expect(token).toEqual(expect.objectContaining({ value: MASK, masked: true }));
    expect(theme.modified).toBeGreaterThan(0);
  });

  it('目录不存在时返回 null', () => {
    expect(readStore(path.join(sandbox, 'missing'))).toBeNull();
  });
});

describe('deleteStoreEntry', () => {
  it('删除对应的 JSON 文件，不存在时抛出', () => {
    writeFileSync(path.join(storeDir, 'to-delete.json'), JSON.stringify(1));
    deleteStoreEntry(storeDir, 'to-delete');
    expect(readStore(storeDir)?.map((entry) => entry.key)).not.toContain('to-delete');
    expect(() => deleteStoreEntry(storeDir, 'to-delete')).toThrow();
  });
});

describe('loadStoreSnapshot', () => {
  it('归类读取成功、目录缺失与读取失败', () => {
    expect(loadStoreSnapshot(storeDir)).toEqual(expect.objectContaining({ state: 'ready', error: '' }));
    expect(loadStoreSnapshot(path.join(sandbox, 'missing'))).toEqual({ state: 'missing', entries: [], error: '' });
    // 传入文件而非目录，readdir 会以 ENOTDIR 失败。
    expect(loadStoreSnapshot(path.join(storeDir, 'notes.txt'))).toEqual(expect.objectContaining({ state: 'error', entries: [] }));
  });
});
