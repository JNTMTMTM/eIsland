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

import { useState, useEffect, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import { SvgIcon } from '../../../utils/SvgIcon';
import { fetchAnnouncementSocialConfig, type AnnouncementSocialConfig } from '../../../api/announcement/announcementApi';
import { QuestionnaireQuestion } from './components/QuestionnaireQuestion';
import { useQuestionnaire } from './hooks/useQuestionnaire';
import { useQuestionnaireNavigation } from './hooks/useQuestionnaireNavigation';
import { areRequiredQuestionsComplete, isQuestionnaireAnswerComplete } from './utils/questionnaireAnswers';
import '../../../styles/settings/settings.css';
import '../../../styles/announcement/announcement.css';
import '../../../styles/questionnaire/questionnaire.css';

/**
 * 渲染问卷状态页面。
 * @returns 问卷加载、作答或完成视图。
 */
export function QuestionnaireContent(): ReactElement {
  const { t } = useTranslation();
  const { setHover, setMaxExpand, setMaxExpandTab } = useIslandStore();
  const [socialConfig, setSocialConfig] = useState<AnnouncementSocialConfig>({
    githubUrl: '',
    bilibiliUrl: '',
    qqInviteUrl: '',
    qqQrImageUrl: '',
  });
  const [listExpanded, setListExpanded] = useState(true);
  const {
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
  } = useQuestionnaire();
  const navigation = useQuestionnaireNavigation(
    questionnaire?.questions.length ?? 0,
    selectedQuestionnaireId,
  );
  const requiredComplete = questionnaire
    ? areRequiredQuestionsComplete(questionnaire.questions, answers)
    : false;

  useEffect(() => {
    let cancelled = false;
    fetchAnnouncementSocialConfig()
      .then((config) => {
        if (!cancelled) setSocialConfig(config);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReportIssue = (): void => {
    window.api.storeWrite('settings-open-tab', 'about-feedback').catch(() => {});
    setMaxExpandTab('settings');
    setMaxExpand();
  };

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
            <button type="button" className="settings-user-secondary-btn" onClick={() => void load()}>{t('questionnaire.retry')}</button>
            <button type="button" className="settings-user-secondary-btn" onClick={setHover}>{t('questionnaire.close')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === 'completed' && submission) {
    return (
      <div className="questionnaire-state-content" onClick={(event) => event.stopPropagation()}>
        <div className="questionnaire-completed">
          <h1>{t('questionnaire.completedTitle')}</h1>
          <p>{t('questionnaire.completedDescription')}</p>
          {submission.rewardProDays > 0 ? (
            <div className="questionnaire-reward">
              <strong>{t('questionnaire.rewardDays', { days: submission.rewardProDays })}</strong>
              {submission.rewardProExpireAt && <span>{t('questionnaire.rewardExpireAt', { time: submission.rewardProExpireAt.replace('T', ' ') })}</span>}
            </div>
          ) : <span className="questionnaire-no-reward">{t('questionnaire.noReward')}</span>}
          <div className="questionnaire-completed-actions">
            <button
              type="button"
              className="settings-user-primary-btn"
              onClick={questionnaires.length > 1 ? continueAfterSubmission : setHover}
            >
              {t(questionnaires.length > 1 ? 'questionnaire.continue' : 'questionnaire.close')}
            </button>
            <button type="button" className="settings-user-secondary-btn" onClick={handleReportIssue}>{t('questionnaire.reportIssue')}</button>
          </div>
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
          <div className="announcement-header-actions">
            <button
              type="button"
              className={`announcement-list-toggle-btn${listExpanded ? ' active' : ''}`}
              onClick={() => setListExpanded((prev) => !prev)}
              aria-label={t(listExpanded ? 'questionnaire.hideList' : 'questionnaire.showList')}
              aria-expanded={listExpanded}
            >
              <img src={listExpanded ? SvgIcon.COLLAPSE : SvgIcon.EXPAND} alt="" draggable={false} />
            </button>
            {socialConfig.bilibiliUrl && (
              <button type="button" className="announcement-bilibili-btn" onClick={() => void window.api.clipboardOpenUrl(socialConfig.bilibiliUrl)}>
                <img src={SvgIcon.BILIBILI} alt="" draggable={false} />
              </button>
            )}
            {(socialConfig.qqInviteUrl || socialConfig.qqQrImageUrl) && (
              <button type="button" className="announcement-qq-btn" onClick={() => {
                if (socialConfig.qqInviteUrl) void window.api.clipboardOpenUrl(socialConfig.qqInviteUrl);
              }}>
                <img src={SvgIcon.QQ} alt="" draggable={false} />
              </button>
            )}
            {socialConfig.githubUrl && (
              <button type="button" className="announcement-github-btn" onClick={() => void window.api.clipboardOpenUrl(socialConfig.githubUrl)}>
                <img src={SvgIcon.GITHUB} alt="" draggable={false} />
              </button>
            )}
            <button type="button" className="announcement-close-btn" onClick={setHover} aria-label={t('questionnaire.close')}>
              <img src={SvgIcon.CANCEL} alt="" draggable={false} />
            </button>
          </div>
        </header>
        <div className="questionnaire-divider" />
        <div className="questionnaire-content-row">
          <aside className={`questionnaire-list${listExpanded ? '' : ' collapsed'}`} aria-label={t('questionnaire.questionnaireNavigation')}>
            {questionnaires.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === selectedQuestionnaireId ? 'active' : ''}
                aria-current={item.id === selectedQuestionnaireId ? 'true' : undefined}
                disabled={submitting}
                onClick={() => selectQuestionnaire(item.id)}
              >
                <span>{item.title}</span>
                <small>{item.endsAt.replace('T', ' ').slice(0, 16)}</small>
              </button>
            ))}
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
                {submissionError && <span className="error">{submissionError}</span>}
                {!submissionError && message && <span className={message === 'draftSaved' ? 'success' : 'error'}>{t(`questionnaire.${message}`)}</span>}
                {!token && <span>{t('questionnaire.loginRequired')}</span>}
              </div>
              <button type="button" className="settings-user-secondary-btn" onClick={handleReportIssue}>{t('questionnaire.reportIssue')}</button>
              <button type="button" className="settings-user-secondary-btn" onClick={saveDraft}>{t('questionnaire.saveDraft')}</button>
              <button
                type="button"
                className="settings-user-primary-btn"
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
                />
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}