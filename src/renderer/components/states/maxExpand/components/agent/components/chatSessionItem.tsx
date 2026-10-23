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
 * @file chatSessionItem.tsx
 * @description 基于会话摘要缓存历史卡片，流式正文更新不触发日期格式化与卡片重渲染。
 * @author 鸡哥
 */

/* eslint-disable better-tailwindcss/no-unknown-classes -- 复用聊天页面现有的会话卡片 CSS 类。 */

import { memo, useCallback, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgIcon } from '../../../../../../utils/SvgIcon';
import type { SessionCardState } from '../types/chatTypes';

/** 仅传递卡片显示字段，不传递每个流式片段都会变化的会话对象。 */
interface ChatSessionItemProps {
  id: string;
  title: string;
  updatedAt: number;
  active: boolean;
  status: SessionCardState;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * 渲染可复用的会话卡片。
 * @param props - 会话摘要和稳定的交互回调。
 * @returns 会话选择按钮。
 */
function ChatSessionItem(props: ChatSessionItemProps): ReactElement {
  const { id, title, updatedAt, active, status, onSelect, onDelete } = props;
  const { t } = useTranslation();
  const handleSelect = useCallback((): void => onSelect(id), [id, onSelect]);
  const handleDelete = useCallback((event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    onDelete(id);
  }, [id, onDelete]);
  const handleDeleteKeyDown = useCallback((event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') handleDelete(event);
  }, [handleDelete]);
  return (
    <button type="button"
      className={`max-expand-chat-session-item ${active ? 'active' : ''} status-${status}`}
      onClick={handleSelect}
    >
      <span className="max-expand-chat-session-item-main">
        <span className="max-expand-chat-session-item-title">{title || t('aiChat.session.untitled', { defaultValue: '新对话' })}</span>
        <span className="max-expand-chat-session-item-time">{new Date(updatedAt).toLocaleString()}</span>
      </span>
      <span className="max-expand-chat-session-item-actions">
        <span className="max-expand-chat-session-delete"
          role="button"
          tabIndex={0}
          onKeyDown={handleDeleteKeyDown}
          aria-label={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
          title={t('aiChat.actions.deleteSession', { defaultValue: '删除会话' })}
          onClick={handleDelete}
        >
          <img src={SvgIcon.DELETE} alt="" />
        </span>
      </span>
    </button>
  );
}

export default memo(ChatSessionItem);

/* eslint-enable better-tailwindcss/no-unknown-classes -- 恢复项目默认规则。 */
