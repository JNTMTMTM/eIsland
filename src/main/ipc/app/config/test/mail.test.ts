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
 * @file mail.test.ts
 * @description mail 配置契约：任务容量、超时及持久化默认值。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { IMAP_TIMEOUT_MS, MAIL_INBOX_CACHE_STORE_KEY, MAIL_INBOX_CACHE_MAX_ITEMS } from '../mail';

describe('mail 配置契约', () => {
  it('固定公开配置，避免调用方容量和延迟约定漂移', () => {
    expect(IMAP_TIMEOUT_MS).toBe(15000);
    expect(MAIL_INBOX_CACHE_STORE_KEY).toBe('mail-inbox-cache');
    expect(MAIL_INBOX_CACHE_MAX_ITEMS).toBe(200);
  });
});
