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
 * @file TrayUserCard.tsx
 * @description 托盘菜单顶部的用户信息卡片，Pro 用户沿用用户中心信息卡片的金色样式
 * @author 鸡哥
 */

import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../utils/SvgIcon';
import type { TrayUserSummary } from '../types';

interface TrayUserCardProps {
  /** 当前用户摘要 */
  user: TrayUserSummary;
}

/**
 * 托盘用户信息卡片
 * @param props - 组件属性
 * @param props.user - 当前用户摘要
 * @returns 卡片元素
 */
export function TrayUserCard({ user }: TrayUserCardProps): ReactElement {
  const { t } = useTranslation();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const showAvatar = Boolean(user.avatar) && user.avatar !== failedAvatar;
  const name = user.loggedIn ? user.name : t('tray.notLoggedIn');
  const detail = !user.loggedIn
    ? t('tray.loginHint')
    : user.isPro && user.proExpireDate
      ? t('tray.proExpireAt', { date: user.proExpireDate })
      : user.email;

  return (
    <div className={`tray-user-card${user.isPro ? ' tray-user-card-pro' : ''}`}>
      <div className="tray-user-card-avatar">
        {showAvatar
          ? <img src={user.avatar ?? ''} alt={name} onError={() => setFailedAvatar(user.avatar)} />
          : <span className="tray-user-card-avatar-placeholder">{user.loggedIn ? name.slice(0, 1) : '?'}</span>}
      </div>
      <div className="tray-user-card-identity">
        <div className="tray-user-card-name">
          {user.isPro && <img className="tray-user-card-pro-icon" src={SvgIcon.PRO} alt="PRO" />}
          <span className="tray-user-card-name-text">{name}</span>
        </div>
        {detail && <div className="tray-user-card-detail">{detail}</div>}
      </div>
    </div>
  );
}
