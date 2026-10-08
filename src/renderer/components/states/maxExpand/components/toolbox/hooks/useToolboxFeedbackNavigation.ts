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
 * @file useToolboxFeedbackNavigation.ts
 * @description 复用工具箱软件反馈的设置页跳转与独立窗口导航事件。
 * @author 鸡哥
 */

import useIslandStore from '../../../../../../store/slices';

/**
 * 生成软件反馈导航操作，保持现有两类窗口的事件顺序。
 * @returns 打开设置反馈页面的回调。
 */
export function useToolboxFeedbackNavigation(): () => void {
  const { setMaxExpandTab } = useIslandStore();
  const handleSoftwareFeedbackNavigate = (): void => {
    setMaxExpandTab('settings');
    window.dispatchEvent(new CustomEvent('standalone-tab-switch', { detail: 'settings' }));
    window.dispatchEvent(new CustomEvent('settings-open-tab-intent', { detail: 'about-feedback' }));
  };
  return handleSoftwareFeedbackNavigate;
}
