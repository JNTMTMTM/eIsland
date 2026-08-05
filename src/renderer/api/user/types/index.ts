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
 * @file index.ts
 * @description 用户模块类型统一导出
 * @author 鸡哥
 */

export type { UserAccountResult } from './UserAccountResult';
export type { UserAccountLoginData } from './UserAccountLoginData';
export type { UserEmailCodeScene } from './UserEmailCodeScene';
export type { UserCaptchaConfig, UserCaptchaChallenge, UserCaptchaPayload } from './UserCaptcha';
export type {
  WallpaperMarketItem,
  WallpaperMarketListData,
  UploadWallpaperPayload,
  UploadWallpaperOptions,
  WallpaperTagItem,
} from './Wallpaper';
export type {
  UserIssueFeedbackItem,
  UserIssueFeedbackListData,
  SubmitUserIssueFeedbackPayload,
  UserFeedbackUploadOptions,
  FeedbackQqGroupConfig,
} from './UserFeedback';
export type { UpdateUserProfilePayload, UpdateUserPasswordPayload } from './UserProfile';
export type {
  UserPaymentCreateChannel,
  UserPaymentPricingData,
  UserPaymentChannelsData,
  UserPaymentOrderData,
  AgentBalanceData,
} from './UserPayment';
export type { InternalRequestInit } from './InternalRequestInit';
export type { UserAccountGender, UserAccountProfile } from '../../../utils/userAccount';
