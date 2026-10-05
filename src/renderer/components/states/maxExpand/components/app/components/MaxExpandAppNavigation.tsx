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
 * @file MaxExpandAppNavigation.tsx
 * @description 保留应用导航层，在图标与应用内容之间执行成对缩放过渡。
 * @author 鸡哥
 */

import MaxExpandAppControls from '../../MaxExpandAppControls';
import { useAppNavigationTransition } from '../hooks/useAppNavigationTransition';
import MaxExpandAppLauncher from './MaxExpandAppLauncher';
import type { ReactElement, ReactNode } from 'react';
import type { MaxExpandTab } from '../../../../../../store/types';

interface MaxExpandAppNavigationProps {
  activeTab: MaxExpandTab;
  launcherVisible: boolean;
  animationEnabled: boolean;
  contentActive: boolean;
  onSelectApp: (tab: MaxExpandTab) => void;
  onBackToLauncher: () => void;
  children: ReactNode;
}

/**
 * 渲染固定尺寸的应用舞台，保留导航滚动位置供返回时定位原图标。
 * @param props - 当前应用、导航状态、动画偏好及页面内容。
 * @param props.activeTab - 当前应用标识。
 * @param props.launcherVisible - 是否显示应用导航页。
 * @param props.animationEnabled - 是否启用页面切换动画。
 * @param props.contentActive - MaxExpand 内容是否处于活动状态。
 * @param props.onSelectApp - 切换到指定应用。
 * @param props.onBackToLauncher - 返回应用导航页。
 * @param props.children - 当前应用的内容。
 * @returns 导航层与应用层。
 */
export default function MaxExpandAppNavigation({
  activeTab, launcherVisible, animationEnabled, contentActive, onSelectApp, onBackToLauncher, children,
}: MaxExpandAppNavigationProps): ReactElement {
  const { stageRef, launcherRef, applicationRef, transition, selectApp, backToLauncher } = useAppNavigationTransition({
    activeTab, launcherVisible, animationEnabled, contentActive, onSelectApp, onBackToLauncher,
  });
  const transitioning = transition !== null;

  return (
    <div className="max-expand-app-stage" ref={stageRef}
      data-launcher-visible={launcherVisible}
      data-transition={transition?.direction}
    >
      <div className="max-expand-app-launcher-layer" ref={launcherRef}
        inert={!launcherVisible || transitioning}
        aria-hidden={!launcherVisible || transitioning}
      >
        <MaxExpandAppLauncher onSelectApp={selectApp} transitionTab={transition?.tab}
          interactive={launcherVisible && !transitioning && contentActive}
        />
      </div>
      {!launcherVisible && (
        <div className="max-expand-app-application-layer" ref={applicationRef} inert={transitioning}>
          <div className="max-expand-tab-transition" key={activeTab}>{children}</div>
          <MaxExpandAppControls activeTab={activeTab} onBackToLauncher={backToLauncher} />
        </div>
      )}
    </div>
  );
}
