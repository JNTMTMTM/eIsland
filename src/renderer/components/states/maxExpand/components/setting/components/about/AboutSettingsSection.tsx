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

import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import avatarImg from '../../../../../../../assets/avatar/T.jpg';
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

/**
 * 渲染关于软件设置区块
 * @param aboutVersion - 当前软件版本号
 * @returns 关于软件设置区域
 */
export function AboutSettingsSection({ aboutVersion }: AboutSettingsSectionProps): ReactElement {
  const { t } = useTranslation();
  const [aboutPage, setAboutPage] = useState<AboutSettingsPageKey>('development');
  const aboutPageRef = useRef<AboutSettingsPageKey>('development');
  const aboutLayoutRef = useRef<HTMLDivElement | null>(null);
  aboutPageRef.current = aboutPage;

  const pageLabels: Record<AboutSettingsPageKey, string> = {
    development: t('settings.about.pages.development', { defaultValue: '开发信息' }),
    feedback: t('settings.about.pages.feedback', { defaultValue: '问题反馈' }),
  };

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
    <div className="settings-about-page-panel" />
  );

  return (
    <div className="max-expand-settings-section settings-about settings-about-paged">
      <div className="max-expand-settings-title">{t('settings.labels.about', { defaultValue: '关于软件' })}</div>
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
