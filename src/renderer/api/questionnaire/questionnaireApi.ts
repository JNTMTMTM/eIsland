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
 * @file questionnaireApi.ts
 * @description 问卷公开获取、鉴权提交与本地草稿持久化。
 * @author 鸡哥
 */

import { request } from '../user/userAccountApi.client';
import type { UserAccountResult } from '../user/userAccountApi.types';
import type {
  QuestionnaireAnswer,
  QuestionnaireData,
  QuestionnaireDraft,
  QuestionnaireHistoryItem,
  QuestionnaireQuestion,
  QuestionnaireSubmissionData,
} from './questionnaireApi.types';

export type {
  QuestionnaireAnswer,
  QuestionnaireData,
  QuestionnaireDraft,
  QuestionnaireHistoryItem,
  QuestionnaireQuestion,
  QuestionnaireSubmissionData,
} from './questionnaireApi.types';

const QUESTIONNAIRE_DRAFT_KEY_PREFIX = 'questionnaire-draft:';
const QUESTIONNAIRE_COMPLETED_KEY_PREFIX = 'questionnaire-completed:';
const QUESTIONNAIRE_DISMISSED_KEY_PREFIX = 'questionnaire-dismissed:';

function hasQuestionnaireMarker(prefix: string, surveyId: number): boolean {
  try {
    return localStorage.getItem(`${prefix}${surveyId}`) === 'true';
  } catch {
    return false;
  }
}

function writeQuestionnaireMarker(prefix: string, surveyId: number): void {
  try {
    localStorage.setItem(`${prefix}${surveyId}`, 'true');
  } catch {
    // 标记不可持久化时不阻断问卷主流程。
  }
}

function removeQuestionnaireStorage(prefix: string, surveyId: number): void {
  try {
    localStorage.removeItem(`${prefix}${surveyId}`);
  } catch {
    // 本地存储不可用时，服务端删除结果仍然有效。
  }
}

function normalizeQuestion(value: unknown): QuestionnaireQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const id = typeof source.id === 'string' ? source.id.trim() : '';
  const title = typeof source.title === 'string' ? source.title.trim() : '';
  const type = source.type;
  if (!id || !title || !['rating', 'single_choice', 'multiple_choice', 'text'].includes(String(type))) return null;
  return {
    id,
    title,
    type: type as QuestionnaireQuestion['type'],
    required: source.required !== false,
    options: Array.isArray(source.options) ? source.options.filter((option): option is string => typeof option === 'string') : [],
    min: typeof source.min === 'number' ? source.min : undefined,
    max: typeof source.max === 'number' ? source.max : undefined,
    maxLength: typeof source.maxLength === 'number' ? Math.min(source.maxLength, 2000) : undefined,
  };
}

function normalizeQuestionnaire(value: unknown): QuestionnaireData | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'number' || typeof source.title !== 'string' || typeof source.contentJson !== 'string') return null;
  try {
    const content = JSON.parse(source.contentJson) as { questions?: unknown };
    const questions = Array.isArray(content.questions)
      ? content.questions.map(normalizeQuestion).filter((question): question is QuestionnaireQuestion => question !== null)
      : [];
    if (questions.length === 0) return null;
    return {
      id: source.id,
      title: source.title,
      description: typeof source.description === 'string' ? source.description : '',
      rewardProDays: typeof source.rewardProDays === 'number' ? source.rewardProDays : null,
      startsAt: typeof source.startsAt === 'string' ? source.startsAt : '',
      endsAt: typeof source.endsAt === 'string' ? source.endsAt : '',
      questions,
    };
  } catch {
    return null;
  }
}

function normalizeQuestionnaires(value: unknown): QuestionnaireData[] {
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set<number>();
  return values.reduce<QuestionnaireData[]>((questionnaires, item) => {
    const questionnaire = normalizeQuestionnaire(item);
    if (!questionnaire || seen.has(questionnaire.id)) return questionnaires;
    seen.add(questionnaire.id);
    questionnaires.push(questionnaire);
    return questionnaires;
  }, []);
}

