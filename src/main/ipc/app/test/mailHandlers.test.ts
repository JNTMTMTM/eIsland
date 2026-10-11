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
 * @file mailHandlers.test.ts
 * @description mail IPC handlers 单元测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleMock } = vi.hoisted(() => ({
  handleMock: vi.fn(),
}));

const { existsSyncMock, readFileSyncMock, writeFileSyncMock } = vi.hoisted(() => ({
  existsSyncMock: vi.fn(),
  readFileSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

const {
  connectMock,
  logoutMock,
  closeMock,
  getMailboxLockMock,
  searchMock,
  fetchOneMock,
} = vi.hoisted(() => ({
  connectMock: vi.fn(),
  logoutMock: vi.fn(),
  closeMock: vi.fn(),
  getMailboxLockMock: vi.fn(),
  searchMock: vi.fn(),
  fetchOneMock: vi.fn(),
}));

const { simpleParserMock } = vi.hoisted(() => ({
  simpleParserMock: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock,
  },
}));

vi.mock('fs', () => ({
  existsSync: existsSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

vi.mock('imapflow', () => ({
  ImapFlow: class {
    mailbox = { exists: 2, uidValidity: 1n };
    connect = connectMock;

    logout = logoutMock;

    close = closeMock;

    getMailboxLock = getMailboxLockMock;

    search = searchMock;

    fetchOne = fetchOneMock;
  },
}));

vi.mock('mailparser', () => ({
  simpleParser: simpleParserMock,
}));

import { registerMailIpcHandlers } from '../mail';

describe('app mail ipc handlers', () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>();

  beforeEach(() => {
    handlers.clear();

    handleMock.mockReset();
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
    writeFileSyncMock.mockReset();

    connectMock.mockReset();
    logoutMock.mockReset();
    closeMock.mockReset();
    getMailboxLockMock.mockReset();
    searchMock.mockReset();
    fetchOneMock.mockReset();
    simpleParserMock.mockReset();

    handleMock.mockImplementation((channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    });

    connectMock.mockResolvedValue(undefined);
    logoutMock.mockResolvedValue(undefined);
    getMailboxLockMock.mockResolvedValue({ release: vi.fn() });
    searchMock.mockResolvedValue([1, 2]);
    fetchOneMock.mockResolvedValue({
      uid: 1,
      source: Buffer.from('raw'),
      size: 10,
      envelope: {
        subject: 'fallback-subject',
        from: [{ name: 'Sender', address: 'sender@example.com' }],
        to: [{ name: 'To', address: 'to@example.com' }],
        date: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    simpleParserMock.mockResolvedValue({
      subject: 'hello',
      text: 'hello text',
      html: '<p>hello text</p>',
      from: { text: 'Sender <sender@example.com>' },
      to: { text: 'To <to@example.com>' },
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('returns config error when no stored mail config exists', async () => {
    existsSyncMock.mockReturnValue(false);

    registerMailIpcHandlers({
      storeDir: 'C:/store',
      mailConfigStoreKey: 'mail-config',
    });

    const inboxList = handlers.get('mail:inbox:list');
    await expect(inboxList?.({}, 10)).resolves.toEqual({
      ok: false,
      items: [],
      message: '未检测到邮箱配置，请先在设置中完成 IMAP 参数填写',
    });
  });

  it('handles inbox list with runtime config and clamps limit', async () => {
    existsSyncMock.mockReturnValue(false);

    registerMailIpcHandlers({
      storeDir: 'C:/store',
      mailConfigStoreKey: 'mail-config',
    });

    const inboxList = handlers.get('mail:inbox:list');

    const result = await inboxList?.(
      {},
      {
        emailAddress: 'demo@example.com',
        imapHost: 'imap.example.com',
        imapPort: '993',
        imapSecure: true,
        authUser: 'demo@example.com',
        authSecret: 'secret',
      },
      99,
    ) as { ok: boolean; items: Array<{ uid: string; subject: string }>; message: string };

    expect(result.ok).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.subject).toBe('fallback-subject');
    expect(searchMock).not.toHaveBeenCalled();
    expect(simpleParserMock).not.toHaveBeenCalled();
    expect(fetchOneMock).toHaveBeenCalledTimes(2);
    expect(fetchOneMock).toHaveBeenNthCalledWith(1, 2, expect.objectContaining({ envelope: true, size: true }));
    expect(logoutMock).toHaveBeenCalled();
    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });
});
