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
 * @file useQuestionnaire.test.ts
 * @description 问卷 Hook 的真实请求、作答校验、草稿持久化、会话订阅和提交状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks } from '../../../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../../../test/elementHarness';
import { api, browser, renderWithHooks, resetBrowser, responses, runEffects, settle, storage, unmountHooks } from '../../../register/hooks/test/authHookHarness';
import { readQuestionnaireDraft } from '../../../../../api/questionnaire/questionnaireApi';
import { useQuestionnaire } from '../useQuestionnaire';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { vi.useFakeTimers(); resetBrowser(); storage.set('user-account-token', 'token'); });
afterEach(() => { unmountHooks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
/**
 * 构造真实公开接口接收的原始问卷。
 * @param id - 问卷 ID。
 * @returns 含必填与可选问题的服务器响应。
 */
function survey(id: number) {
  return { id, title: `Survey ${  id}`, contentJson: JSON.stringify({ questions: [
    { id: 'required', title: 'Required', type: 'text', required: true },
    { id: 'optional', title: 'Optional', type: 'rating', required: false },
  ] }) };
}
/**
 * 运行真实请求、加载 effect 和草稿 effect。
 * @param ids - 服务端可用问卷 ID。
 * @returns 加载后真实 Hook 状态。
 */
async function load(ids = [1, 2]): Promise<ReturnType<typeof useQuestionnaire>> {
  responses.push({ code: 200, data: ids.map(survey) });
  renderWithHooks(useQuestionnaire); runEffects(); await settle();
  const result = renderWithHooks(useQuestionnaire); runEffects(); return result;
}
describe('useQuestionnaire 真实 API、草稿与会话', () => {
  it('初始无问卷时所有操作安全返回，加载空列表后显示 empty', async () => {
    const initial = renderWithHooks(useQuestionnaire);
    expect(initial.viewState).toBe('loading'); expect(initial.questionnaire).toBeNull(); expect(initial.answers).toEqual({});
    initial.updateAnswer('required', 'ignored'); initial.saveDraft(); initial.selectQuestionnaire(100); initial.continueAfterSubmission(); await initial.submit();
    expect(api.netFetch).not.toHaveBeenCalled();
    const result = await load([]); expect(result.viewState).toBe('empty'); expect(result.selectedQuestionnaireId).toBeNull();
  });
  it('恢复每份问卷草稿并过滤本地已完成问卷', async () => {
    storage.set('questionnaire-completed:3', 'true');
    storage.set('questionnaire-draft:1', JSON.stringify({ surveyId: 1, answers: { required: 'saved' } }));
    let result = await load([1, 2, 3]);
    expect(result.questionnaires.map((item) => item.id)).toEqual([1, 2]); expect(result.answers).toEqual({ required: 'saved' });
    result.selectQuestionnaire(2); result = renderWithHooks(useQuestionnaire); runEffects(); expect(result.answers).toEqual({});
    result.selectQuestionnaire(1); result = renderWithHooks(useQuestionnaire); expect(result.answers).toEqual({ required: 'saved' });
    result.selectQuestionnaire(999); expect(renderWithHooks(useQuestionnaire).selectedQuestionnaireId).toBe(1);
  });
  it('更新答案清理提示，显式保存和250ms自动保存保留各问卷答案', async () => {
    let result = await load();
    result.saveDraft(); expect(renderWithHooks(useQuestionnaire).message).toBe('draftSaved');
    result.updateAnswer('required', 'first'); result = renderWithHooks(useQuestionnaire); runEffects();
    expect(result.message).toBe(''); vi.advanceTimersByTime(249); expect(readQuestionnaireDraft(1)?.answers).toEqual({});
    vi.advanceTimersByTime(1); expect(readQuestionnaireDraft(1)?.answers).toEqual({ required: 'first' });
    result.updateAnswer('optional', 4); result = renderWithHooks(useQuestionnaire); result.saveDraft();
    expect(readQuestionnaireDraft(1)?.answers).toEqual({ required: 'first', optional: 4 });
    result.selectQuestionnaire(2); result = renderWithHooks(useQuestionnaire); runEffects();
    result.updateAnswer('required', 'second'); result = renderWithHooks(useQuestionnaire); runEffects();
    unmountHooks(); vi.advanceTimersByTime(250); expect(storage.has('questionnaire-draft:2')).toBe(false);
    result.selectQuestionnaire(1); expect(renderWithHooks(useQuestionnaire).answers).toEqual({ required: 'first', optional: 4 });
  });
  it('真实必填校验拒绝空白答案但不要求可选问题', async () => {
    let result = await load([1]);
    result.updateAnswer('required', ' '); result = renderWithHooks(useQuestionnaire); await result.submit();
    expect(renderWithHooks(useQuestionnaire).message).toBe('requiredIncomplete'); expect(api.netFetch).toHaveBeenCalledTimes(1);
    result.updateAnswer('required', 'answered'); result = renderWithHooks(useQuestionnaire);
    responses.push({ code: 200, data: { id: 10, rewardProDays: 2, rewardProExpireAt: null, submittedAt: '2026-10-06' } });
    const pending = result.submit(); await renderWithHooks(useQuestionnaire).submit(); await pending;
    result = renderWithHooks(useQuestionnaire); runEffects();
    expect(result.viewState).toBe('completed'); expect(result.submitting).toBe(false); expect(result.submission?.id).toBe(10);
    expect(storage.get('questionnaire-completed:1')).toBe('true'); expect(storage.has('questionnaire-draft:1')).toBe(false);
    expect(api.netFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(api.netFetch.mock.calls[1][1]?.body ?? '{}')).toEqual({ answersJson: JSON.stringify({ answers: { required: 'answered' } }) });
    expect(vi.getTimerCount()).toBe(0);
    result.continueAfterSubmission(); result = renderWithHooks(useQuestionnaire);
    expect(result.viewState).toBe('empty'); expect(result.submission).toBeNull(); expect(result.selectedQuestionnaireId).toBeNull();
  });
  it('成功后继续下一份问卷，重置提交结果与提示', async () => {
    let result = await load();
    result.updateAnswer('required', 'answered'); result = renderWithHooks(useQuestionnaire);
    responses.push({ code: 200, data: { id: 10, rewardProDays: 0, rewardProExpireAt: null, submittedAt: '2026-10-06' } }); await result.submit();
    result = renderWithHooks(useQuestionnaire); result.continueAfterSubmission(); result = renderWithHooks(useQuestionnaire);
    expect(result.viewState).toBe('ready'); expect(result.questionnaire?.id).toBe(2); expect(result.message).toBe(''); expect(result.submissionError).toBe('');
  });
  it.each([{ ids: [1] }, { ids: [1, 2] }])('409 移除已提交问卷并切换剩余列表：%s', async ({ ids }) => {
    let result = await load(ids); result.updateAnswer('required', 'answer'); result = renderWithHooks(useQuestionnaire);
    responses.push({ code: 409, message: 'already' }); await result.submit(); result = renderWithHooks(useQuestionnaire);
    expect(result.viewState).toBe(ids.length > 1 ? 'ready' : 'empty'); expect(result.selectedQuestionnaireId).toBe(ids[1] ?? null);
    expect(result.message).toBe('alreadySubmitted'); expect(storage.get('questionnaire-completed:1')).toBe('true');
  });
  it.each([{ code: 400, message: 'invalid-answer' }, { code: 200 }])('失败或缺少提交数据保留答案和错误：%s', async (reply) => {
    let result = await load(); result.updateAnswer('required', 'answer'); result = renderWithHooks(useQuestionnaire);
    responses.push(reply); await result.submit(); result = renderWithHooks(useQuestionnaire);
    expect(result.viewState).toBe('ready'); expect(result.submissionError).toContain(` (${  reply.code  })`);
    expect(result.answers.required).toBe('answer'); expect(storage.has('questionnaire-completed:1')).toBe(false);
    result.updateAnswer('required', 'fixed'); expect(renderWithHooks(useQuestionnaire).submissionError).toBe('');
  });
  it('未登录可加载草稿，但不能提交；登录事件重新加载且卸载取消订阅', async () => {
    storage.delete('user-account-token'); let result = await load();
    result.updateAnswer('required', 'answer'); result = renderWithHooks(useQuestionnaire); await result.submit();
    expect(api.netFetch).toHaveBeenCalledTimes(1);
    responses.push({ code: 200, data: [survey(1), survey(2)] });
    storage.set('user-account-token', 'new-token'); browser.dispatchEvent(new Event('user-account-session-changed'));
    result = renderWithHooks(useQuestionnaire); expect(result.token).toBe('new-token'); runEffects(); await settle();
    expect(api.netFetch).toHaveBeenCalledTimes(2);
    unmountHooks(); storage.set('user-account-token', 'ignored'); browser.dispatchEvent(new Event('user-account-session-changed'));
    expect(renderWithHooks(useQuestionnaire).token).toBe('new-token');
  });
  it('手工刷新保留有效选择，选择失效时重新选择首份或空列表', async () => {
    let result = await load(); result.selectQuestionnaire(2); result = renderWithHooks(useQuestionnaire);
    responses.push({ code: 200, data: [survey(1), survey(2)] }); await result.load(); result = renderWithHooks(useQuestionnaire);
    expect(result.selectedQuestionnaireId).toBe(2);
    responses.push({ code: 200, data: [survey(3)] }); await result.load(); result = renderWithHooks(useQuestionnaire);
    expect(result.selectedQuestionnaireId).toBe(3);
    responses.push({ code: 200, data: [] }); await result.load(); expect(renderWithHooks(useQuestionnaire).viewState).toBe('empty');
  });
  it('刷新期间已取得的旧回调面对新答案表安全执行', async () => {
    const previous = await load([1]);
    responses.push({ code: 200, data: [survey(2)] });
    await previous.load();
    // 刷新 Promise 已完成但尚未提交新视图，原视图回调仍可收到已排队事件。
    previous.selectQuestionnaire(1);
    let result = renderWithHooks(useQuestionnaire);
    expect(result.questionnaire).toBeNull(); expect(result.answers).toEqual({});
    previous.updateAnswer('required', 'queued');
    result = renderWithHooks(useQuestionnaire);
    expect(result.answers).toEqual({ required: 'queued' });
    result.selectQuestionnaire(2);
    expect(renderWithHooks(useQuestionnaire).answers).toEqual({});
  });
});
