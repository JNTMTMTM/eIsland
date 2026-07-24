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
 * @file DynamicIslandGuide.tsx
 * @description 引导配置窗口 React 渲染入口
 * @description 首次启动时引导用户完成基础配置，splash 动画结束后通过
 *   FIRST_LAUNCH_STORE_KEY 判断是否进入配置界面（dev 模式下默认进入）
 * @author 鸡哥
 */

import { StrictMode, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/guide.css';
import { WaveEffect } from './components/components/DynamicIslandSharedWaveEffect';
import { LanguageStep } from './components/components/DynamicIslandGuidePages/language';
import { WhitelistStep } from './components/components/DynamicIslandGuidePages/smtc-white-list';
import { SmtcStep } from './components/components/DynamicIslandGuidePages/smtc-test';
import { ThemeStep } from './components/components/DynamicIslandGuidePages/theme';
import { ShapeStep } from './components/components/DynamicIslandGuidePages/shape';
import { LyricModeStep } from './components/components/DynamicIslandGuidePages/lyric-mode';
import { UpdateStep } from './components/components/DynamicIslandGuidePages/update';
import { GithubStep } from './components/components/DynamicIslandGuidePages/github';
import { SponsorStep } from './components/components/DynamicIslandGuidePages/sponsors';
import { WelcomeStep } from './components/components/DynamicIslandGuidePages/welcome';
import { ProcessIndicator } from './components/components/DynamicIslandProcessIndicator';
import { useSmtcAccentColor } from './components/components/DynamicIslandGuidePages/smtc-test/hooks/useSmtcAccentColor';
import type { GuideStep } from './types/DynamicIslandGuideTypes';
import { GUIDE_STEP_INDEX, GUIDE_STEP_TOTAL } from './types/DynamicIslandGuideTypes';

/** 引导窗口根组件 */
function GuideApp(): ReactElement {
  const [step, setStep] = useState<GuideStep>('language');
  const accentColor = useSmtcAccentColor();

  /** 通知主进程引导完成，关闭引导窗口并显示主窗口 */
  const handleComplete = useCallback((): void => {
    window.electron.ipcRenderer.send('guide:complete');
  }, []);

  /** 语言选择完成，进入白名单配置 */
  const handleLanguageNext = useCallback((): void => {
    setStep('whitelist');
  }, []);

  /** 白名单配置完成，进入 SMTC 检查 */
  const handleWhitelistNext = useCallback((): void => {
    setStep('smtc');
  }, []);

  /** 白名单返回语言选择 */
  const handleWhitelistPrev = useCallback((): void => {
    setStep('language');
  }, []);

  /** SMTC 检查完成，进入主题设置 */
  const handleSmtcNext = useCallback((): void => {
    setStep('theme');
  }, []);

  /** SMTC 返回白名单配置 */
  const handleSmtcPrev = useCallback((): void => {
    setStep('whitelist');
  }, []);

  /** 主题设置完成，进入形态设置 */
  const handleThemeNext = useCallback((): void => {
    setStep('shape');
  }, []);

  /** 主题设置返回 SMTC 检查 */
  const handleThemePrev = useCallback((): void => {
    setStep('smtc');
  }, []);

  /** 形态设置完成，进入歌词模式配置 */
  const handleShapeNext = useCallback((): void => {
    setStep('lyricMode');
  }, []);

  /** 形态设置返回主题设置 */
  const handleShapePrev = useCallback((): void => {
    setStep('theme');
  }, []);

  /** 歌词模式配置完成，进入更新源配置 */
  const handleLyricModeNext = useCallback((): void => {
    setStep('update');
  }, []);

  /** 歌词模式配置返回形态设置 */
  const handleLyricModePrev = useCallback((): void => {
    setStep('shape');
  }, []);

  /** 更新源配置完成，进入开源信息 */
  const handleUpdateNext = useCallback((): void => {
    setStep('github');
  }, []);

  /** 更新源配置返回歌词模式配置 */
  const handleUpdatePrev = useCallback((): void => {
    setStep('lyricMode');
  }, []);

  /** 开源信息完成，进入赞助商页 */
  const handleGithubNext = useCallback((): void => {
    setStep('sponsors');
  }, []);

  /** 开源信息返回更新源配置 */
  const handleGithubPrev = useCallback((): void => {
    setStep('update');
  }, []);

  /** 赞助商页完成，进入欢迎页 */
  const handleSponsorsNext = useCallback((): void => {
    setStep('welcome');
  }, []);

  /** 赞助商页返回开源信息 */
  const handleSponsorsPrev = useCallback((): void => {
    setStep('github');
  }, []);

  /** 欢迎页返回赞助商页 */
  const handleWelcomePrev = useCallback((): void => {
    setStep('sponsors');
  }, []);

  return (
    <div className="guide-container">
      <WaveEffect accentColor={accentColor} />
      <div className="guide-content">
        <div className="guide-process-indicator">
          <ProcessIndicator total={GUIDE_STEP_TOTAL} current={GUIDE_STEP_INDEX[step]} />
        </div>
        {step === 'language' && (
          <LanguageStep
            onNext={handleLanguageNext}
            onSkip={handleComplete}
          />
        )}
        {step === 'whitelist' && (
          <WhitelistStep
            onNext={handleWhitelistNext}
            onPrev={handleWhitelistPrev}
          />
        )}
        {step === 'smtc' && (
          <SmtcStep
            onNext={handleSmtcNext}
            onPrev={handleSmtcPrev}
          />
        )}
        {step === 'theme' && (
          <ThemeStep
            onNext={handleThemeNext}
            onPrev={handleThemePrev}
          />
        )}
        {step === 'shape' && (
          <ShapeStep
            onNext={handleShapeNext}
            onPrev={handleShapePrev}
          />
        )}
        {step === 'lyricMode' && (
          <LyricModeStep
            onNext={handleLyricModeNext}
            onPrev={handleLyricModePrev}
          />
        )}
        {step === 'update' && (
          <UpdateStep
            onNext={handleUpdateNext}
            onPrev={handleUpdatePrev}
          />
        )}
        {step === 'github' && (
          <GithubStep
            onNext={handleGithubNext}
            onPrev={handleGithubPrev}
          />
        )}
        {step === 'sponsors' && (
          <SponsorStep
            onNext={handleSponsorsNext}
            onPrev={handleSponsorsPrev}
          />
        )}
        {step === 'welcome' && (
          <WelcomeStep
            onComplete={handleComplete}
            onPrev={handleWelcomePrev}
          />
        )}
      </div>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('[GuideRenderer] 未找到 #root 挂载节点');
}

createRoot(root).render(
  <StrictMode>
    <GuideApp />
  </StrictMode>
);
