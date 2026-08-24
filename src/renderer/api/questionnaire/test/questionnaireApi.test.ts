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
 */

/**
 * @file questionnaireApi.test.ts
 * @description 问卷接口规范化、提交与草稿持久化测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.hoisted(() => vi.fn());
vi.mock('../../user/userAccountApi.client', () => ({ request: requestMock }));

import {
  clearQuestionnaireDraft,
  dismissQuestionnaireReminder,
  fetchActiveQuestionnaires,
  fetchCurrentQuestionnaire,
  isQuestionnaireCompleted,
  isQuestionnaireReminderDismissed,
  markQuestionnaireCompleted,
  readQuestionnaireDraft,
  submitQuestionnaire,
  writeQuestionnaireDraft,
} from '../questionnaireApi';

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
    clear: () => { values.clear(); },
    key: (index) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
};

describe('questionnaireApi', () => {
  beforeEach(() => {
    requestMock.mockReset();
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
  });

  it('normalizes every active questionnaire content JSON', async () => {
    const createSurvey = (id: number, title: string) => ({
      id,
      title,
      description: 'Description',
      rewardProDays: 3,
      startsAt: '2026-08-01T00:00:00',
      endsAt: '2026-08-31T00:00:00',
      contentJson: JSON.stringify({ questions: [{ id: 'q1', title: 'Score', type: 'rating', required: true, min: 0, max: 5 }] }),
    });
    requestMock.mockResolvedValue({
      ok: true,
      code: 200,
      message: 'success',
      data: [createSurvey(7, 'Survey A'), createSurvey(8, 'Survey B')],
    });

    const result = await fetchActiveQuestionnaires();

    expect(requestMock).toHaveBeenCalledWith('/v1/surveys/active');
    expect(result).toHaveLength(2);
    expect(result[0].questions[0]).toMatchObject({ id: 'q1', type: 'rating', min: 0, max: 5 });
    expect(result[1].id).toBe(8);
  });

  it('falls back to the legacy current questionnaire endpoint', async () => {
    requestMock
      .mockResolvedValueOnce({ ok: false, code: 404, message: 'not found' })
      .mockResolvedValueOnce({
        ok: true,
        code: 200,
        message: 'success',
        data: {
          id: 7,
          title: 'Survey',
          description: '',
          rewardProDays: null,
          startsAt: '2026-08-01T00:00:00',
          endsAt: '2026-08-31T00:00:00',
          contentJson: JSON.stringify({ questions: [{ id: 'q1', title: 'Score', type: 'rating' }] }),
        },
      });

    const result = await fetchCurrentQuestionnaire();

    expect(requestMock).toHaveBeenNthCalledWith(1, '/v1/surveys/active');
    expect(requestMock).toHaveBeenNthCalledWith(2, '/v1/surveys/current');
    expect(result?.id).toBe(7);
  });

  it('attaches authentication when loading active questionnaires for a signed-in user', async () => {
    requestMock.mockResolvedValue({ ok: true, code: 200, message: 'success', data: [] });

    await fetchActiveQuestionnaires('token');

    expect(requestMock).toHaveBeenCalledWith('/v1/surveys/active', { auth: 'token' });
  });

  it('submits answers as a JSON string with authentication', async () => {
    requestMock.mockResolvedValue({ ok: true, code: 200, message: 'success', data: {} });

    await submitQuestionnaire(7, { q1: 5, q2: ['A'] }, 'token');

    expect(requestMock).toHaveBeenCalledWith('/v1/surveys/7/results', {
      method: 'POST',
      auth: 'token',
      body: { answersJson: JSON.stringify({ answers: { q1: 5, q2: ['A'] } }) },
    });
  });

  it('persists and clears drafts per survey', () => {
    writeQuestionnaireDraft(7, { q1: 'draft' });
    expect(readQuestionnaireDraft(7)?.answers).toEqual({ q1: 'draft' });
    expect(readQuestionnaireDraft(8)).toBeNull();

    clearQuestionnaireDraft(7);
    expect(readQuestionnaireDraft(7)).toBeNull();
  });

  it('tracks completion and dismissed reminders independently per survey', () => {
    markQuestionnaireCompleted(7);
    dismissQuestionnaireReminder(8);

    expect(isQuestionnaireCompleted(7)).toBe(true);
    expect(isQuestionnaireCompleted(8)).toBe(false);
    expect(isQuestionnaireReminderDismissed(7)).toBe(false);
    expect(isQuestionnaireReminderDismissed(8)).toBe(true);
  });
});