function normalizeAnswers(value: unknown): Record<string, QuestionnaireAnswer> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value).reduce<Record<string, QuestionnaireAnswer>>((answers, [questionId, answer]) => {
    if (typeof answer === 'number' || typeof answer === 'string') {
      answers[questionId] = answer;
    } else if (Array.isArray(answer) && answer.every((item) => typeof item === 'string')) {
      answers[questionId] = answer;
    }
    return answers;
  }, {});
}

function normalizeQuestionnaireHistory(value: unknown): QuestionnaireHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<QuestionnaireHistoryItem[]>((history, item) => {
    if (!item || typeof item !== 'object') return history;
    const source = item as Record<string, unknown>;
    if (typeof source.resultId !== 'number' || typeof source.surveyId !== 'number' || typeof source.submittedAt !== 'string') return history;
    const questionnaire = normalizeQuestionnaire({
      ...source,
      id: source.surveyId,
      rewardProDays: source.rewardProDays,
      startsAt: '',
      endsAt: '',
    });
    if (!questionnaire) return history;
    let answers: Record<string, QuestionnaireAnswer> = {};
    if (typeof source.answersJson === 'string') {
      try {
        const parsed = JSON.parse(source.answersJson) as { answers?: unknown };
        answers = normalizeAnswers(parsed.answers);
      } catch {
        answers = {};
      }
    }
    history.push({
      resultId: source.resultId,
      questionnaire,
      answers,
      submittedAt: source.submittedAt,
      rewardProDays: typeof source.rewardProDays === 'number' ? source.rewardProDays : 0,
      rewardProExpireAt: typeof source.rewardProExpireAt === 'string' ? source.rewardProExpireAt : null,
    });
    return history;
  }, []);
}

/**
 * 获取全部当前有效问卷。
 * @description 优先使用多问卷接口，并在服务端尚未升级时回退到单问卷接口。
 * @param token - 可选的当前用户 JWT。
 * @returns 已通过格式校验且按服务端顺序排列的问卷列表。
 */
export async function fetchActiveQuestionnaires(token?: string | null): Promise<QuestionnaireData[]> {
  const authOptions = token ? { auth: token } : undefined;
  const result = authOptions
    ? await request<unknown>('/v1/surveys/active', authOptions)
    : await request<unknown>('/v1/surveys/active');
  if (result.ok) return normalizeQuestionnaires(result.data);

  const fallback = authOptions
    ? await request<unknown>('/v1/surveys/current', authOptions)
    : await request<unknown>('/v1/surveys/current');
  return fallback.ok ? normalizeQuestionnaires(fallback.data) : [];
}

/**
 * 获取当前有效问卷。
 * @param token - 可选的当前用户 JWT。
 * @returns 第一份当前有效问卷；无问卷或响应无效时返回 null。
 */
export async function fetchCurrentQuestionnaire(token?: string | null): Promise<QuestionnaireData | null> {
  return (await fetchActiveQuestionnaires(token))[0] ?? null;
}

/**
 * 获取当前用户的全部问卷提交记录。
 * @param token - 当前用户 JWT。
 * @returns 统一响应，其中记录已完成问卷定义与答案格式校验。
 */
export async function fetchQuestionnaireHistory(token: string): Promise<UserAccountResult<QuestionnaireHistoryItem[]>> {
  const result = await request<unknown>('/v1/surveys/my/results', { auth: token });
  return {
    ...result,
    data: result.ok ? normalizeQuestionnaireHistory(result.data) : undefined,
  };
}

/**
 * 删除当前用户指定的问卷提交记录及对应本地状态。
 * @param token - 当前用户 JWT。
 * @param resultId - 问卷提交记录 ID。
 * @param surveyId - 问卷 ID。
 * @returns 后端删除结果。
 */
export async function deleteQuestionnaireHistory(
  token: string,
  resultId: number,
  surveyId: number,
): Promise<UserAccountResult<void>> {
  const result = await request<void>(`/v1/surveys/my/results/${encodeURIComponent(String(resultId))}`, {
    method: 'DELETE',
    auth: token,
  });
  if (result.ok) clearQuestionnaireLocalState(surveyId);
  return result;
}

