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
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file AboutSettingsSection.tsx
 * @description 设置页面 - 关于软件配置区块
 * @author 鸡哥
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import avatarImg from '../../../../../../../assets/avatar/T.jpg';
import {
  fetchMyIssueFeedbackList,
  submitUserIssueFeedback,
  type UserIssueFeedbackItem,
} from '../../../../../../../api/userAccountApi';
import { runSliderCaptcha } from '../../../../../../../utils/sliderCaptcha';
import {
  readLocalProfile,
  readLocalToken,
  subscribeUserAccountSessionChanged,
} from '../../../../../../../utils/userAccount';
import {
  AboutSettingsPageDots,
  type AboutSettingsPageKey,
} from './components/AboutSettingsPageDots';

const WALLPAPER_SOURCES = [
  {
    name: 'Spaceship Earth',
    fileName: 'art002e008487~orig.jpg',
    source: 'NASA',
    capture: 'Artemis II / iPhone 17 Pro Max',
    link: 'https://images.nasa.gov/details/art002e008487',
  },
  {
    name: 'A Crescent Earth',
    fileName: 'art002e004441~orig.jpg',
    source: 'NASA',
    capture: 'Artemis II / NIKON Z9 35mm f/2',
    link: 'https://images.nasa.gov/details/art002e004441',
  },
  {
    name: 'Thinking of You, Earth',
    fileName: 'art002e008486~orig.jpg',
    source: 'NASA',
    capture: 'Artemis II / iPhone 17 Pro Max',
    link: 'https://images.nasa.gov/details/art002e008486',
  },
] as const;

interface AboutSettingsSectionProps {
  aboutVersion: string;
}

const ABOUT_PAGES: AboutSettingsPageKey[] = ['development', 'feedback'];

type FeedbackMessageType = 'success' | 'error' | 'info';

interface FeedbackMessage {
  type: FeedbackMessageType;
  text: string;
}

function normalizeFeedbackStatus(value: string | undefined): string {
  const status = (value || '').toLowerCase();
  if (status === 'resolved' || status === 'rejected' || status === 'pending') {
    return status;
  }
  return 'pending';
}

/**
 * 渲染关于软件设置区块
 * @param aboutVersion - 当前软件版本号
 * @returns 关于软件设置区域
 */
