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
 * @file userAccountApi.types.ts
 * @description 用户账号 API 相关类型定义。
 * @author 鸡哥
 */

import type {
  UserAccountGender,
} from '../../utils/userAccount';

export type { UserAccountGender, UserAccountProfile } from '../../utils/userAccount';

export interface UserAccountResult<T = unknown> {
  ok: boolean;
  code: number;
  message: string;
  data?: T;
}

export interface UserAccountLoginData {
  token: string;
  username: string;
  email: string;
  role: string;
}

export type UserEmailCodeScene = 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD' | 'CHANGE_EMAIL' | 'UNREGISTER';

export interface UserCaptchaConfig {
  enabled: boolean;
  provider?: string;
  minValue?: number;
  maxValue?: number;
  tolerance?: number;
  challengeTtlSeconds?: number;
}

export interface UserCaptchaChallenge {
  challengeId: string;
  minValue: number;
  maxValue: number;
  targetValue: number;
  tolerance: number;
  captchaSign: string;
}

export interface UserCaptchaPayload {
  ticket: string;
  randstr: string;
  sign: string;
}

export interface WallpaperMarketItem {
  id: number;
  ownerUsername: string;
  ownerAvatar?: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  status: string;
  originalUrl?: string;
  thumb320Url?: string;
  thumb720Url?: string;
  thumb1280Url?: string;
  durationMs?: number;
  frameRate?: number;
  tagsText?: string;
  copyrightInfo?: string;
  ratingAvg?: number;
  ratingCount?: number;
  downloadCount?: number;
  applyCount?: number;
  createdAt?: string;
  publishedAt?: string;
}

export interface WallpaperMarketListData {
  items: WallpaperMarketItem[];
  total?: number;
}

export interface UploadWallpaperPayload {
  title: string;
  description?: string;
  tags?: string;
  type?: 'image' | 'video';
  copyrightDeclared: boolean;
  copyrightInfo?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  frameRate?: number;
  original: File;
  thumb320: File;
  thumb720: File;
  thumb1280: File;
}

export interface UploadWallpaperOptions {
  onUploadProgress?: (percent: number) => void;
}

export interface WallpaperTagItem {
  id: number;
  name: string;
  slug: string;
  usageCount?: number;
}

export interface UserIssueFeedbackItem {
  id: number;
  username: string;
  feedbackType: string;
  title: string;
  content: string;
  contact?: string;
  feedbackLogUrl?: string;
  feedbackScreenshotUrl?: string;
  clientVersion?: string;
  status: string;
  adminReply?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface UserIssueFeedbackListData {
  items: UserIssueFeedbackItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SubmitUserIssueFeedbackPayload {
  feedbackType: string;
  title: string;
  content: string;
  contact?: string;
  feedbackLogUrl?: string;
  feedbackScreenshotUrl?: string;
  clientVersion?: string;
  captchaTicket: string;
  captchaRandstr: string;
  captchaSign: string;
}

export interface UserFeedbackUploadOptions {
  onUploadProgress?: (percent: number) => void;
}

export interface UpdateUserProfilePayload {
  avatar?: string | null;
  gender?: UserAccountGender;
  genderCustom?: string | null;
  birthday?: string | null;
}

export interface UpdateUserPasswordPayload {
  password: string;
  emailCode: string;
}

export interface UserPaymentPricingData {
  productCode: string;
  amountFen: number;
  amountYuan: string;
  currency: string;
  billingCycle: string;
  subject: string;
  freeDesc?: string;
  freeFeatures?: string[];
  proDesc?: string;
  proFeatures?: string[];
}

export interface UserPaymentChannelsData {
  wechatEnabled: boolean;
  alipayEnabled: boolean;
}

export interface UserPaymentOrderData {
  outTradeNo: string;
  productCode: string;
  amountFen: number;
  currency: string;
  status: string;
  channel: 'WECHAT' | 'ALIPAY';
  qrCodeUrl?: string;
  payUrl?: string;
  expireAt?: string;
  paidAt?: string;
  proExpireAt?: string;
}
