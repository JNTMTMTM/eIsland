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
 * @file userAccountApi.feedback.ts
 * @description 用户问题反馈相关接口（提交、列表、日志与截图上传）。
 * @author 鸡哥
 */

import {
  buildUploadHeaders,
  parsePayload,
  request,
  USER_ACCOUNT_API_BASE,
} from './userAccountApi.client';
import type {
  SubmitUserIssueFeedbackPayload,
  UserAccountResult,
  UserFeedbackUploadOptions,
  UserIssueFeedbackListData,
} from './userAccountApi.types';

/**
 * 提交问题反馈。
 * @param token - 用户 token。
 * @param payload - 反馈请求体。
 * @returns 提交结果。
 */
export function submitUserIssueFeedback(
  token: string,
  payload: SubmitUserIssueFeedbackPayload,
): Promise<UserAccountResult<unknown>> {
  return request('/v1/user/feedback/submit', {
    method: 'POST',
    auth: token,
    body: {
      feedbackType: payload.feedbackType,
      title: payload.title,
      content: payload.content,
      contact: payload.contact ?? '',
      feedbackLogUrl: payload.feedbackLogUrl ?? '',
      feedbackScreenshotUrl: payload.feedbackScreenshotUrl ?? '',
      clientVersion: payload.clientVersion ?? '',
      captchaTicket: payload.captchaTicket,
      captchaRandstr: payload.captchaRandstr,
      captchaSign: payload.captchaSign,
    },
  });
}

/**
 * 获取当前登录用户的问题反馈列表。
 * @param token - 用户 token。
 * @param params - 可选查询参数。
 * @returns 反馈列表结果。
 */
export function fetchMyIssueFeedbackList(
  token: string,
  params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<UserAccountResult<UserIssueFeedbackListData>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return request<UserIssueFeedbackListData>(`/v1/user/feedback/mine${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    auth: token,
  });
}

/**
 * 上传反馈日志文件。
 * @param file - 日志文件。
 * @param token - 用户 token。
 * @param options - 上传选项。
 * @returns 上传后的文件 URL。
 */
export async function uploadUserFeedbackLog(
  file: File,
  token: string,
  options: UserFeedbackUploadOptions = {},
): Promise<string> {
  if (!token || token.trim().length === 0) {
    throw new Error('未登录');
  }
  if (!file.name.toLowerCase().endsWith('.log')) {
    throw new Error('仅支持上传 .log 日志文件');
  }
  return uploadUserFeedbackAsset('/v1/upload/feedback-log', file, token, options);
}

/**
 * 上传反馈截图文件。
 * @param file - 截图文件。
 * @param token - 用户 token。
 * @param options - 上传选项。
 * @returns 上传后的文件 URL。
 */
export async function uploadUserFeedbackScreenshot(
  file: File,
  token: string,
  options: UserFeedbackUploadOptions = {},
): Promise<string> {
  if (!token || token.trim().length === 0) {
    throw new Error('未登录');
  }
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('仅支持上传图片截图');
  }
  return uploadUserFeedbackAsset('/v1/upload/feedback-screenshot', file, token, options);
}

async function uploadUserFeedbackAsset(
  path: '/v1/upload/feedback-log' | '/v1/upload/feedback-screenshot',
  file: File,
  token: string,
  options: UserFeedbackUploadOptions = {},
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = await buildUploadHeaders(token);
  const payload = await new Promise<{ status: number; body: { code?: number; message?: string; data?: string } | null }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${USER_ACCOUNT_API_BASE}${path}`, true);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.upload.onprogress = (event) => {
      if (!options.onUploadProgress || !event.lengthComputable) {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      options.onUploadProgress(percent);
    };
    xhr.onerror = () => {
      resolve({ status: xhr.status || 0, body: null });
    };
    xhr.onabort = () => {
      resolve({ status: xhr.status || 0, body: null });
    };
    xhr.onload = () => {
      const parsed = parsePayload<string>(typeof xhr.responseText === 'string' ? xhr.responseText : '');
      resolve({
        status: xhr.status,
        body: {
          code: parsed.code,
          message: parsed.message,
          data: typeof parsed.data === 'string' ? parsed.data : undefined,
        },
      });
    };
    xhr.send(formData);
  });
  if (payload.status < 200 || payload.status >= 300) {
    throw new Error(payload.body?.message || `上传失败：HTTP ${payload.status}`);
  }
  if (payload.body?.code !== 200 || typeof payload.body.data !== 'string' || payload.body.data.length === 0) {
    throw new Error(payload.body?.message || '上传失败');
  }
  if (options.onUploadProgress) {
    options.onUploadProgress(100);
  }
  return payload.body.data;
}
