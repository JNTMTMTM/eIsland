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
 * @file questionnaireContent.test.tsx
 * @description QuestionnaireContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, find, invoke, text } from '../../test/tree';

import { QuestionnaireContent } from '../QuestionnaireContent';

import { QuestionnaireQuestion } from '../components/QuestionnaireQuestion';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ store: { setHover: vi.fn(), setMaxExpand: vi.fn(), setMaxExpandTab: vi.fn() }, questionnaire: { questionnaires: [] as Array<{ id: string; title: string; endsAt: string }>, questionnaire: null as null | { title: string; description: string; rewardProDays: null | number; questions: Array<{ id: string; title: string; type: string; required: boolean; options: string[] }> }, selectedQuestionnaireId: 'one', answers: {}, token: 'token', viewState: 'loading', submitting: false, submission: null as null | { rewardProDays: number; rewardProExpireAt: string }, message: '', submissionError: '', load: vi.fn(), selectQuestionnaire: vi.fn(), updateAnswer: vi.fn(), saveDraft: vi.fn(), submit: vi.fn(), continueAfterSubmission: vi.fn() }, navigation: { scrollRef: { current: null }, questionRefs: { current: [] as unknown[] }, activeIndex: 0, scrollToQuestion: vi.fn() } }));
vi.mock('../../../../store/slices', () => ({ default: () => model.store }));
vi.mock('../hooks/useQuestionnaire', () => ({ useQuestionnaire: () => model.questionnaire }));
vi.mock('../hooks/useQuestionnaireNavigation', () => ({ useQuestionnaireNavigation: () => model.navigation }));
vi.mock('../../../../api/announcement/announcementApi', () => ({ fetchAnnouncementSocialConfig: vi.fn() }));
function render() { slots.cursor = 0; return ((QuestionnaireContent() as TreeElement)); }
function ready() { model.questionnaire.viewState = 'ready'; model.questionnaire.questionnaire = { title: 'Survey', description: '', rewardProDays: 1, questions: [{ id: 'question', title: 'Required', type: 'text', required: true, options: [] }] }; model.questionnaire.questionnaires = [{ id: 'one', title: 'Survey', endsAt: '2026-12-01T00:00:00' }]; }
beforeEach(() => { model.questionnaire.viewState = 'loading'; model.questionnaire.questionnaire = null; model.questionnaire.answers = {}; model.questionnaire.token = 'token'; model.questionnaire.submitting = false; model.questionnaire.submission = null; model.questionnaire.message = ''; model.questionnaire.submissionError = ''; });
describe('QuestionnaireContent', () => {
  it('renders loading and empty retry/close branches', () => { expect(text(render())).toContain('questionnaire.loading'); model.questionnaire.viewState = 'empty'; const root = render(); invoke(find(root, (node) => node.type === 'button' && text(node) === 'questionnaire.retry'), 'onClick'); invoke(find(root, (node) => node.type === 'button' && text(node) === 'questionnaire.close'), 'onClick'); expect(model.questionnaire.load).toHaveBeenCalledOnce(); expect(model.store.setHover).toHaveBeenCalledOnce(); });
  it('requires login and all required answers before enabling submit', () => { ready(); expect(byClass(render(), 'settings-user-primary-btn').props.disabled).toBe(true); model.questionnaire.answers = { question: 'Answer' }; expect(byClass(render(), 'settings-user-primary-btn').props.disabled).toBe(false); model.questionnaire.token = ''; expect(byClass(render(), 'settings-user-primary-btn').props.disabled).toBe(true); expect(text(render())).toContain('questionnaire.loginRequired'); });
  it('forwards answer edits, navigation, draft save and submit', () => { ready(); model.questionnaire.answers = { question: 'Answer' }; const root = render(); invoke(find(root, (node) => node.type === QuestionnaireQuestion), 'onChange', 'Updated'); expect(model.questionnaire.updateAnswer).toHaveBeenCalledWith('question', 'Updated'); invoke(find(root, (node) => node.props['aria-label'] === 'questionnaire.jumpToQuestion'), 'onClick'); expect(model.navigation.scrollToQuestion).toHaveBeenCalledWith(0); invoke(find(root, (node) => node.type === 'button' && text(node) === 'questionnaire.saveDraft'), 'onClick'); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.questionnaire.saveDraft).toHaveBeenCalledOnce(); expect(model.questionnaire.submit).toHaveBeenCalledOnce(); });
  it('collapses questionnaire list and renders draft/error feedback', () => { ready(); invoke(byClass(render(), 'announcement-list-toggle-btn'), 'onClick'); expect(byClass(render(), 'questionnaire-list').props.className).toContain('collapsed'); model.questionnaire.message = 'draftSaved'; expect(text(render())).toContain('questionnaire.draftSaved'); model.questionnaire.submissionError = 'Submission failed'; expect(text(render())).toContain('Submission failed'); expect(text(render())).not.toContain('questionnaire.draftSaved'); });
  it('renders completed reward/no-reward and changes continue action with remaining surveys', () => { ready(); model.questionnaire.viewState = 'completed'; model.questionnaire.submission = { rewardProDays: 3, rewardProExpireAt: '2026-11-01T00:00:00' }; let root = render(); expect(text(root)).toContain('questionnaire.rewardDays'); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.store.setHover).toHaveBeenCalledOnce(); model.questionnaire.questionnaires.push({ id: 'two', title: 'Next', endsAt: '2026-12-01' }); model.questionnaire.submission.rewardProDays = 0; root = render(); expect(text(root)).toContain('questionnaire.noReward'); invoke(byClass(root, 'settings-user-primary-btn'), 'onClick'); expect(model.questionnaire.continueAfterSubmission).toHaveBeenCalledOnce(); });
});
