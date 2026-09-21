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
 * @file CountdownDrawer.tsx
 * @description 倒数日页内侧拉编辑容器，保留底层列表位置并管理键盘焦点。
 * @author 鸡哥
 */

import { useEffect, useId, useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface CountdownDrawerProps {
  open: boolean;
  saving: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 从当前页面右侧滑入编辑容器，不卸载事件列表。
 * @param props - 面板状态与编辑内容
 * @param props.open - 面板是否展开
 * @param props.saving - 保存过程中禁止关闭
 * @param props.title - 新建或编辑标题
 * @param props.onClose - 关闭回调
 * @param props.children - 表单与预览
 * @returns 带遮罩和焦点管理的侧拉容器
 */
export function CountdownDrawer({ open, saving, title, onClose, children }: CountdownDrawerProps): ReactElement {
  const { t } = useTranslation();
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = drawerRef.current;
    const page = panel?.closest('.countdown-panel-v2');
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    panel?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      else page?.querySelector<HTMLButtonElement>('.cd-new-event')?.focus({ preventScroll: true });
    };
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!saving) onClose();
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
    event.stopPropagation();
  };

  return (
    <div className={`cd-drawer-layer${open ? ' is-open' : ''}`} inert={!open} aria-hidden={!open}>
      <button className="cd-drawer-backdrop" type="button" tabIndex={-1}
        aria-label={t('countdown.manage.closeEditor')} disabled={saving} onClick={onClose} />
      <aside className="cd-drawer" ref={drawerRef} role="dialog" aria-modal="true"
        aria-labelledby={titleId} onKeyDown={handleKeyDown}>
        <header className="cd-drawer-header">
          <h3 id={titleId}>{title}</h3>
          <button className="cd-drawer-close" type="button" disabled={saving} onClick={onClose}
            aria-label={t('countdown.manage.closeEditor')} title={t('countdown.manage.closeEditor')}>
            <X size={16} />
          </button>
        </header>
        <div className="cd-drawer-body" ref={bodyRef}>{children}</div>
      </aside>
    </div>
  );
}
