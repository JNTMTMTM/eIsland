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
 * @file useSettingsMail.ts
 * @description 邮箱账户、迁移加载标记与收取数量状态
 * @author 鸡哥
 */

import { useState } from 'react';
import { type MailAccountConfig } from '../config/settingsTabConfig';

/**
 * 邮箱账户、迁移加载标记与收取数量状态。
 * @returns 供设置视图组合使用的状态与操作
 */
export function useSettingsMail() {
  const [mailAccounts, setMailAccounts] = useState<MailAccountConfig[]>([]);
  const [activeMailAccountId, setActiveMailAccountId] = useState<string>('');
  const [mailConfigLoaded, setMailConfigLoaded] = useState(false);
  const [mailFetchLimit, setMailFetchLimit] = useState<number>(10);

  return {
    mailAccounts,
    setMailAccounts,
    activeMailAccountId,
    setActiveMailAccountId,
    mailConfigLoaded,
    setMailConfigLoaded,
    mailFetchLimit,
    setMailFetchLimit,
  };
}
