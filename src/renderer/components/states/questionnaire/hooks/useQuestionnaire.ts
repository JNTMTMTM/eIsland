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
  fetchActiveQuestionnaires,
  isQuestionnaireCompleted,
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
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireData[]>([]);
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState<number | null>(null);
  const [answersByQuestionnaire, setAnswersByQuestionnaire] = useState<Record<number, Record<string, QuestionnaireAnswer>>>({});
  const [token, setToken] = useState<string | null>(() => readLocalToken());
  const [viewState, setViewState] = useState<QuestionnaireViewState>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<QuestionnaireSubmissionData | null>(null);
  const [message, setMessage] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const questionnaire = questionnaires.find((item) => item.id === selectedQuestionnaireId) ?? null;
  const answers = selectedQuestionnaireId === null ? {} : answersByQuestionnaire[selectedQuestionnaireId] ?? {};

  const load = useCallback(async (): Promise<void> => {
    setViewState('loading');
    setMessage('');
    setSubmissionError('');
    setSubmission(null);
    const active = (await fetchActiveQuestionnaires(token))
      .filter((item) => !isQuestionnaireCompleted(item.id));
    setQuestionnaires(active);
    setAnswersByQuestionnaire(Object.fromEntries(
      active.map((item) => [item.id, readQuestionnaireDraft(item.id)?.answers ?? {}]),
    ));
    setSelectedQuestionnaireId((current) => (
      active.some((item) => item.id === current) ? current : active[0]?.id ?? null
    ));
    setViewState(active.length > 0 ? 'ready' : 'empty');
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
    if (selectedQuestionnaireId === null) return;
    setAnswersByQuestionnaire((current) => ({
      ...current,
      [selectedQuestionnaireId]: {
        ...(current[selectedQuestionnaireId] ?? {}),
        [questionId]: answer,
      },
    }));
    setMessage('');
    setSubmissionError('');
  }, [selectedQuestionnaireId]);

  const selectQuestionnaire = useCallback((surveyId: number): void => {
    if (!questionnaires.some((item) => item.id === surveyId)) return;
    setSelectedQuestionnaireId(surveyId);
    setSubmission(null);
    setViewState('ready');
    setMessage('');
    setSubmissionError('');
  }, [questionnaires]);

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
    setSubmissionError('');
    const result = await submitQuestionnaire(questionnaire.id, answers, token);
    setSubmitting(false);
    if (!result.ok || !result.data) {
      if (result.code === 409) {
        markQuestionnaireCompleted(questionnaire.id);
        clearQuestionnaireDraft(questionnaire.id);
        const remaining = questionnaires.filter((item) => item.id !== questionnaire.id);
        setQuestionnaires(remaining);
        setSelectedQuestionnaireId(remaining[0]?.id ?? null);
        setViewState(remaining.length > 0 ? 'ready' : 'empty');
        setMessage('alreadySubmitted');
      } else {
        setSubmissionError(`${result.message} (${result.code})`);
      }
      return;
    }
    clearQuestionnaireDraft(questionnaire.id);
    markQuestionnaireCompleted(questionnaire.id);
    setSubmission(result.data);
    setViewState('completed');
  }, [answers, questionnaire, questionnaires, submitting, token]);

  const continueAfterSubmission = useCallback((): void => {
    if (!questionnaire) return;
    const remaining = questionnaires.filter((item) => item.id !== questionnaire.id);
    setQuestionnaires(remaining);
    setSelectedQuestionnaireId(remaining[0]?.id ?? null);
    setSubmission(null);
    setMessage('');
    setSubmissionError('');
    setViewState(remaining.length > 0 ? 'ready' : 'empty');
  }, [questionnaire, questionnaires]);

  return {
    questionnaires,
    questionnaire,
    selectedQuestionnaireId,
    answers,
    token,
    viewState,
    submitting,
    submission,
    message,
    submissionError,
    load,
    selectQuestionnaire,
    updateAnswer,
    saveDraft,
    submit,
    continueAfterSubmission,
  };
}