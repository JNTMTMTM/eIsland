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
 * @file userAccountApi.feedback.test.ts
 * @description 用户问题反馈相关接口单元测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRequest = vi.hoisted(() => vi.fn());
const mockBuildUploadHeaders = vi.hoisted(() => vi.fn());
const mockParsePayload = vi.hoisted(() => vi.fn());

vi.mock('../userAccountApi.client', () => ({
  request: mockRequest,
  buildUploadHeaders: mockBuildUploadHeaders,
  parsePayload: mockParsePayload,
  USER_ACCOUNT_API_BASE: 'https://test.server.pyisland.com/api',
}));

const MockXHR: {
  open: ReturnType<typeof vi.fn>;
  setRequestHeader: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  upload: { onprogress: ((e: ProgressEvent) => void) | null };
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  onload: (() => void) | null;
  status: number;
  responseText: string;
} = vi.hoisted(() => ({
  open: vi.fn(),
  setRequestHeader: vi.fn(),
  send: vi.fn(),
  upload: { onprogress: null },
  onerror: null,
  onabort: null,
  onload: null,
  status: 200,
  responseText: '',
}));

vi.stubGlobal('XMLHttpRequest', vi.fn(function () { return MockXHR; }));

import {
  submitUserIssueFeedback,
  fetchMyIssueFeedbackList,
  uploadUserFeedbackLog,
  uploadUserFeedbackScreenshot,
} from '../userAccountApi.feedback';

