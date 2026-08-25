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
 * @file questionnaireAnswers.test.ts
 * @description 问卷答案完成状态和必填校验测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { areRequiredQuestionsComplete, isQuestionnaireAnswerComplete } from '../questionnaireAnswers';
import type { QuestionnaireQuestion } from '../../../../../api/questionnaire/questionnaireApi';

const questions: QuestionnaireQuestion[] = [
  { id: 'rating', title: 'Rating', type: 'rating', required: true, options: [], min: 0, max: 5 },
  { id: 'text', title: 'Text', type: 'text', required: true, options: [], maxLength: 2000 },
  { id: 'optional', title: 'Optional', type: 'single_choice', required: false, options: ['A'] },
];

describe('questionnaireAnswers', () => {
  it('treats zero rating, non-empty text, and selected options as complete', () => {
    expect(isQuestionnaireAnswerComplete(0)).toBe(true);
    expect(isQuestionnaireAnswerComplete(' answer ')).toBe(true);
    expect(isQuestionnaireAnswerComplete(['A'])).toBe(true);
  });

  it('treats blank and empty answers as incomplete', () => {
    expect(isQuestionnaireAnswerComplete(undefined)).toBe(false);
    expect(isQuestionnaireAnswerComplete('   ')).toBe(false);
    expect(isQuestionnaireAnswerComplete([])).toBe(false);
  });

  it('requires only questions marked as required', () => {
    expect(areRequiredQuestionsComplete(questions, { rating: 0, text: 'done' })).toBe(true);
    expect(areRequiredQuestionsComplete(questions, { rating: 0 })).toBe(false);
  });
});