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
 * @file MailInboxItem.ts
 * @description 邮件收件箱条目类型定义
 * @author 鸡哥
 */

/** 邮件收件箱条目 */
export interface MailInboxItem {
  /** 邮件 UID */
  uid: string;
  /** 邮箱代次，防止服务端重建后 UID 指向另一封邮件。 */
  uidValidity?: string;
  /** 主题 */
  subject: string;
  /** 发件人 */
  from: string;
  /** 收件人 */
  to: string;
  /** 日期 */
  date: string;
  /** 大小（字节） */
  size: number;
  /** 预览文本 */
  preview: string;
  /** 正文 */
  body: string;
}
