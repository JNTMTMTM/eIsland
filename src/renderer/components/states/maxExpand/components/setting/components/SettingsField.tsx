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
 * @file SettingsField.tsx
 * @description AI 设置使用的受控单行输入字段
 * @author 鸡哥
 */

import type { ReactElement } from 'react';

interface SettingsFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
}

/**
 * 统一受控输入框，避免设置表单重复字段结构。
 * @param props - 标签、输入值和变更回调
 * @param props.label - 字段标签
 * @param props.value - 当前输入值
 * @param props.placeholder - 空值提示
 * @param props.type - 输入框类型，默认 text
 * @param props.onChange - 输入内容变化回调
 * @returns 设置输入字段
 */
export function SettingsField({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: SettingsFieldProps): ReactElement {
  return (
    <label className="settings-field">
      <span className="settings-field-label">{label}</span>
      <input
        className="settings-field-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
