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
 * @file GuideContent.tsx
 * @description 引导页组件，首次启动或更新后展示，帮助用户了解灵动岛功能
 * @author 鸡哥
 */

import { useShallow } from 'zustand/react/shallow';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useIslandStore from '../../../store/slices';
import '../../../styles/guide/guide.css';
import { GuideInteractivePage } from './components/GuideInteractivePage';
import { GuideStaticPage } from './components/GuideStaticPage';
import { GuideFooter } from './components/GuideFooter';
import { MiniSettingIsland } from './components/MiniSettingIsland';
import { MiniToolIsland } from './components/MiniToolIsland';
import { MiniMusicIsland } from './components/MiniMusicIsland';
import { MiniIsland } from './components/MiniIsland';
import {
  getGuidePages,
  getInteractionCards,
  getMusicCards,
  getSettingCards,
  getToolCards,
} from './config/guideContentConfig';
import {
  readStandaloneWindowMode,
  STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY,
  STANDALONE_WINDOW_AUTH_INTENT_STORE_KEY,
} from './utils/guideContentUtils';
import { useGuideNavigation } from './hooks/useGuideNavigation';
import { readLocalToken } from '../../../utils/userAccount';

/**
 * 引导页内容组件
 * @description 分页导航点展示，完成后标记当前版本并切回 idle
 */
export function GuideContent(): React.ReactElement {
  const { t } = useTranslation();
  const isLoggedIn = !!readLocalToken();
  const interactionCards = getInteractionCards(t);
  const musicCards = getMusicCards(t);
  const toolCards = getToolCards(t);
  const settingCards = getSettingCards(t);
  const guidePages = getGuidePages(t, !isLoggedIn);
  const { setIdle, setLogin, setRegister } = useIslandStore(useShallow((store) => ({
    setIdle: store.setIdle,
    setLogin: store.setLogin,
    setRegister: store.setRegister,
  })));
  const {
    page,
    setPage,
    cardIndex,
    animDirRef,
    isLast,
    handleCardWheel,
    handlePrev,
    handleNext,
    resetGuideState,
  } = useGuideNavigation({
    guidePages,
    interactionCardsLength: interactionCards.length,
    musicCardsLength: musicCards.length,
    toolCardsLength: toolCards.length,
    settingCardsLength: settingCards.length,
  });

  const handleFinish = useCallback(() => {
    resetGuideState();
    window.api?.updaterVersion?.().then((v) => {
      if (v) window.api?.storeWrite?.('guide-shown-version', v);
    }).catch(() => {});
    setIdle(true);
  }, [resetGuideState, setIdle]);

  const openAuthFromGuide = useCallback(async (target: 'login' | 'register'): Promise<void> => {
    const mode = await readStandaloneWindowMode();
    if (mode === 'standalone') {
      await window.api.storeWrite(STANDALONE_WINDOW_ACTIVE_TAB_STORE_KEY, 'settings').catch(() => {});
      await window.api.storeWrite(STANDALONE_WINDOW_AUTH_INTENT_STORE_KEY, target).catch(() => {});
      await window.api.openStandaloneWindow().catch(() => {});
      return;
    }
    if (target === 'login') {
      setLogin();
      return;
    }
    setRegister();
  }, [setLogin, setRegister]);

  const current = guidePages[page];
  const isBasic = current.interactive === 'basic';
  const isMusic = current.interactive === 'music';
  const isTools = current.interactive === 'tools';
  const cards: Array<{ iconSrc: string; title: string; desc: string }> =
    isBasic ? interactionCards : isMusic ? musicCards : isTools ? toolCards : settingCards;
  const hint = isBasic
    ? t('guide.hints.basicWheel', { defaultValue: '在此区域附近滚动滚轮可切换灵动岛状态' })
    : isMusic
      ? t('guide.hints.musicWheel', { defaultValue: '滚动查看更多音乐功能' })
      : isTools
        ? t('guide.hints.toolsWheel', { defaultValue: '滚动查看更多实用工具' })
        : t('guide.hints.settingsWheel', { defaultValue: '滚动查看个性化设置' });

  return (
    <div className="guide-content" onClick={(e) => e.stopPropagation()}>
      {current.interactive ? (
        <GuideInteractivePage
          page={page}
          cards={cards}
          cardIndex={cardIndex}
          hint={hint}
          animDir={animDirRef.current}
          onWheel={handleCardWheel}
          renderMini={(safeIdx) => {
            if (isBasic) return <MiniIsland demo={interactionCards[safeIdx].demo} />;
            if (isMusic) return <MiniMusicIsland demo={musicCards[safeIdx].demo} />;
            if (isTools) return <MiniToolIsland demo={toolCards[safeIdx].demo} />;
            return <MiniSettingIsland demo={settingCards[safeIdx].demo} />;
          }}
        />
      ) : (
        <GuideStaticPage
          page={page}
          current={current}
          t={t}
          onAuthLogin={() => void openAuthFromGuide('login')}
          onAuthRegister={() => void openAuthFromGuide('register')}
        />
      )}

      <GuideFooter
        t={t}
        page={page}
        isLast={isLast}
        pageCount={guidePages.length}
        onSelectPage={setPage}
        onFinish={handleFinish}
        onPrev={handlePrev}
        onNext={() => handleNext(handleFinish)}
      />
    </div>
  );
}