export function AboutSettingsSection({ aboutVersion }: AboutSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const [aboutPage, setAboutPage] = useState<AboutSettingsPageKey>('development');
  const [token, setToken] = useState<string | null>(() => readLocalToken());
  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackContact, setFeedbackContact] = useState('');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [feedbackItems, setFeedbackItems] = useState<UserIssueFeedbackItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const aboutPageRef = useRef<AboutSettingsPageKey>('development');
  const aboutLayoutRef = useRef<HTMLDivElement | null>(null);
  aboutPageRef.current = aboutPage;

  const feedbackTypeOptions = useMemo(
    () => [
      { value: 'bug', label: t('settings.about.feedback.types.bug', { defaultValue: 'Bug 问题' }) },
      { value: 'feature', label: t('settings.about.feedback.types.feature', { defaultValue: '功能建议' }) },
      { value: 'experience', label: t('settings.about.feedback.types.experience', { defaultValue: '体验优化' }) },
      { value: 'other', label: t('settings.about.feedback.types.other', { defaultValue: '其他' }) },
    ],
    [t],
  );

  const pageLabels: Record<AboutSettingsPageKey, string> = {
    development: t('settings.about.pages.development', { defaultValue: '开发信息' }),
    feedback: t('settings.about.pages.feedback', { defaultValue: '问题反馈' }),
  };

  useEffect(() => {
    const syncSession = (): void => {
      setToken(readLocalToken());
    };
    return subscribeUserAccountSessionChanged(syncSession);
  }, []);

  const loadFeedbackHistory = async (): Promise<void> => {
    if (!token) {
      setFeedbackItems([]);
      return;
    }
    setLoadingHistory(true);
    const result = await fetchMyIssueFeedbackList(token, {
      status: feedbackStatusFilter || undefined,
      page: 1,
      pageSize: 20,
    });
    setLoadingHistory(false);
    if (!result.ok || !result.data) {
      if (result.code === 401 || result.code === 4011) {
        setFeedbackItems([]);
        setFeedbackMessage({
          type: 'error',
          text: t('settings.about.feedback.messages.loginRequired', { defaultValue: '请先登录后再使用反馈功能' }),
        });
        return;
      }
      setFeedbackMessage({
        type: 'error',
        text: result.message || t('settings.about.feedback.messages.loadFailed', { defaultValue: '反馈记录加载失败' }),
      });
      return;
    }
    setFeedbackItems(Array.isArray(result.data.items) ? result.data.items : []);
  };

  const handleFillBoundEmail = (): void => {
    const boundEmail = (readLocalProfile()?.email || '').trim().toLowerCase();
    if (!boundEmail) {
      setFeedbackMessage({
        type: 'error',
        text: t('settings.about.feedback.messages.boundEmailNotFound', { defaultValue: '当前账号未找到绑定邮箱' }),
      });
      return;
    }
    setFeedbackContact(boundEmail);
    setFeedbackMessage({
      type: 'info',
      text: t('settings.about.feedback.messages.boundEmailFilled', { defaultValue: '已自动填充当前账号邮箱' }),
    });
  };

  useEffect(() => {
    if (aboutPage !== 'feedback') return;
    void loadFeedbackHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aboutPage, token, feedbackStatusFilter]);

  useEffect(() => {
    const el = aboutLayoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent): void => {
      const target = e.target as HTMLElement | null;
      const inDotNav = Boolean(target?.closest('.settings-about-page-dots'));
      if (!inDotNav) {
        return;
      }
      const currentIndex = ABOUT_PAGES.indexOf(aboutPageRef.current);
      if (currentIndex < 0) return;
      const nextIndex = e.deltaY > 0
        ? Math.min(currentIndex + 1, ABOUT_PAGES.length - 1)
        : Math.max(currentIndex - 1, 0);
      if (nextIndex !== currentIndex) {
        e.preventDefault();
        setAboutPage(ABOUT_PAGES[nextIndex]);
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const renderDevelopmentPage = (): ReactElement => (
    <div className="settings-about-page-panel">
      <div className="settings-about-author">
        <img className="settings-about-avatar" src={avatarImg} alt={t('settings.about.authorAvatarAlt', { defaultValue: '作者头像' })} />
        <div className="settings-about-author-info">
          <div className="settings-about-name">
            <a className="settings-about-github" href="https://github.com/JNTMTMTM" target="_blank" rel="noreferrer" title={t('settings.about.githubHome', { defaultValue: 'GitHub 主页' })}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            </a>
            鸡哥 <span className="settings-about-id">JNTMTMTM</span>
          </div>
          <div className="settings-about-version">eIsland v{aboutVersion}</div>
        </div>
      </div>
      <div className="settings-about-notice">{t('settings.about.notice', { defaultValue: '本软件开源免费，如果你在任何地方付费购买了本软件，请立即退款并给差评。' })}</div>
      <div className="settings-about-links">
        <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.links.website', { defaultValue: '官网' })}</span><a className="settings-about-link" href="https://www.pyisland.com" target="_blank" rel="noreferrer">www.pyisland.com</a></div>
        <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.links.docs', { defaultValue: '文档站' })}</span><a className="settings-about-link" href="https://docs.pyisland.com" target="_blank" rel="noreferrer">docs.pyisland.com</a></div>
        <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.links.sourceCode', { defaultValue: '开源代码' })}</span><a className="settings-about-link" href="https://github.com/JNTMTMTM/eIsland" target="_blank" rel="noreferrer">github.com/JNTMTMTM/eIsland</a></div>
        <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.links.license', { defaultValue: '开源协议' })}</span><span className="settings-about-value">GPL-3.0</span></div>
        <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.links.iconLibrary', { defaultValue: '图标库' })}</span><a className="settings-about-link" href="https://www.iconfont.cn/" target="_blank" rel="noreferrer">iconfont.cn</a></div>
      </div>
      <div className="settings-about-deps">
        <div className="settings-about-deps-title">{t('settings.about.depsTitle', { defaultValue: '开源框架 & 依赖' })}</div>
        <div className="settings-about-deps-grid">
          <span className="settings-about-dep">Electron</span><span className="settings-about-dep">React</span><span className="settings-about-dep">React DOM</span><span className="settings-about-dep">TypeScript</span><span className="settings-about-dep">Zustand</span><span className="settings-about-dep">Tailwind CSS</span><span className="settings-about-dep">Vite</span><span className="settings-about-dep">electron-vite</span><span className="settings-about-dep">electron-builder</span><span className="settings-about-dep">react-markdown</span><span className="settings-about-dep">react-datepicker</span><span className="settings-about-dep">remark-gfm</span><span className="settings-about-dep">@coooookies/windows-smtc-monitor</span><span className="settings-about-dep">openmeteo</span><span className="settings-about-dep">lunar-javascript</span><span className="settings-about-dep">lyric-resolver</span><span className="settings-about-dep">colorthief</span><span className="settings-about-dep">lucide-react</span><span className="settings-about-dep">@electron-toolkit/preload</span><span className="settings-about-dep">@electron-toolkit/utils</span><span className="settings-about-dep">@electron-toolkit/tsconfig</span><span className="settings-about-dep">@tailwindcss/vite</span><span className="settings-about-dep">@vitejs/plugin-react</span><span className="settings-about-dep">PostCSS</span><span className="settings-about-dep">Autoprefixer</span>
        </div>
      </div>
      <div className="settings-about-deps">
        <div className="settings-about-deps-title">{t('settings.about.wallpaperTitle', { defaultValue: '壁纸素材' })}</div>
        <div className="settings-about-wallpaper-cards">
          {WALLPAPER_SOURCES.map((item) => (
            <div className="settings-about-wallpaper-card" key={item.fileName}>
              <div className="settings-about-row"><span className="settings-about-label">{item.name}</span><span className="settings-about-value">{item.fileName}</span></div>
              <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.wallpaper.source', { defaultValue: '来源' })}</span><span className="settings-about-value">{item.source}</span></div>
              <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.wallpaper.capture', { defaultValue: '拍摄' })}</span><span className="settings-about-value">{item.capture}</span></div>
              <div className="settings-about-row"><span className="settings-about-label">{t('settings.about.wallpaper.link', { defaultValue: '原始链接' })}</span><a className="settings-about-link" href={item.link} target="_blank" rel="noreferrer">{item.link.replace('https://', '')}</a></div>
            </div>
          ))}
        </div>
        <div className="settings-about-notice" style={{ marginTop: 6, fontSize: 11 }}>{t('settings.about.wallpaper.notice', { defaultValue: '所有 NASA 图像均按照 NASA 图像使用政策使用，不暗示 NASA 对本项目的任何认可。' })}</div>
      </div>
      <div className="settings-about-footer">
        <div className="settings-about-copyright">{t('settings.about.copyright', { defaultValue: '© JNTMTMTM, pyisland.com 版权所有' })}</div>
        <div className="settings-about-slogan">{t('settings.about.slogan', { defaultValue: '算法诠释一切 质疑即是认可' })}</div>
      </div>
    </div>
  );

  const renderFeedbackPage = (): ReactElement => (
    <div className="settings-about-page-panel settings-about-feedback-panel">
      <div className="settings-about-feedback-card">
        <div className="settings-about-feedback-intro">
          {t('settings.about.feedback.intro', { defaultValue: '问题反馈会进入管理后台审核，请尽量提供完整复现信息。' })}
        </div>
        {!token ? (
          <div className="settings-user-feedback settings-user-feedback--info">
            {t('settings.about.feedback.messages.loginRequired', { defaultValue: '请先登录后再使用反馈功能' })}
          </div>
        ) : (
          <>
            <div className="settings-field-group settings-about-feedback-form-grid">
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.about.feedback.fields.type', { defaultValue: '反馈类型' })}</span>
                <select
                  className="settings-field-input"
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  disabled={submittingFeedback}
                >
                  {feedbackTypeOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label className="settings-field">
                <span className="settings-field-label">{t('settings.about.feedback.fields.contact', { defaultValue: '联系方式（选填）' })}</span>
                <div className="settings-about-feedback-contact-row">
                  <input
                    className="settings-field-input"
                    value={feedbackContact}
                    onChange={(e) => setFeedbackContact(e.target.value)}
                    placeholder={t('settings.about.feedback.fields.contactPlaceholder', { defaultValue: '邮箱、QQ 或其他可联系信息' })}
                    disabled={submittingFeedback}
                  />
                  <button
                    type="button"
                    className="settings-user-secondary-btn settings-about-feedback-contact-btn"
                    onClick={handleFillBoundEmail}
                    disabled={submittingFeedback}
                  >
                    {t('settings.about.feedback.actions.useBoundEmail', { defaultValue: '填充邮箱' })}
                  </button>
                </div>
              </label>
              <label className="settings-field settings-about-feedback-field-full">
                <span className="settings-field-label">{t('settings.about.feedback.fields.title', { defaultValue: '标题' })}</span>
                <input
                  className="settings-field-input"
                  value={feedbackTitle}
                  onChange={(e) => setFeedbackTitle(e.target.value)}
                  placeholder={t('settings.about.feedback.fields.titlePlaceholder', { defaultValue: '请简要描述你遇到的问题' })}
                  maxLength={120}
                  disabled={submittingFeedback}
                />
              </label>
              <label className="settings-field settings-about-feedback-field-full">
                <span className="settings-field-label">{t('settings.about.feedback.fields.content', { defaultValue: '详细描述' })}</span>
                <textarea
                  className="settings-field-textarea settings-about-feedback-textarea"
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder={t('settings.about.feedback.fields.contentPlaceholder', { defaultValue: '请提供复现步骤、实际结果、期望结果等信息' })}
                  maxLength={2000}
                  disabled={submittingFeedback}
                />
              </label>
            </div>

            {feedbackMessage ? (
              <div className={`settings-user-feedback settings-user-feedback--${feedbackMessage.type}`}>
                {feedbackMessage.text}
              </div>
            ) : null}

            <div className="settings-about-feedback-actions">
              <button
                type="button"
                className="settings-user-primary-btn"
                disabled={submittingFeedback}
                onClick={() => {
                  void (async () => {
                    if (!token) {
                      setFeedbackMessage({
                        type: 'error',
                        text: t('settings.about.feedback.messages.loginRequired', { defaultValue: '请先登录后再使用反馈功能' }),
                      });
                      return;
                    }
                    if (!feedbackTitle.trim()) {
                      setFeedbackMessage({
                        type: 'error',
                        text: t('settings.about.feedback.messages.titleRequired', { defaultValue: '请填写反馈标题' }),
                      });
                      return;
                    }
                    if (!feedbackContent.trim()) {
                      setFeedbackMessage({
                        type: 'error',
                        text: t('settings.about.feedback.messages.contentRequired', { defaultValue: '请填写详细描述' }),
                      });
                      return;
                    }
                    const localProfile = readLocalProfile();
                    const captchaAccount = (
                      localProfile?.email
                      || localProfile?.username
                      || feedbackContact.trim()
                      || 'issue-feedback'
                    ).trim();
                    setSubmittingFeedback(true);
                    setFeedbackMessage(null);
                    try {
                      const captcha = await runSliderCaptcha(captchaAccount);
                      if (!captcha) {
                        setFeedbackMessage({
                          type: 'error',
                          text: t('settings.about.feedback.messages.captchaCancelled', { defaultValue: '请完成滑块验证后再提交反馈' }),
                        });
                        setSubmittingFeedback(false);
                        return;
                      }
                      const result = await submitUserIssueFeedback(token, {
                        feedbackType,
                        title: feedbackTitle.trim(),
                        content: feedbackContent.trim(),
                        contact: feedbackContact.trim(),
                        clientVersion: (aboutVersion || '').trim(),
                        captchaTicket: captcha.ticket,
                        captchaRandstr: captcha.randstr,
                        captchaSign: captcha.sign,
                      });
                      if (!result.ok) {
                        setFeedbackMessage({
                          type: 'error',
                          text: result.message || t('settings.about.feedback.messages.submitFailed', { defaultValue: '反馈提交失败，请稍后重试' }),
                        });
                        setSubmittingFeedback(false);
                        return;
                      }
                      setFeedbackTitle('');
                      setFeedbackContent('');
                      setFeedbackMessage({
                        type: 'success',
                        text: t('settings.about.feedback.messages.submitSuccess', { defaultValue: '反馈已提交，感谢你的建议' }),
                      });
                      await loadFeedbackHistory();
                    } catch (err) {
                      setFeedbackMessage({
                        type: 'error',
                        text: err instanceof Error
                          ? err.message
                          : t('settings.about.feedback.messages.submitFailed', { defaultValue: '反馈提交失败，请稍后重试' }),
                      });
                    } finally {
                      setSubmittingFeedback(false);
                    }
                  })();
                }}
              >
                {submittingFeedback
                  ? t('settings.about.feedback.actions.submitting', { defaultValue: '提交中…' })
                  : t('settings.about.feedback.actions.submit', { defaultValue: '提交反馈' })}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="settings-about-feedback-card">
        <div className="settings-about-feedback-history-head">
          <div className="settings-about-feedback-history-title">
            {t('settings.about.feedback.history.title', { defaultValue: '我的反馈记录' })}
          </div>
          <div className="settings-about-feedback-history-controls">
            <select
              className="settings-field-input settings-about-feedback-filter"
              value={feedbackStatusFilter}
              onChange={(e) => setFeedbackStatusFilter(e.target.value)}
              disabled={!token || loadingHistory}
            >
              <option value="">{t('settings.about.feedback.history.filters.all', { defaultValue: '全部状态' })}</option>
              <option value="pending">{t('settings.about.feedback.history.filters.pending', { defaultValue: '待处理' })}</option>
              <option value="resolved">{t('settings.about.feedback.history.filters.resolved', { defaultValue: '已处理' })}</option>
              <option value="rejected">{t('settings.about.feedback.history.filters.rejected', { defaultValue: '已拒绝' })}</option>
            </select>
            <button
              type="button"
              className="settings-user-secondary-btn"
              disabled={!token || loadingHistory}
              onClick={() => {
                void loadFeedbackHistory();
              }}
            >
              {t('settings.about.feedback.actions.refresh', { defaultValue: '刷新' })}
            </button>
          </div>
        </div>

        {!token ? (
          <div className="settings-about-feedback-empty">
            {t('settings.about.feedback.history.loginHint', { defaultValue: '登录后可查看你提交过的反馈记录' })}
          </div>
        ) : loadingHistory ? (
          <div className="settings-about-feedback-empty">
            {t('settings.about.feedback.history.loading', { defaultValue: '加载反馈记录中…' })}
          </div>
        ) : feedbackItems.length === 0 ? (
          <div className="settings-about-feedback-empty">
            {t('settings.about.feedback.history.empty', { defaultValue: '暂无反馈记录' })}
          </div>
        ) : (
          <div className="settings-about-feedback-list">
            {feedbackItems.map((item) => {
              const normalizedStatus = normalizeFeedbackStatus(item.status);
              return (
                <div className="settings-about-feedback-item" key={item.id}>
                  <div className="settings-about-feedback-item-head">
                    <span className="settings-about-feedback-item-title">{item.title || '-'}</span>
                    <span className={`settings-about-feedback-status settings-about-feedback-status--${normalizedStatus}`}>
                      {t(`settings.about.feedback.history.status.${normalizedStatus}`, {
                        defaultValue: normalizedStatus,
                      })}
                    </span>
                  </div>
                  <div className="settings-about-feedback-item-meta">
                    {t('settings.about.feedback.history.meta', {
                      defaultValue: '类型：{{type}} · 提交于：{{time}}',
                      type: item.feedbackType || '-',
                      time: item.createdAt || '-',
                    })}
                  </div>
                  <div className="settings-about-feedback-item-content">{item.content || '-'}</div>
                  {item.adminReply ? (
                    <div className="settings-about-feedback-item-reply">
                      {t('settings.about.feedback.history.adminReply', { defaultValue: '管理员回复：{{reply}}', reply: item.adminReply })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-expand-settings-section settings-about settings-about-paged">
      <div className="max-expand-settings-title settings-app-title-line">
        <span>{t('settings.labels.about', { defaultValue: '关于软件' })}</span>
        <span className="settings-app-title-sub">- {pageLabels[aboutPage]}</span>
      </div>
      <div className="settings-about-layout" ref={aboutLayoutRef}>
        <div className="settings-about-main">
          {aboutPage === 'development' && renderDevelopmentPage()}
          {aboutPage === 'feedback' && renderFeedbackPage()}
        </div>
        <AboutSettingsPageDots
          aboutPage={aboutPage}
          aboutPages={ABOUT_PAGES}
          pageLabels={pageLabels}
          setAboutPage={setAboutPage}
        />
      </div>
    </div>
  );
}
