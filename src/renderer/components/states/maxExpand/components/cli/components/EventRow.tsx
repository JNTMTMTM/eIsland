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
 * @file EventRow.tsx
 * @description CLI 事件卡片组件
 * @author 鸡哥
 */

import { useState, useRef, useCallback, useMemo, type ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { STOP_EVENTS, PERMISSION_EVENTS } from '../config/cliConstants';
import { formatTime, detailLabel } from '../utils/cliFormatters';
import useCollapsibleContent from '../hooks/useCollapsibleContent';
import type { EventRowProps } from '../types/types';

/**
 * 单条 CLI 事件卡片
 * @param props - 组件属性
 * @param props.event - 当前事件及完整详情
 * @param props.t - 翻译函数
 * @param props.showPermission - 是否显示待处理授权操作
 * @returns 事件卡片 React 元素
 */
export function EventRow({ event, t, showPermission }: EventRowProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const detailsMounted = useCollapsibleContent(expanded, 260);
  const cardRef = useRef<HTMLDivElement>(null);
  // IPC 会为每次快照复制事件对象；摘要未变化时避免重复运行 Markdown 解析器。
  const summary = useMemo(() => <ReactMarkdown>{event.summary}</ReactMarkdown>, [event.summary]);
  const visibleDetails = (event.detailItems ?? []).filter((item) => item.value);
  const hasExtra = visibleDetails.length > 0 || event.toolName || event.toolInputPreview;
  const handleToggle = useCallback(() => {
    setExpanded((v) => !v);
  }, []);

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;
    gsap.fromTo(
      card,
      { autoAlpha: 0, y: 10, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.28, ease: 'power2.out' },
    );
  }, { scope: cardRef });

  return (
    <div ref={cardRef} className={`cli-event-card${STOP_EVENTS.has(event.eventName) ? ' cli-event-card--stop' : ''}${PERMISSION_EVENTS.has(event.eventName) ? ' cli-event-card--permission' : ''}`}>
      <div className="cli-event-card-header">
        <span className="cli-event-card-name">{event.eventName}</span>
        <div className="cli-event-card-header-right">
          {event.toolName && <span className="cli-event-card-tool-tag">{event.toolName}</span>}
          <span className="cli-event-card-time">{formatTime(event.createdAt)}</span>
        </div>
      </div>
      <div className="cli-event-card-body">{summary}</div>
      {showPermission && (
        <div className="cli-event-card-permission">
          <button
            type="button"
            className="cli-event-card-permission-btn cli-event-card-permission-deny"
            onClick={() => { void window.api.claudeCodePermissionResolve(event.sessionId, 'deny'); }}
          >
            {t('cli.permission.deny', { defaultValue: '拒绝' })}
          </button>
          <button
            type="button"
            className="cli-event-card-permission-btn cli-event-card-permission-allow"
            onClick={() => { void window.api.claudeCodePermissionResolve(event.sessionId, 'allow'); }}
          >
            {t('cli.permission.allow', { defaultValue: '批准' })}
          </button>
          <button
            type="button"
            className="cli-event-card-permission-btn cli-event-card-permission-always"
            onClick={() => { void window.api.claudeCodePermissionResolve(event.sessionId, 'always'); }}
          >
            {t('cli.permission.always', { defaultValue: '永久批准' })}
          </button>
        </div>
      )}
      {hasExtra && (
        <div className="cli-event-card-details">
          <button type="button" className="cli-event-card-details-toggle" onClick={handleToggle}>
            <span className="cli-event-card-details-label">{expanded ? t('maxExpand.cli.collapse', { defaultValue: '收起' }) : t('maxExpand.cli.expand', { defaultValue: '展开' })}</span>
            {event.toolInputPreview && <code onClick={(e) => e.stopPropagation()}>{event.toolInputPreview}</code>}
          </button>
          <div className={`cli-event-card-details-content${expanded ? ' is-open' : ''}`}>
            <div className="cli-event-card-details-inner">
              {detailsMounted && visibleDetails.map((item) => (
                <div className="cli-event-card-detail-item" key={item.label}>
                  <span>{detailLabel(item.label, t)}</span>
                  <pre>{item.value}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
