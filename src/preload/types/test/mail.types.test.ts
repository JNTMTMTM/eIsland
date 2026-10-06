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
 * @file mail.types.test.ts
 * @description mail 的跨进程类型契约、合法配置与非法字段约束测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MailInboxItem, MailInboxResult } from '../mail';
describe('mail contracts', () => {
  it('fixes MailInboxItem fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MailInboxItem>().toEqualTypeOf<{
      uid: string;
      subject: string;
      from: string;
      to: string;
      date: string;
      size: number;
      preview: string;
      body: string;
    }>();
    const fixture: MailInboxItem = { uid: 'sample', subject: 'sample', from: 'sample', to: 'sample', date: 'sample', size: 0, preview: 'sample', body: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error MailInboxItem.uid 禁止使用契约外字段值。
    const invalid: MailInboxItem['uid'] = 123;
    expect(invalid).toBeDefined();
  });
  it('fixes MailInboxResult fields and accepts its explicit legal fixture', () => {
    expectTypeOf<MailInboxResult>().toEqualTypeOf<{
      ok: boolean;
      items: MailInboxItem[];
      message: string;
    }>();
    const fixture: MailInboxResult = { ok: false, items: [], message: 'sample' };
    expect(fixture).toBeDefined();
    // @ts-expect-error MailInboxResult.ok 禁止使用契约外字段值。
    const invalid: MailInboxResult['ok'] = 'invalid';
    expect(invalid).toBeDefined();
  });
});
