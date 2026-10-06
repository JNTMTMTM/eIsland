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
 * @file questionnaireBoundaries.test.ts
 * @description 问卷公开输入的损坏定义、去重、历史答案过滤与持久化异常测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearQuestionnaireLocalState, fetchActiveQuestionnaires, fetchCurrentQuestionnaire, fetchQuestionnaireHistory, isQuestionnaireCompleted, isQuestionnaireReminderDismissed, markQuestionnaireCompleted, dismissQuestionnaireReminder, readQuestionnaireDraft, writeQuestionnaireDraft } from '../questionnaireApi';

const request = vi.hoisted(() => vi.fn());
vi.mock('../../user/userAccountApi.client', () => ({ request }));
const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();
const question = { id: 'q', title: 'Question', type: 'text' };
const survey = { id: 1, title: 'Survey', contentJson: JSON.stringify({ questions: [question] }) };
const history = { ...survey, resultId: 2, surveyId: 1, submittedAt: 'date' };
beforeEach(() => {
  request.mockReset();
  get.mockReset().mockReturnValue(null);
  set.mockReset();
  remove.mockReset();
  vi.stubGlobal('localStorage', { getItem: get, setItem: set, removeItem: remove });
});
afterEach(() => vi.unstubAllGlobals());

describe('questionnaire definition input', () => {
  it.each([
    { item: null }, { item: 3 }, { item: { ...survey, id: '1' } }, { item: { ...survey, title: 3 } }, { item: { ...survey, contentJson: 3 } },
    { item: { ...survey, contentJson: 'invalid json' } }, { item: { ...survey, contentJson: 'null' } }, { item: { ...survey, contentJson: '{}' } },
    { item: { ...survey, contentJson: '{"questions":[]}' } },
  ])('rejects damaged survey $item through the public fetch', async ({ item }) => {
    request.mockResolvedValueOnce({ ok: true, data: item });
    expect(await fetchActiveQuestionnaires()).toEqual([]);
  });
  it.each([{ item: null }, { item: 3 }, { item: { ...question, id: 3 } }, { item: { ...question, id: ' ' } }, { item: { ...question, title: 3 } }, { item: { ...question, title: '' } }, { item: { ...question, type: 'unknown' } }])('filters malformed question $item', async ({ item }) => {
    request.mockResolvedValueOnce({ ok: true, data: { ...survey, contentJson: JSON.stringify({ questions: [item] }) } });
    expect(await fetchActiveQuestionnaires()).toEqual([]);
  });
  it('cleans optional fields, bounds length, filters options and deduplicates survey IDs', async () => {
    const data = { ...survey, description: 3, rewardProDays: false, startsAt: null, endsAt: 3, contentJson: JSON.stringify({ questions: [{ ...question, id: ' q ', title: ' Question ', type: 'multiple_choice', required: false, options: ['a', 3, 'b'], maxLength: 3000 }] }) };
    request.mockResolvedValueOnce({ ok: true, data: [data, data] });
    expect(await fetchActiveQuestionnaires()).toEqual([{ id: 1, title: 'Survey', description: '', rewardProDays: null, startsAt: '', endsAt: '', questions: [{ id: 'q', title: 'Question', type: 'multiple_choice', required: false, options: ['a', 'b'], min: undefined, max: undefined, maxLength: 2000 }] }]);
  });
  it('returns no current survey when both authenticated endpoints fail', async () => {
    request.mockResolvedValue({ ok: false, code: 404 });
    expect(await fetchCurrentQuestionnaire('token')).toBeNull();
    expect(request).toHaveBeenNthCalledWith(1, '/v1/surveys/active', { auth: 'token' });
    expect(request).toHaveBeenNthCalledWith(2, '/v1/surveys/current', { auth: 'token' });
  });
});

describe('questionnaire history cleaning', () => {
  it.each([{ answers: null }, { answers: 3 }, { answers: [] }])('drops invalid answer container $answers', async ({ answers }) => {
    request.mockResolvedValueOnce({ ok: true, data: [{ ...history, answersJson: JSON.stringify({ answers }) }] });
    expect((await fetchQuestionnaireHistory('token')).data?.[0].answers).toEqual({});
  });
  it('preserves supported answer shapes, defaults reward and filters damaged history rows', async () => {
    const answers = { string: 'text', number: 3, list: ['a', 'b'], invalidList: ['a', 3], invalid: true, absent: null };
    request.mockResolvedValueOnce({ ok: true, data: [null, 3, { ...history, resultId: '2' }, { ...history, surveyId: '1' }, { ...history, submittedAt: 3 }, { ...history, title: 3 }, { ...history, answersJson: JSON.stringify({ answers }) }, { ...history }] });
    const result = await fetchQuestionnaireHistory('token');
    expect(result.data).toHaveLength(2);
    expect(result.data?.[0]).toMatchObject({ answers: { string: 'text', number: 3, list: ['a', 'b'] }, rewardProDays: 0, rewardProExpireAt: null });
    expect(result.data?.[1].answers).toEqual({});
  });
  it('returns no normalized history for a failed response or non-array data', async () => {
    request.mockResolvedValueOnce({ ok: false, code: 403, data: [] });
    expect((await fetchQuestionnaireHistory('token')).data).toBeUndefined();
    request.mockResolvedValueOnce({ ok: true, data: {} });
    expect((await fetchQuestionnaireHistory('token')).data).toEqual([]);
  });
});

describe('questionnaire damaged storage', () => {
  it.each([{ raw: null }, { raw: 'invalid json' }, { raw: 'null' }, { raw: '{"surveyId":2,"answers":{}}' }, { raw: '{"surveyId":1}' }, { raw: '{"surveyId":1,"answers":"text"}' }])('rejects invalid draft $raw', ({ raw }) => {
    get.mockReturnValueOnce(raw);
    expect(readQuestionnaireDraft(1)).toBeNull();
  });
  it('contains read/write/remove storage failure for every local operation', () => {
    get.mockImplementation(() => { throw new Error('read unavailable'); });
    set.mockImplementation(() => { throw new Error('write unavailable'); });
    remove.mockImplementation(() => { throw new Error('remove unavailable'); });
    expect(readQuestionnaireDraft(1)).toBeNull();
    expect(isQuestionnaireCompleted(1)).toBe(false);
    expect(isQuestionnaireReminderDismissed(1)).toBe(false);
    expect(() => writeQuestionnaireDraft(1, { q: 'text' })).not.toThrow();
    expect(() => markQuestionnaireCompleted(1)).not.toThrow();
    expect(() => dismissQuestionnaireReminder(1)).not.toThrow();
    expect(() => clearQuestionnaireLocalState(1)).not.toThrow();
    expect(remove).toHaveBeenCalledTimes(3);
  });
});