/**
 * 提交当前用户的问卷答案。
 * @param surveyId - 问卷 ID。
 * @param answers - 按题目 ID 索引的答案。
 * @param token - 当前用户 JWT。
 * @returns 后端提交结果。
 */
export async function submitQuestionnaire(
  surveyId: number,
  answers: Record<string, QuestionnaireAnswer>,
  token: string,
) {
  return request<QuestionnaireSubmissionData>(`/v1/surveys/${surveyId}/results`, {
    method: 'POST',
    auth: token,
    body: { answersJson: JSON.stringify({ answers }) },
  });
}

/**
 * 读取指定问卷的本地草稿。
 * @param surveyId - 问卷 ID。
 * @returns 可恢复的草稿；不存在或格式无效时返回 null。
 */
export function readQuestionnaireDraft(surveyId: number): QuestionnaireDraft | null {
  try {
    const raw = localStorage.getItem(`${QUESTIONNAIRE_DRAFT_KEY_PREFIX}${surveyId}`);
    if (!raw) return null;
    const draft = JSON.parse(raw) as QuestionnaireDraft;
    return draft.surveyId === surveyId && draft.answers && typeof draft.answers === 'object' ? draft : null;
  } catch {
    return null;
  }
}

/**
 * 保存指定问卷的本地草稿。
 * @param surveyId - 问卷 ID。
 * @param answers - 当前答案集合。
 */
export function writeQuestionnaireDraft(surveyId: number, answers: Record<string, QuestionnaireAnswer>): void {
  const draft: QuestionnaireDraft = { surveyId, answers, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(`${QUESTIONNAIRE_DRAFT_KEY_PREFIX}${surveyId}`, JSON.stringify(draft));
  } catch {
    // 存储空间不可用时仍允许继续填写和提交。
  }
}

/**
 * 清除指定问卷的本地草稿。
 * @param surveyId - 问卷 ID。
 */
export function clearQuestionnaireDraft(surveyId: number): void {
  removeQuestionnaireStorage(QUESTIONNAIRE_DRAFT_KEY_PREFIX, surveyId);
}

/**
 * 清除指定问卷的草稿、完成标记和关闭提醒标记。
 * @param surveyId - 问卷 ID。
 */
export function clearQuestionnaireLocalState(surveyId: number): void {
  removeQuestionnaireStorage(QUESTIONNAIRE_DRAFT_KEY_PREFIX, surveyId);
  removeQuestionnaireStorage(QUESTIONNAIRE_COMPLETED_KEY_PREFIX, surveyId);
  removeQuestionnaireStorage(QUESTIONNAIRE_DISMISSED_KEY_PREFIX, surveyId);
}

/**
 * 判断指定问卷是否已在本机提交完成。
 * @param surveyId - 问卷 ID。
 * @returns 存在完成标记时返回 true。
 */
export function isQuestionnaireCompleted(surveyId: number): boolean {
  return hasQuestionnaireMarker(QUESTIONNAIRE_COMPLETED_KEY_PREFIX, surveyId);
}

/**
 * 标记指定问卷已在本机提交完成。
 * @param surveyId - 问卷 ID。
 */
export function markQuestionnaireCompleted(surveyId: number): void {
  writeQuestionnaireMarker(QUESTIONNAIRE_COMPLETED_KEY_PREFIX, surveyId);
}

/**
 * 判断指定问卷是否已在本机关闭公告提醒。
 * @param surveyId - 问卷 ID。
 * @returns 存在关闭提醒标记时返回 true。
 */
export function isQuestionnaireReminderDismissed(surveyId: number): boolean {
  return hasQuestionnaireMarker(QUESTIONNAIRE_DISMISSED_KEY_PREFIX, surveyId);
}

/**
 * 永久关闭指定问卷在本机的公告提醒。
 * @param surveyId - 问卷 ID。
 */
export function dismissQuestionnaireReminder(surveyId: number): void {
  writeQuestionnaireMarker(QUESTIONNAIRE_DISMISSED_KEY_PREFIX, surveyId);
}