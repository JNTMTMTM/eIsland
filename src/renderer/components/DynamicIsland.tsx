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
 * @file DynamicIsland.tsx
 * @description 灵动岛主组件，使用状态模式管理 idle/hover/expanded 等状态
 * @author 鸡哥
 */

import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import useIslandStore from '../store/isLandStore';
import { DynamicIslandBackground } from './components/DynamicIslandBackground';
import { DynamicIslandStateContent } from './components/DynamicIslandStateContent';
import IslandContentTransition from './components/islandContentTransition';
import MaxExpandTransitionLoading from './states/maxExpand/maxExpandTransitionLoading';
import ExpandedTransitionLoading from './states/expand/expandedTransitionLoading';
import { usePerformanceMode } from './states/maxExpand/hooks/usePerformanceMode';
import { useDynamicIslandCoordinator } from './hooks/useDynamicIslandCoordinator';
import selectDynamicIslandState from './utils/selectDynamicIslandState';

export type { IslandState } from './hooks/useDynamicIslandShell';
export { AI_CHAT_CLIPBOARD_URL_EVENT, getStateClassName, STATE_CONFIGS } from './config/dynamicIslandConfig';

/**
 * 灵动岛主组件
 * @description 使用状态模式管理不同状态的 UI 渲染
 */
function DynamicIsland(): JSX.Element {
  const { t, i18n } = useTranslation();
  const store = useIslandStore(useShallow(selectDynamicIslandState));
  const performanceModeEnabled = usePerformanceMode();
  const {
    state,
    weather,
    timerData,
    notification,
    pomodoroRunning,
    pomodoroRemaining,
  } = store;

  const {
    handleIslandClick,
    shellClassName,
    shellStyle,
    timeStr,
    dayStr,
    fullTimeStr,
    lunarStr,
    bgMedia,
    bgVideoElementRef,
    bgVideoHwDecode,
    bgVideoMuted,
    bgVideoVolume,
    bgVideoFit,
    handleVideoLoadedMetadata,
    handleVideoCanPlay,
  } = useDynamicIslandCoordinator({
    store,
    t,
    language: i18n.resolvedLanguage,
  });

  let loadingFallback: JSX.Element | null = null;
  if (state === 'maxExpand') loadingFallback = <MaxExpandTransitionLoading />;
  if (state === 'expanded') loadingFallback = <ExpandedTransitionLoading />;

  return (
    <div
      className={shellClassName}
      onClick={handleIslandClick}
      style={shellStyle}
    >
      <DynamicIslandBackground
        bgMedia={bgMedia}
        bgVideoElementRef={bgVideoElementRef}
        bgVideoHwDecode={bgVideoHwDecode}
        bgVideoMuted={bgVideoMuted}
        bgVideoVolume={bgVideoVolume}
        bgVideoFit={bgVideoFit}
        onVideoLoadedMetadata={handleVideoLoadedMetadata}
        onVideoCanPlay={handleVideoCanPlay}
      />
      <IslandContentTransition state={state}
        animationSpeed={store.animationSpeed}
        springAnimation={store.springAnimation}
        performanceModeEnabled={performanceModeEnabled}
        fallback={loadingFallback}
      >
        <DynamicIslandStateContent
          state={state}
          timeStr={timeStr}
          dayStr={dayStr}
          weather={weather}
          timerState={timerData?.state ?? 'idle'}
          remainingSeconds={timerData?.remainingSeconds ?? 0}
          pomodoroRunning={pomodoroRunning}
          pomodoroRemaining={pomodoroRemaining}
          fullTimeStr={fullTimeStr}
          lunarStr={lunarStr}
          notification={notification}
        />
      </IslandContentTransition>
    </div>
  );
}

export default DynamicIsland;
