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
 * @file QuestionnaireQuestion.tsx
 * @description 问卷评分、单选、多选与纯文本题目控件。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuestionnaireAnswer, QuestionnaireQuestion as QuestionnaireQuestionData } from '../../../../api/questionnaire/questionnaireApi';

interface QuestionnaireQuestionProps {
  question: QuestionnaireQuestionData;
  index: number;
  answer?: QuestionnaireAnswer;
  onChange: (answer: QuestionnaireAnswer) => void;
}

/**
 * 渲染单道问卷题目。
 * @param props - 题目、答案和变更回调。
 * @returns 与题型匹配的作答控件。
 */
export function QuestionnaireQuestion({ question, index, answer, onChange }: QuestionnaireQuestionProps): ReactElement {
  const { t } = useTranslation();
  const toggleMultipleChoice = (option: string): void => {
    const selected = Array.isArray(answer) ? answer : [];
    onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  };

  return (
    <article className="questionnaire-question">
      <div className="questionnaire-question-heading">
        <span>{String(index + 1).padStart(2, '0')}</span>
        <h2>{question.title}</h2>
        {question.required && <b>{t('questionnaire.required')}</b>}
      </div>
      {question.type === 'rating' && (
        <div className="questionnaire-rating" role="radiogroup" aria-label={question.title}>
          {[0, 1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={answer === value ? 'active' : ''}
              role="radio"
              aria-checked={answer === value}
              onClick={() => onChange(value)}
            >{value}</button>
          ))}
        </div>
      )}
      {question.type === 'single_choice' && (
        <div className="questionnaire-options">
          {question.options.map((option) => (
            <label key={option} className={answer === option ? 'selected' : ''}>
              <input type="radio" name={question.id} checked={answer === option} onChange={() => onChange(option)} />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === 'multiple_choice' && (
        <div className="questionnaire-options">
          {question.options.map((option) => {
            const checked = Array.isArray(answer) && answer.includes(option);
            return (
              <label key={option} className={checked ? 'selected' : ''}>
                <input type="checkbox" checked={checked} onChange={() => toggleMultipleChoice(option)} />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
      {question.type === 'text' && (
        <div className="questionnaire-text-answer">
          <textarea
            value={typeof answer === 'string' ? answer : ''}
            maxLength={question.maxLength ?? 2000}
            placeholder={t('questionnaire.textPlaceholder')}
            onChange={(event) => onChange(event.target.value)}
          />
          <span>{typeof answer === 'string' ? answer.length : 0} / {question.maxLength ?? 2000}</span>
        </div>
      )}
    </article>
  );
}