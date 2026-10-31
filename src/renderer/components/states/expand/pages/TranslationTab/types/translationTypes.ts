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
 * @file translationTypes.ts
 * @description Expanded 翻译页语言下拉的选项、组件入参与 hook 返回值类型。
 * @author 鸡哥
 */

import type { CSSProperties, Dispatch, RefObject, SetStateAction } from 'react';

/** 语言选项 */
export interface TranslationLanguageOption {
  code: string;
  labelKey: string;
}

/** 语言对应的图标，flag 为国旗时不应用主题滤镜 */
export interface TranslationLanguageIcon {
  flag: string | undefined;
  icon: string | undefined;
}

/** TranslationLangSelect 组件入参 */
export interface TranslationLangSelectProps {
  options: readonly TranslationLanguageOption[];
  value: string;
  onChange: (code: string) => void;
}

/** useTranslationLangSelect hook 返回值类型 */
export interface UseTranslationLangSelectReturn {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  menuStyle: CSSProperties;
  wrapperRef: RefObject<HTMLDivElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
}