describe('userAccountApi.feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockXHR.open.mockReset();
    MockXHR.setRequestHeader.mockReset();
    MockXHR.send.mockReset();
    MockXHR.send.mockImplementation(() => {
      queueMicrotask(() => MockXHR.onload?.());
    });
    MockXHR.upload.onprogress = null;
    MockXHR.onerror = null;
    MockXHR.onabort = null;
    MockXHR.onload = null;
    MockXHR.status = 200;
    MockXHR.responseText = '';
  });

  // ---------------------------------------------------------------
  // submitUserIssueFeedback
  // ---------------------------------------------------------------
  describe('submitUserIssueFeedback', () => {
    it('sends POST to /v1/user/feedback/submit with all required fields', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true, code: 200, message: 'success' });

      await submitUserIssueFeedback('tok', {
        feedbackType: 'bug',
        title: 'Title',
        content: 'Content',
        captchaTicket: 't',
        captchaRandstr: 'r',
        captchaSign: 's',
      });

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/feedback/submit', {
        method: 'POST',
        auth: 'tok',
        body: {
          feedbackType: 'bug',
          title: 'Title',
          content: 'Content',
          contact: '',
          feedbackLogUrl: '',
          feedbackScreenshotUrl: '',
          clientVersion: '',
          captchaTicket: 't',
          captchaRandstr: 'r',
          captchaSign: 's',
        },
      });
    });

    it('uses provided optional fields instead of defaults', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true, code: 200, message: 'success' });

      await submitUserIssueFeedback('tok', {
        feedbackType: 'feature',
        title: 'T',
        content: 'C',
        contact: 'user@test.com',
        feedbackLogUrl: 'https://log.url',
        feedbackScreenshotUrl: 'https://img.url',
        clientVersion: '1.2.3',
        captchaTicket: 't',
        captchaRandstr: 'r',
        captchaSign: 's',
      });

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/feedback/submit', {
        method: 'POST',
        auth: 'tok',
        body: {
          feedbackType: 'feature',
          title: 'T',
          content: 'C',
          contact: 'user@test.com',
          feedbackLogUrl: 'https://log.url',
          feedbackScreenshotUrl: 'https://img.url',
          clientVersion: '1.2.3',
          captchaTicket: 't',
          captchaRandstr: 'r',
          captchaSign: 's',
        },
      });
    });
  });

  // ---------------------------------------------------------------
  // fetchMyIssueFeedbackList
  // ---------------------------------------------------------------
  describe('fetchMyIssueFeedbackList', () => {
    it('sends GET to /v1/user/feedback/mine without query string when no params', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true, code: 200, message: 'success', data: { items: [], total: 0, page: 1, pageSize: 10 } });

      await fetchMyIssueFeedbackList('tok');

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/feedback/mine', {
        method: 'GET',
        auth: 'tok',
      });
    });

    it('appends query string for provided params', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true, code: 200, message: 'success', data: { items: [], total: 0, page: 2, pageSize: 20 } });

      await fetchMyIssueFeedbackList('tok', { status: 'open', page: 2, pageSize: 20 });

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/feedback/mine?status=open&page=2&pageSize=20', {
        method: 'GET',
        auth: 'tok',
      });
    });

    it('omits falsy params from query string', async () => {
      mockRequest.mockResolvedValueOnce({ ok: true, code: 200, message: 'success', data: { items: [], total: 0, page: 1, pageSize: 10 } });

      await fetchMyIssueFeedbackList('tok', { status: '', page: 0, pageSize: undefined });

      expect(mockRequest).toHaveBeenCalledWith('/v1/user/feedback/mine', {
        method: 'GET',
        auth: 'tok',
      });
    });
  });

  // ---------------------------------------------------------------
  // uploadUserFeedbackLog
  // ---------------------------------------------------------------
  describe('uploadUserFeedbackLog', () => {
    function makeLog(name = 'debug.log'): File {
      return new File(['log-content'], name, { type: 'text/plain' });
    }

    it('throws when token is empty', async () => {
      await expect(uploadUserFeedbackLog(makeLog(), '')).rejects.toThrow('未登录');
    });

    it('throws when token is whitespace', async () => {
      await expect(uploadUserFeedbackLog(makeLog(), '   ')).rejects.toThrow('未登录');
    });

    it('throws when file does not end with .log', async () => {
      const file = new File(['data'], 'notes.txt', { type: 'text/plain' });
      await expect(uploadUserFeedbackLog(file, 'tok')).rejects.toThrow('仅支持上传 .log 日志文件');
    });

    it('accepts .log file regardless of MIME type', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/log.log' });

      const url = await uploadUserFeedbackLog(makeLog(), 'tok');

      expect(url).toBe('https://cdn.test/log.log');
    });

    it('sends XHR POST to /v1/upload/feedback-log with correct base URL', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/log.log' });

      await uploadUserFeedbackLog(makeLog(), 'tok');

      expect(MockXHR.open).toHaveBeenCalledWith('POST', 'https://test.server.pyisland.com/api/v1/upload/feedback-log', true);
    });

    it('sets headers returned by buildUploadHeaders', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok', 'X-App-Name': 'eisland' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/log.log' });

      await uploadUserFeedbackLog(makeLog(), 'tok');

      expect(MockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok');
      expect(MockXHR.setRequestHeader).toHaveBeenCalledWith('X-App-Name', 'eisland');
    });

    it('throws when XHR returns non-2xx status', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      MockXHR.status = 500;
      MockXHR.responseText = '{}';
      mockParsePayload.mockReturnValueOnce({ code: 500, message: '服务器内部错误' });

      await expect(uploadUserFeedbackLog(makeLog(), 'tok')).rejects.toThrow('服务器内部错误');
    });

    it('throws generic HTTP error when non-2xx and no message', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      MockXHR.status = 413;
      MockXHR.responseText = '{}';
      mockParsePayload.mockReturnValueOnce({ code: 413, message: '' });

      await expect(uploadUserFeedbackLog(makeLog(), 'tok')).rejects.toThrow('上传失败：HTTP 413');
    });

    it('throws when response body code is not 200', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 400, message: '文件太大' });

      await expect(uploadUserFeedbackLog(makeLog(), 'tok')).rejects.toThrow('文件太大');
    });

    it('throws generic message when code is not 200 and no message', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 500, message: '' });

      await expect(uploadUserFeedbackLog(makeLog(), 'tok')).rejects.toThrow('上传失败');
    });
  });

  // ---------------------------------------------------------------
  // uploadUserFeedbackScreenshot
  // ---------------------------------------------------------------
  describe('uploadUserFeedbackScreenshot', () => {
    function makeImage(name = 'shot.png'): File {
      return new File(['img-data'], name, { type: 'image/png' });
    }

    it('throws when token is empty', async () => {
      await expect(uploadUserFeedbackScreenshot(makeImage(), '')).rejects.toThrow('未登录');
    });

    it('throws when token is whitespace', async () => {
      await expect(uploadUserFeedbackScreenshot(makeImage(), '   ')).rejects.toThrow('未登录');
    });

    it('throws when file type is not image/', async () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      await expect(uploadUserFeedbackScreenshot(file, 'tok')).rejects.toThrow('仅支持上传图片截图');
    });

    it('throws when file type is empty', async () => {
      const file = new File(['data'], 'screenshot', { type: '' });
      await expect(uploadUserFeedbackScreenshot(file, 'tok')).rejects.toThrow('仅支持上传图片截图');
    });

    it('accepts image/png file and returns uploaded URL', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/img.png' });

      const url = await uploadUserFeedbackScreenshot(makeImage(), 'tok');

      expect(url).toBe('https://cdn.test/img.png');
    });

    it('accepts image/jpeg file', async () => {
      const jpeg = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/photo.jpg' });

      const url = await uploadUserFeedbackScreenshot(jpeg, 'tok');

      expect(url).toBe('https://cdn.test/photo.jpg');
    });

    it('sends XHR POST to /v1/upload/feedback-screenshot with correct base URL', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/img.png' });

      await uploadUserFeedbackScreenshot(makeImage(), 'tok');

      expect(MockXHR.open).toHaveBeenCalledWith('POST', 'https://test.server.pyisland.com/api/v1/upload/feedback-screenshot', true);
    });

    it('sets headers returned by buildUploadHeaders', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok', 'X-App-Name': 'eisland' });
      mockParsePayload.mockReturnValueOnce({ code: 200, message: 'success', data: 'https://cdn.test/img.png' });

      await uploadUserFeedbackScreenshot(makeImage(), 'tok');

      expect(MockXHR.setRequestHeader).toHaveBeenCalledWith('Authorization', 'Bearer tok');
      expect(MockXHR.setRequestHeader).toHaveBeenCalledWith('X-App-Name', 'eisland');
    });

    it('throws when XHR returns non-2xx status', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      MockXHR.status = 500;
      MockXHR.responseText = '{}';
      mockParsePayload.mockReturnValueOnce({ code: 500, message: '服务器错误' });

      await expect(uploadUserFeedbackScreenshot(makeImage(), 'tok')).rejects.toThrow('服务器错误');
    });

    it('throws when response body code is not 200', async () => {
      mockBuildUploadHeaders.mockResolvedValueOnce({ Authorization: 'Bearer tok' });
      mockParsePayload.mockReturnValueOnce({ code: 400, message: '不支持的格式' });

      await expect(uploadUserFeedbackScreenshot(makeImage(), 'tok')).rejects.toThrow('不支持的格式');
    });
  });
});
