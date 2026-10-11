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
 * @file StandaloneWindowViewport.tsx
 * @description 独立窗口内容视口组件。
 * @author 鸡哥
 */

import { lazy, Suspense, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import type { WindowTab } from '../config/standaloneWindowConfig';

const TodoTab = lazy(() => import('../states/maxExpand/components/todo/components/TodoTab').then((module) => ({ default: module.TodoTab })));
const CountdownTab = lazy(() => import('../states/maxExpand/components/countdown').then((module) => ({ default: module.CountdownTab })));
const UrlFavoritesTab = lazy(() => import('../states/maxExpand/components/urlFavorites').then((module) => ({ default: module.UrlFavoritesTab })));
const AlbumTab = lazy(() => import('../states/maxExpand/components/album/components/AlbumTab').then((module) => ({ default: module.AlbumTab })));
const MailTab = lazy(() => import('../states/maxExpand/components/mail').then((module) => ({ default: module.MailTab })));
const LocalFileSearchTab = lazy(() => import('../states/maxExpand/components/localFileSearch/components/LocalFileSearchTab').then((module) => ({ default: module.LocalFileSearchTab })));
const ClipboardHistoryTab = lazy(() => import('../states/maxExpand/components/clipBoardHistory').then((module) => ({ default: module.ClipboardHistoryTab })));
const SettingsTab = lazy(() => import('../states/maxExpand/components/setting').then((module) => ({ default: module.SettingsTab })));
const MemoTab = lazy(() => import('../states/maxExpand/components/memo/components/MemoTab').then((module) => ({ default: module.MemoTab })));
const AlarmTab = lazy(() => import('../states/maxExpand/components/alarm/components/AlarmTab').then((module) => ({ default: module.AlarmTab })));
const ToolboxTab = lazy(() => import('../states/maxExpand/components/toolbox').then((module) => ({ default: module.ToolboxTab })));
const LoginContent = lazy(() => import('../states/login').then((module) => ({ default: module.LoginContent })));
const RegisterContent = lazy(() => import('../states/register/RegisterContent').then((module) => ({ default: module.RegisterContent })));
const ResetPasswordContent = lazy(() => import('../states/resetPassword').then((module) => ({ default: module.ResetPasswordContent })));
const PaymentContent = lazy(() => import('../states/payment/PaymentContent').then((module) => ({ default: module.PaymentContent })));
const MusicProvidersLoginContent = lazy(() => import('../states/musicProvidersLogin').then((module) => ({ default: module.MusicProvidersLoginContent })));

interface StandaloneWindowViewportProps {
  activeTab: WindowTab;
  state: string;
}

/**
 * @description 根据标签页渲染独立窗口内容。
 * @param props - 视口渲染参数。
 * @returns 独立窗口内容视口节点。
 */
export function StandaloneWindowViewport({ activeTab, state }: StandaloneWindowViewportProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="cw-viewport">
      <Suspense fallback={<div role="status">{t('standalone.loading')}</div>}>
        {activeTab === 'todo' && <TodoTab />}
        {activeTab === 'countdown' && <CountdownTab />}
        {activeTab === 'urlFavorites' && <UrlFavoritesTab />}
        {activeTab === 'album' && <AlbumTab />}
        {activeTab === 'mail' && <MailTab />}
        {activeTab === 'localFileSearch' && <LocalFileSearchTab />}
        {activeTab === 'clipboardHistory' && <ClipboardHistoryTab />}
        {activeTab === 'memo' && <MemoTab />}
        {activeTab === 'alarm' && <AlarmTab />}
        {activeTab === 'toolbox' && <ToolboxTab />}
        {activeTab === 'settings' && state === 'login' && <LoginContent />}
        {activeTab === 'settings' && state === 'register' && <RegisterContent />}
        {activeTab === 'settings' && state === 'resetPassword' && <ResetPasswordContent />}
        {activeTab === 'settings' && state === 'payment' && <PaymentContent />}
        {activeTab === 'settings' && state === 'musicProvidersLogin' && <MusicProvidersLoginContent />}
        {activeTab === 'settings' && state !== 'login' && state !== 'register' && state !== 'resetPassword' && state !== 'payment' && state !== 'musicProvidersLogin' && <SettingsTab />}
      </Suspense>
    </div>
  );
}
