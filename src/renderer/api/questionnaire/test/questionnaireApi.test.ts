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
  fetchCurrentQuestionnaire,
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

  it('normalizes current questionnaire content JSON', async () => {
    requestMock.mockResolvedValue({
      ok: true,
      code: 200,
      message: 'success',
      data: {
        id: 7,
        title: 'Survey',
        description: 'Description',
        rewardProDays: 3,
        startsAt: '2026-08-01T00:00:00',
        endsAt: '2026-08-31T00:00:00',
        contentJson: JSON.stringify({ questions: [{ id: 'q1', title: 'Score', type: 'rating', required: true, min: 0, max: 5 }] }),
      },
    });

    const result = await fetchCurrentQuestionnaire();

    expect(requestMock).toHaveBeenCalledWith('/v1/surveys/current');
    expect(result?.questions[0]).toMatchObject({ id: 'q1', type: 'rating', min: 0, max: 5 });
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
});