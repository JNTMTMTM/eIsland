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
 * @file MailReader.tsx
 * @description 邮件正文阅读器（iframe 渲染）。
 * @author 鸡哥
 */

import type { ReactElement } from 'react';
import type { MailReaderProps } from '../types/mailTypes';
import { buildMailSrcDoc, stopEventPropagation } from '../utils/mailUtils';

/**
 * 邮件正文阅读器
 * @param props - MailReaderProps
 * @returns JSX.Element
 */
export function MailReader({ item, t }: MailReaderProps): ReactElement {
  return (
    <div
      className="settings-mail-tab-reader"
      onClick={stopEventPropagation}
      onKeyDown={stopEventPropagation}
      onWheel={stopEventPropagation}
      role="presentation"
    >
      <div className="settings-mail-tab-reader-header">
        <span className="settings-mail-tab-reader-subject">
          {item.subject || t('mailTab.fallbacks.noSubject', { defaultValue: '(无主题)' })}
        </span>
        <span className="settings-mail-tab-reader-meta">
          {item.from || t('mailTab.fallbacks.noSender', { defaultValue: '-' })}
        </span>
      </div>
      <iframe
        className="settings-mail-tab-mail-body"
        sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
        srcDoc={buildMailSrcDoc(item.body || item.preview || '-')}
        title={item.subject || ''}
      />
    </div>
  );
}
