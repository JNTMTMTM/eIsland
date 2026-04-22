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
 * @file userAccountApi.auth.ts
 * @description 用户账号认证相关接口（登录、注册、邮箱验证码、滑块配置）。
 * @author 鸡哥
 */

import { request } from './userAccountApi.client';
import type {
  UserAccountLoginData,
  UserAccountResult,
  UserCaptchaChallenge,
  UserCaptchaConfig,
  UserCaptchaPayload,
  UserEmailCodeScene,
} from './userAccountApi.types';

/**
 * 用户账户登录（用户名）。
 * @param username - 用户名。
 * @param password - 密码。
 * @param emailCode - 邮箱验证码（可选）。
 * @returns 登录结果。
 */
export function loginUserByAccount(
  username: string,
  password: string,
  emailCode?: string,
): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/account', {
    method: 'POST',
    body: {
      username,
      password,
      emailCode: emailCode?.trim() ? emailCode.trim() : undefined,
    },
  });
}

/**
 * 用户邮箱登录。
 * @param email - 邮箱。
 * @param password - 密码。
 * @returns 登录结果。
 */
export function loginUserByEmail(email: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/email', {
    method: 'POST',
    body: { email, password, emailCode: '' },
  });
}

/**
 * 用户邮箱登录（带验证码）。
 * @param email - 邮箱。
 * @param password - 密码。
 * @param emailCode - 邮箱验证码。
 * @returns 登录结果。
 */
export function loginUserByEmailWithCode(
  email: string,
  password: string,
  emailCode: string,
): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/login/email', {
    method: 'POST',
    body: { email, password, emailCode },
  });
}

/**
 * 用户登录兼容入口。
 * @param account - 账号（用户名或邮箱）。
 * @param password - 密码。
 * @returns 登录结果。
 */
export function loginUser(account: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return account.includes('@')
    ? loginUserByEmailWithCode(account, password, '')
    : loginUserByAccount(account, password);
}

/**
 * 用户注册。
 * @param username - 用户名。
 * @param email - 邮箱。
 * @param password - 密码。
 * @returns 注册结果。
 */
export function registerUser(username: string, email: string, password: string): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/register', {
    method: 'POST',
    body: { username, email, password, emailCode: '' },
  });
}

/**
 * 用户注册（带邮箱验证码）。
 * @param username - 用户名。
 * @param email - 邮箱。
 * @param password - 密码。
 * @param emailCode - 邮箱验证码。
 * @returns 注册结果。
 */
export function registerUserWithCode(
  username: string,
  email: string,
  password: string,
  emailCode: string,
): Promise<UserAccountResult<UserAccountLoginData>> {
  return request<UserAccountLoginData>('/auth/user/register', {
    method: 'POST',
    body: { username, email, password, emailCode },
  });
}

/**
 * 获取邮箱验证码滑块配置。
 * @returns 滑块配置结果。
 */
export function fetchUserCaptchaConfig(): Promise<UserAccountResult<UserCaptchaConfig>> {
  return request<UserCaptchaConfig>('/auth/user/email-code/captcha-config', {
    method: 'GET',
  });
}

/**
 * 创建邮箱验证码滑块挑战。
 * @param account - 账户标识。
 * @returns 挑战参数。
 */
export function createUserCaptchaChallenge(account: string): Promise<UserAccountResult<UserCaptchaChallenge>> {
  return request<UserCaptchaChallenge>('/auth/user/email-code/captcha-challenge', {
    method: 'POST',
    body: { account },
  });
}

/**
 * 发送邮箱验证码。
 * @param email - 邮箱。
 * @param scene - 验证码使用场景。
 * @param captcha - 滑块验证票据。
 * @returns 发送结果。
 */
export function sendUserEmailCode(
  email: string,
  scene: UserEmailCodeScene,
  captcha: UserCaptchaPayload,
): Promise<UserAccountResult<{ retryAfterSeconds?: number }>> {
  return request<{ retryAfterSeconds?: number }>('/auth/user/email-code/send', {
    method: 'POST',
    body: {
      email,
      scene,
      captchaTicket: captcha.ticket,
      captchaRandstr: captcha.randstr,
      captchaSign: captcha.sign,
    },
  });
}

/**
 * 校验邮箱验证码。
 * @param email - 邮箱。
 * @param scene - 验证码使用场景。
 * @param code - 邮箱验证码。
 * @param captcha - 滑块验证票据。
 * @param consume - 是否消费验证码。
 * @returns 校验结果。
 */
export function verifyUserEmailCode(
  email: string,
  scene: UserEmailCodeScene,
  code: string,
  captcha: { ticket: string; randstr: string; sign: string },
  consume = true,
): Promise<UserAccountResult<unknown>> {
  return request('/auth/user/email-code/verify', {
    method: 'POST',
    body: {
      email,
      scene,
      code,
      consume,
      captchaTicket: captcha.ticket,
      captchaRandstr: captcha.randstr,
      captchaSign: captcha.sign,
    },
  });
}
