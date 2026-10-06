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
 * @file useAnnouncementQuestionnaireRuntime.test.ts
 * @description 问卷提醒 Hook 真实刷新、完成和屏蔽过滤以及空提醒关闭边界测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../states/maxExpand/components/calendar/hooks/test/calendarHookHarness';
import { useAnnouncementQuestionnaire } from '../useAnnouncementQuestionnaire';
import type * as QuestionnaireApi from '../../../../../api/questionnaire/questionnaireApi';
const leaves = vi.hoisted(() => ({
  fetch: vi.fn<typeof QuestionnaireApi.fetchActiveQuestionnaires>(),
  completed: vi.fn<typeof QuestionnaireApi.isQuestionnaireCompleted>(),
  dismissed: vi.fn<typeof QuestionnaireApi.isQuestionnaireReminderDismissed>(),
  dismiss: vi.fn<typeof QuestionnaireApi.dismissQuestionnaireReminder>()
}));
vi.mock('../../../../../utils/userAccount', () => ({
  readLocalToken: () => 'token'
}));
vi.mock('../../../../../api/questionnaire/questionnaireApi', () => ({
  fetchActiveQuestionnaires: leaves.fetch,
  isQuestionnaireCompleted: leaves.completed,
  isQuestionnaireReminderDismissed: leaves.dismissed,
  dismissQuestionnaireReminder: leaves.dismiss
}));
beforeEach(() => {
  unmountHook();
  resetHook();
  vi.resetAllMocks();
  leaves.fetch.mockResolvedValue([]);
  leaves.completed.mockReturnValue(false);
  leaves.dismissed.mockReturnValue(false);
});
afterEach(() => {
  unmountHook();
});
describe('useAnnouncementQuestionnaire runtime', () => {
  it('empty reminder dismiss is safe and reload forwards token and filters completed/dismissed ids', async () => {
    renderHook(useAnnouncementQuestionnaire);
    flushHookEffects();
    await settleHook();
    renderHook(useAnnouncementQuestionnaire).dismiss();
    expect(leaves.dismiss).not.toHaveBeenCalled();
    leaves.fetch.mockResolvedValue([1, 2, 3].map((id) => ({
      id,
      title: 'Survey',
      description: '',
      rewardProDays: null,
      startsAt: '',
      endsAt: '',
      questions: []
    })));
    leaves.completed.mockImplementation((id) => id === 1);
    leaves.dismissed.mockImplementation((id) => id === 2);
    await renderHook(useAnnouncementQuestionnaire).reload();
    expect(renderHook(useAnnouncementQuestionnaire)).toMatchObject({
      questionnaire: {
        id: 3
      },
      count: 1
    });
    expect(leaves.fetch).toHaveBeenLastCalledWith('token');
    renderHook(useAnnouncementQuestionnaire).dismiss();
    expect(leaves.dismiss).toHaveBeenCalledWith(3);
    expect(renderHook(useAnnouncementQuestionnaire).questionnaire).toBeNull();
    leaves.fetch.mockResolvedValue([]);
    await renderHook(useAnnouncementQuestionnaire).reload();
    expect(renderHook(useAnnouncementQuestionnaire).count).toBe(0);
  });
});
