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
 * @file useQuestionnaire.ts
 * @description 问卷加载、草稿恢复、登录态同步与提交状态 Hook。
 * @author 鸡哥
 */

import { useCallback, useEffect, useState } from 'react';
import {
  clearQuestionnaireDraft,
  fetchCurrentQuestionnaire,
  markQuestionnaireCompleted,
  readQuestionnaireDraft,
  submitQuestionnaire,
  writeQuestionnaireDraft,
  type QuestionnaireAnswer,
  type QuestionnaireData,
  type QuestionnaireSubmissionData,
} from '../../../../api/questionnaire/questionnaireApi';
import { readLocalToken, subscribeUserAccountSessionChanged } from '../../../../utils/userAccount';
import { areRequiredQuestionsComplete } from '../utils/questionnaireAnswers';

export type QuestionnaireViewState = 'loading' | 'ready' | 'empty' | 'completed';

/**
 * 管理问卷完整作答链路。
 * @returns 问卷数据、答案、登录态、提交状态和操作函数。
 */
export function useQuestionnaire() {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(null);
  const [answers, setAnswers] = useState<Record<string, QuestionnaireAnswer>>({});
  const [token, setToken] = useState<string | null>(() => readLocalToken());
  const [viewState, setViewState] = useState<QuestionnaireViewState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<QuestionnaireSubmissionData | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setViewState('loading');
    setMessage('');
    const current = await fetchCurrentQuestionnaire(token);
    if (!current) {
      setQuestionnaire(null);
      setViewState('empty');
      return;
    }
    setQuestionnaire(current);
    setAnswers(readQuestionnaireDraft(current.id)?.answers ?? {});
    setViewState('ready');
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeUserAccountSessionChanged(() => setToken(readLocalToken())), []);

  useEffect(() => {
    if (!questionnaire || viewState !== 'ready') return;
    const timer = setTimeout(() => writeQuestionnaireDraft(questionnaire.id, answers), 250);
    return () => clearTimeout(timer);
  }, [answers, questionnaire, viewState]);

  const updateAnswer = useCallback((questionId: string, answer: QuestionnaireAnswer): void => {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    setMessage('');
  }, []);

  const saveDraft = useCallback((): void => {
    if (!questionnaire) return;
    writeQuestionnaireDraft(questionnaire.id, answers);
    setMessage('draftSaved');
  }, [answers, questionnaire]);

  const submit = useCallback(async (): Promise<void> => {
    if (!questionnaire || !token || submitting) return;
    if (!areRequiredQuestionsComplete(questionnaire.questions, answers)) {
      setMessage('requiredIncomplete');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const result = await submitQuestionnaire(questionnaire.id, answers, token);
    setSubmitting(false);
    if (!result.ok || !result.data) {
      if (result.code === 409) {
        markQuestionnaireCompleted(questionnaire.id);
        clearQuestionnaireDraft(questionnaire.id);
        setMessage('alreadySubmitted');
      } else {
        setMessage('submitFailed');
      }
      return;
    }
    clearQuestionnaireDraft(questionnaire.id);
    markQuestionnaireCompleted(questionnaire.id);
    setSubmission(result.data);
    setViewState('completed');
  }, [answers, questionnaire, submitting, token]);

  return {
    questionnaire,
    answers,
    token,
    viewState,
    submitting,
    submission,
    message,
    load,
    updateAnswer,
    saveDraft,
    submit,
  };
}