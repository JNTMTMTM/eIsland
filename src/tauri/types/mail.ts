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
 * @file mail.ts
 * @description 邮件功能相关类型定义
 * @author 鸡哥
 */

/** 邮件列表结果项 */
export interface MailInboxItem {
  uid: string;
  /** 邮箱代次，防止服务端重建后 UID 指向另一封邮件。 */
  uidValidity?: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  size: number;
  preview: string;
  body: string;
}

/** 邮件列表结果 */
export interface MailInboxResult {
  ok: boolean;
  items: MailInboxItem[];
  message: string;
}
