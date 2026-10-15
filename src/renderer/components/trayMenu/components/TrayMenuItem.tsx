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
 * @file TrayMenuItem.tsx
 * @description 托盘菜单的单个可点击项，支持复选状态与警示样式
 * @author 鸡哥
 */

import type { ReactElement } from 'react';

interface TrayMenuItemProps {
  /** 显示文案 */
  label: string;
  /** 复选状态；undefined 表示普通菜单项 */
  checked?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否为危险操作 */
  danger?: boolean;
  /** 点击回调 */
  onSelect: () => void;
}

/**
 * 托盘菜单项
 * @param props - 组件属性
 * @param props.label - 显示文案
 * @param props.checked - 复选状态，undefined 表示普通菜单项
 * @param props.disabled - 是否禁用
 * @param props.danger - 是否为危险操作
 * @param props.onSelect - 点击回调
 * @returns 菜单项元素
 */
export function TrayMenuItem({ label, checked, disabled = false, danger = false, onSelect }: TrayMenuItemProps): ReactElement {
  const isCheckbox = checked !== undefined;
  return (
    <button
      type="button"
      className={`tray-menu-item${danger ? ' tray-menu-item-danger' : ''}`}
      role={isCheckbox ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={isCheckbox ? checked : undefined}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="tray-menu-item-label">{label}</span>
      {checked && <span className="tray-menu-item-check" aria-hidden="true" />}
    </button>
  );
}
