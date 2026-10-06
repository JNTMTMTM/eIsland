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
 * @file mailAccountConfig.types.test.ts
 * @description MailAccountConfig.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MailAccountConfig } from "../MailAccountConfig";

/** 固定 MailAccountConfig 的完整公开形状，独立于源类型展开。 */
interface ExpectedMailAccountConfig {
  emailAddress: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  authUser: string;
  authSecret: string;
}

describe("MailAccountConfig.ts 完整类型契约", () => {
  it("MailAccountConfig 完整字段、合法样例与非法状态", () => {
    expectTypeOf<MailAccountConfig>().toEqualTypeOf<ExpectedMailAccountConfig>();
    const legal: MailAccountConfig = { emailAddress: 'fixture', imapHost: 'fixture', imapPort: 'fixture', imapSecure: false, authUser: 'fixture', authSecret: 'fixture' };
    expectTypeOf(legal).toMatchTypeOf<ExpectedMailAccountConfig>();
    expect(legal).toBeDefined();
    expectTypeOf<Omit<ExpectedMailAccountConfig, "emailAddress">>().not.toMatchTypeOf<MailAccountConfig>();
    // @ts-expect-error MailAccountConfig.emailAddress 拒绝契约外字段类型或状态。
    const invalid: MailAccountConfig["emailAddress"] = 123;
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<MailAccountConfig>();
  });
});
