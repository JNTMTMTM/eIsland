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
 * @file UserFeedback.ts
 * @description 用户反馈相关数据结构定义
 * @author 鸡哥
 */

/** 用户反馈项 */
export interface UserIssueFeedbackItem {
  /** 反馈ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 反馈类型 */
  feedbackType: string;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 联系方式 */
  contact?: string;
  /** 反馈日志URL */
  feedbackLogUrl?: string;
  /** 反馈截图URL */
  feedbackScreenshotUrl?: string;
  /** 客户端版本 */
  clientVersion?: string;
  /** 状态 */
  status: string;
  /** 管理员回复 */
  adminReply?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
  /** 解决时间 */
  resolvedAt?: string;
}

/** 用户反馈列表数据 */
export interface UserIssueFeedbackListData {
  /** 反馈列表 */
  items: UserIssueFeedbackItem[];
  /** 总数 */
  total: number;
  /** 页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
}

/** 提交用户反馈载荷 */
export interface SubmitUserIssueFeedbackPayload {
  /** 反馈类型 */
  feedbackType: string;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 联系方式 */
  contact?: string;
  /** 反馈日志URL */
  feedbackLogUrl?: string;
  /** 反馈截图URL */
  feedbackScreenshotUrl?: string;
  /** 客户端版本 */
  clientVersion?: string;
  /** 验证码票据 */
  captchaTicket: string;
  /** 验证码随机字符串 */
  captchaRandstr: string;
  /** 验证码签名 */
  captchaSign: string;
}

/** 用户反馈上传选项 */
export interface UserFeedbackUploadOptions {
  /** 上传进度回调 */
  onUploadProgress?: (percent: number) => void;
}

/** 问题反馈页 QQ 群配置 */
export interface FeedbackQqGroupConfig {
  /** QQ 群邀请链接 */
  qqInviteUrl: string;
}
