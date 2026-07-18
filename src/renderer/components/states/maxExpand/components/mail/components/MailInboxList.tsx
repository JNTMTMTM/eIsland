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
 * @file MailInboxList.tsx
 * @description 收件箱邮件列表。
 * @author 鸡哥
 */

import type { KeyboardEvent, ReactElement } from 'react';
import type { MailInboxListProps } from '../types/mailTypes';
import { formatMailDate, stopEventPropagation } from '../utils/mailUtils';

/**
 * 收件箱邮件列表
 * @param props - MailInboxListProps
 * @returns JSX.Element
 */
export function MailInboxList({
  inbox,
  expandedUid,
  hasSplit,
  loadingInbox,
  onToggleItem,
  t,
}: MailInboxListProps): ReactElement {
  const handleItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, uid: string): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggleItem(uid);
    }
  };

  return (
    <div
      className="settings-mail-tab-inbox-list"
      onWheel={stopEventPropagation}
    >
      {loadingInbox && inbox.length === 0 && (
        <div className="settings-mail-tab-loading">
          <div className="settings-mail-tab-loading-spinner" />
          <span>{t('mailTab.messages.loading', { defaultValue: '正在获取邮件…' })}</span>
        </div>
      )}
      {inbox.map((item) => (
        <div
          className={`settings-mail-tab-mail-item ${expandedUid === item.uid ? 'is-expanded' : ''}`}
          key={item.uid}
          onClick={() => onToggleItem(item.uid)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => handleItemKeyDown(event, item.uid)}
        >
          <div className="settings-mail-tab-mail-header">
            <span className="settings-mail-tab-mail-subject" title={item.subject}>
              {item.subject || t('mailTab.fallbacks.noSubject', { defaultValue: '(无主题)' })}
            </span>
            {!hasSplit && (
              <span className="settings-mail-tab-mail-from" title={item.from}>
                {item.from || t('mailTab.fallbacks.noSender', { defaultValue: '-' })}
              </span>
            )}
          </div>
          <div className="settings-mail-tab-mail-preview" title={item.preview || item.body || ''}>
            {item.preview || item.body || '-'}
          </div>
          {hasSplit && item.date && (
            <span className="settings-mail-tab-mail-date">{formatMailDate(item.date)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
