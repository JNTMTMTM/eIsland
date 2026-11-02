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
 * @file storageView.test.tsx
 * @description 验证本地存储测试界面的列表与详情渲染、遮蔽提示、翻看、刷新、返回与目录缺失提示
 * @author 鸡哥
 */

import {
  mkdirSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { render } from 'ink-testing-library';
import {
  afterAll, beforeAll, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { initI18n } from '../../../core/i18n';
import { resolveStoreDir } from '../../../core/storage';
import StorageView from '../storageView';

vi.mock('../../../core/storage', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../core/storage')>(),
  resolveStoreDir: vi.fn(),
}));

const resolveMock = vi.mocked(resolveStoreDir);
const sandbox = mkdtempSync(path.join(tmpdir(), 'eisland-cli-storage-view-'));
const storeDir = path.join(sandbox, 'eIsland_store');
const DOWN = '\u001B[B';
const PAGE_DOWN = '\u001B[6~';
const ESCAPE = '\u001B';

/**
 * 等待 Ink 处理输入并完成重新渲染
 * @returns 下一轮宏任务的 Promise
 */
const flush = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 30);
});

beforeAll(async () => {
  mkdirSync(storeDir);
  writeFileSync(path.join(storeDir, 'theme-mode.json'), JSON.stringify('dark'));
  writeFileSync(path.join(storeDir, 'user-account-profile.json'), JSON.stringify({ username: 'me', email: 'me@example.com' }));
  // 足够长的数组，用于验证翻看与剩余行提示。
  writeFileSync(path.join(storeDir, 'zz-long.json'), JSON.stringify(Array.from({ length: 40 }, (value, index) => `item-${index}`)));
  await initI18n('en-US');
});

beforeEach(() => {
  resolveMock.mockReturnValue(storeDir);
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('StorageView', () => {
  it('列出全部存储项并展示首项详情', () => {
    const { lastFrame, unmount } = render(<StorageView onBack={vi.fn()} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('3 entries');
    expect(frame).toContain(storeDir);
    expect(frame).toContain('❯ theme-mode');
    expect(frame).toContain('user-account-profile *');
    expect(frame).toContain('string · 6 B');
    expect(frame).toContain('"dark"');
    unmount();
  });

  it('选中含敏感字段的项时提示遮蔽且不显示原值', async () => {
    const { stdin, lastFrame, unmount } = render(<StorageView onBack={vi.fn()} />);
    await flush();
    stdin.write(DOWN);
    await flush();
    const frame = lastFrame() ?? '';
    expect(frame).toContain('object · 2 members');
    expect(frame).toContain('Secrets and personal info are masked');
    expect(frame).toContain('"email": "******"');
    expect(frame).not.toContain('me@example.com');
    unmount();
  });

  it('长内容可翻看并提示剩余行数', async () => {
    const { stdin, lastFrame, unmount } = render(<StorageView onBack={vi.fn()} />);
    await flush();
    stdin.write(DOWN);
    await flush();
    stdin.write(DOWN);
    await flush();
    expect(lastFrame()).toContain('"item-0"');
    expect(lastFrame()).toMatch(/\.\.\. \d+ more lines/);
    stdin.write(PAGE_DOWN);
    await flush();
    expect(lastFrame()).not.toContain('"item-0"');
    unmount();
  });

  it('R 重新读取，Esc 返回', async () => {
    const onBack = vi.fn();
    const { stdin, lastFrame, unmount } = render(<StorageView onBack={onBack} />);
    await flush();
    writeFileSync(path.join(storeDir, 'added.json'), JSON.stringify(true));
    stdin.write('r');
    await flush();
    expect(lastFrame()).toContain('4 entries');
    stdin.write(ESCAPE);
    await flush();
    expect(onBack).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('目录不存在时提示应用尚未运行', () => {
    resolveMock.mockReturnValue(path.join(sandbox, 'missing'));
    const { lastFrame, unmount } = render(<StorageView onBack={vi.fn()} />);
    expect(lastFrame()).toContain('Store directory not found');
    unmount();
  });
});
