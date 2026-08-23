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
 * @file questionnaireApi.types.ts
 * @description 问卷下发、作答与提交接口类型。
 * @author 鸡哥
 */

export type QuestionnaireQuestionType = 'rating' | 'single_choice' | 'multiple_choice' | 'text';
export type QuestionnaireAnswer = number | string | string[];

export interface QuestionnaireQuestion {
  id: string;
  title: string;
  type: QuestionnaireQuestionType;
  required: boolean;
  options: string[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface QuestionnaireData {
  id: number;
  title: string;
  description: string;
  rewardProDays: number | null;
  startsAt: string;
  endsAt: string;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireSubmissionData {
  id: number;
  rewardProDays: number;
  rewardProExpireAt: string | null;
  submittedAt: string;
}

export interface QuestionnaireDraft {
  surveyId: number;
  answers: Record<string, QuestionnaireAnswer>;
  savedAt: string;
}