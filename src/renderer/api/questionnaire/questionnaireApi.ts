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
import type {
  QuestionnaireAnswer,
  QuestionnaireData,
  QuestionnaireDraft,
  QuestionnaireQuestion,
  QuestionnaireSubmissionData,
} from './questionnaireApi.types';

export type {
  QuestionnaireAnswer,
  QuestionnaireData,
  QuestionnaireDraft,
  QuestionnaireQuestion,
  QuestionnaireSubmissionData,
} from './questionnaireApi.types';

const QUESTIONNAIRE_DRAFT_KEY_PREFIX = 'questionnaire-draft:';

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

/**
 * 获取当前有效问卷。
 * @returns 当前有效问卷；无问卷或响应无效时返回 null。
 */
export async function fetchCurrentQuestionnaire(): Promise<QuestionnaireData | null> {
  const result = await request<unknown>('/v1/surveys/current');
  return result.ok ? normalizeQuestionnaire(result.data) : null;
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
  try {
    localStorage.removeItem(`${QUESTIONNAIRE_DRAFT_KEY_PREFIX}${surveyId}`);
  } catch {
    // ignore storage errors
  }
}