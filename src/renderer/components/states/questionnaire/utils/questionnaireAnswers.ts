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
 * @file questionnaireAnswers.ts
 * @description 问卷答案完成状态与提交校验工具。
 * @author 鸡哥
 */

import type { QuestionnaireAnswer, QuestionnaireQuestion } from '../../../../api/questionnaire/questionnaireApi';

/**
 * 判断答案是否包含有效作答内容。
 * @param answer - 当前题目答案。
 * @returns 已填写返回 true。
 */
export function isQuestionnaireAnswerComplete(answer: QuestionnaireAnswer | undefined): boolean {
  if (typeof answer === 'number') return Number.isFinite(answer);
  if (typeof answer === 'string') return answer.trim().length > 0;
  return Array.isArray(answer) && answer.length > 0;
}

/**
 * 判断所有必填题是否完成。
 * @param questions - 问卷题目列表。
 * @param answers - 当前答案集合。
 * @returns 所有必填题完成时返回 true。
 */
export function areRequiredQuestionsComplete(
  questions: QuestionnaireQuestion[],
  answers: Record<string, QuestionnaireAnswer>,
): boolean {
  return questions.every((question) => !question.required || isQuestionnaireAnswerComplete(answers[question.id]));
}