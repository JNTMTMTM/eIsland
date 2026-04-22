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
 * @file userAccountApi.profile.ts
 * @description 用户资料相关接口（资料、密码、登录态、头像上传）。
 * @author 鸡哥
 */

import {
  DEFAULT_TOTP_DIGITS,
  DEFAULT_TOTP_PERIOD_SECONDS,
  generateTotpFromBase32Seed,
} from '../../utils/security';
import {
  buildUploadHeaders,
  request,
  USER_ACCOUNT_API_BASE,
} from './userAccountApi.client';
import type {
  UpdateUserPasswordPayload,
  UpdateUserProfilePayload,
  UserAccountProfile,
  UserAccountResult,
  UserCaptchaPayload,
} from './userAccountApi.types';

interface UserPasswordTotpSeedData {
  seed: string;
  algorithm?: string;
  digits?: number;
  periodSeconds?: number;
}

/**
 * 获取当前登录用户资料。
 * @param token - 用户 token。
 * @returns 资料结果。
 */
export function fetchUserProfile(token: string): Promise<UserAccountResult<UserAccountProfile>> {
  return request<UserAccountProfile>('/v1/user/profile', {
    method: 'GET',
    auth: token,
  });
}

/**
 * 修改当前登录用户资料。
 * @param token - 用户 token。
 * @param payload - 待更新字段。
 * @returns 修改结果。
 */
export function updateUserProfile(token: string, payload: UpdateUserProfilePayload): Promise<UserAccountResult<unknown>> {
  const body: Record<string, unknown> = {};
  if (payload.avatar !== undefined) body.avatar = payload.avatar;
  if (payload.gender) body.gender = payload.gender;
  if (payload.genderCustom !== undefined) body.genderCustom = payload.genderCustom;
  if (payload.birthday !== undefined) body.birthday = payload.birthday;
  return request('/v1/user/profile', {
    method: 'PUT',
    auth: token,
    body,
  });
}

/**
 * 修改当前登录用户密码。
 * @param token - 用户 token。
 * @param payload - 密码更新参数。
 * @returns 修改结果。
 */
export async function updateUserPassword(token: string, payload: UpdateUserPasswordPayload): Promise<UserAccountResult<unknown>> {
  try {
    const seedResult = await request<UserPasswordTotpSeedData>('/v1/user/profile/password/totp-seed', {
      method: 'GET',
      auth: token,
    });
    if (!seedResult.ok || !seedResult.data?.seed) {
      return {
        ok: false,
        code: seedResult.code || 500,
        message: seedResult.message || 'TOTP Seed 获取失败',
      };
    }
    const totpCode = await generateTotpFromBase32Seed(
      seedResult.data.seed,
      Math.floor(Date.now() / 1000),
      DEFAULT_TOTP_PERIOD_SECONDS,
      DEFAULT_TOTP_DIGITS,
    );
    return request('/v1/user/profile/password', {
      method: 'POST',
      auth: token,
      body: {
        password: payload.password,
        emailCode: payload.emailCode,
        totpCode,
      },
    });
  } catch {
    return {
      ok: false,
      code: 500,
      message: 'TOTP 生成失败',
    };
  }
}

/**
 * 用户登出。
 * @param token - 用户 token。
 * @returns 登出结果。
 */
export function logoutUser(token: string): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/logout', {
    method: 'POST',
    auth: token,
    body: {},
  });
}

/**
 * 注销账号。
 * @param token - 用户 token。
 * @param password - 当前密码。
 * @param emailCode - 邮箱验证码。
 * @returns 注销结果。
 */
export function unregisterUser(token: string, password: string, emailCode: string): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/account', {
    method: 'DELETE',
    auth: token,
    body: { password, emailCode },
  });
}

/**
 * 上传用户头像。
 * @param file - 头像文件。
 * @param token - 用户 token。
 * @param captcha - 滑块验证票据。
 * @returns 上传后的头像 URL。
 */
export async function uploadUserAvatar(file: File, token: string, captcha: UserCaptchaPayload): Promise<string> {
  if (!token || token.trim().length === 0) {
    throw new Error('未登录');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('captchaTicket', captcha.ticket);
  formData.append('captchaRandstr', captcha.randstr);
  formData.append('captchaSign', captcha.sign);
  const headers = await buildUploadHeaders(token);
  const resp = await fetch(`${USER_ACCOUNT_API_BASE}/v1/upload/user-avatar`, {
    method: 'POST',
    headers,
    body: formData,
  });
  let payload: { code?: number; message?: string; data?: string } | null = null;
  try {
    payload = await resp.json() as { code?: number; message?: string; data?: string };
  } catch {
    payload = null;
  }
  if (!resp.ok) {
    throw new Error(payload?.message || `上传失败：HTTP ${resp.status}`);
  }
  if (payload?.code !== 200 || typeof payload.data !== 'string' || payload.data.length === 0) {
    throw new Error(payload?.message || '上传失败');
  }
  return payload.data;
}
