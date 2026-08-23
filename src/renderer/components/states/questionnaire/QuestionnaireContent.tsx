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
 * @file QuestionnaireContent.tsx
 * @description 问卷状态机主界面与完整作答提交链路。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import { QuestionnaireQuestion } from './components/QuestionnaireQuestion';
import { useQuestionnaire } from './hooks/useQuestionnaire';
import { useQuestionnaireNavigation } from './hooks/useQuestionnaireNavigation';
import { areRequiredQuestionsComplete, isQuestionnaireAnswerComplete } from './utils/questionnaireAnswers';
import '../../../styles/questionnaire/questionnaire.css';

/**
 * 渲染问卷状态页面。
 * @returns 问卷加载、作答或完成视图。
 */
export function QuestionnaireContent(): ReactElement {
  const { t } = useTranslation();
  const { setHover } = useIslandStore();
  const {
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
  } = useQuestionnaire();
  const navigation = useQuestionnaireNavigation(questionnaire?.questions.length ?? 0);
  const requiredComplete = questionnaire
    ? areRequiredQuestionsComplete(questionnaire.questions, answers)
    : false;
  const completedCount = questionnaire?.questions.filter((question) => isQuestionnaireAnswerComplete(answers[question.id])).length ?? 0;

  if (viewState === 'loading') {
    return <div className="questionnaire-state-content"><div className="questionnaire-empty">{t('questionnaire.loading')}</div></div>;
  }

  if (viewState === 'empty' || !questionnaire) {
    return (
      <div className="questionnaire-state-content" onClick={(event) => event.stopPropagation()}>
        <div className="questionnaire-empty">
          <strong>{t('questionnaire.emptyTitle')}</strong>
          <span>{t('questionnaire.emptyDescription')}</span>
          <div>
            <button type="button" onClick={() => void load()}>{t('questionnaire.retry')}</button>
            <button type="button" onClick={setHover}>{t('questionnaire.close')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'completed' && submission) {
    return (
      <div className="questionnaire-state-content" onClick={(event) => event.stopPropagation()}>
        <div className="questionnaire-completed">
          <div className="questionnaire-completed-mark">✓</div>
          <h1>{t('questionnaire.completedTitle')}</h1>
          <p>{t('questionnaire.completedDescription')}</p>
          {submission.rewardProDays > 0 ? (
            <div className="questionnaire-reward">
              <strong>{t('questionnaire.rewardDays', { days: submission.rewardProDays })}</strong>
              {submission.rewardProExpireAt && <span>{t('questionnaire.rewardExpireAt', { time: submission.rewardProExpireAt.replace('T', ' ') })}</span>}
            </div>
          ) : <span className="questionnaire-no-reward">{t('questionnaire.noReward')}</span>}
          <button type="button" onClick={setHover}>{t('questionnaire.close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="questionnaire-state-content" onClick={(event) => event.stopPropagation()}>
      <div className="questionnaire-panel">
        <header className="questionnaire-header">
          <div>
            <h1>{questionnaire.title}</h1>
            <p>{questionnaire.description || t('questionnaire.subtitle')}</p>
          </div>
          <div className="questionnaire-header-meta">
            <span>{t('questionnaire.progress', { completed: completedCount, total: questionnaire.questions.length })}</span>
            <button type="button" className="questionnaire-close" aria-label={t('questionnaire.close')} onClick={setHover}>
              <img src={SvgIcon.CANCEL} alt="" draggable={false} />
            </button>
          </div>
        </header>
        <div className="questionnaire-divider" />
        <div className="questionnaire-content-row">
          <aside className="questionnaire-list">
            <button type="button" className="active">
              <span>{questionnaire.title}</span>
              <small>{t('questionnaire.validUntil', { time: questionnaire.endsAt.replace('T', ' ').slice(0, 16) })}</small>
            </button>
            {questionnaire.rewardProDays && (
              <div className="questionnaire-list-reward">{t('questionnaire.rewardHint', { days: questionnaire.rewardProDays })}</div>
            )}
          </aside>
          <main ref={navigation.scrollRef} className="questionnaire-body">
            {questionnaire.questions.map((question, index) => (
              <section
                key={question.id}
                ref={(element) => { navigation.questionRefs.current[index] = element; }}
                className="questionnaire-question-section"
              >
                <QuestionnaireQuestion
                  question={question}
                  index={index}
                  answer={answers[question.id]}
                  onChange={(answer) => updateAnswer(question.id, answer)}
                />
              </section>
            ))}
            <footer className="questionnaire-actions">
              <div>
                {message && <span className={message === 'draftSaved' ? 'success' : 'error'}>{t(`questionnaire.${message}`)}</span>}
                {!token && <span>{t('questionnaire.loginRequired')}</span>}
              </div>
              <button type="button" className="secondary" onClick={saveDraft}>{t('questionnaire.saveDraft')}</button>
              <button
                type="button"
                className="primary"
                disabled={!token || !requiredComplete || submitting}
                onClick={() => void submit()}
              >{submitting ? t('questionnaire.submitting') : t('questionnaire.submit')}</button>
            </footer>
          </main>
          <nav className="questionnaire-toc" aria-label={t('questionnaire.questionNavigation')}>
            {questionnaire.questions.map((question, index) => {
              const completed = isQuestionnaireAnswerComplete(answers[question.id]);
              return (
                <button
                  key={question.id}
                  type="button"
                  className={`${index === navigation.activeIndex ? 'active' : ''}${completed ? ' completed' : ''}`}
                  aria-label={t('questionnaire.jumpToQuestion', { number: index + 1 })}
                  onClick={() => navigation.scrollToQuestion(index)}
                >
                  <span>{index + 1}</span>
                  <i />
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}