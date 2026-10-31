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
 * @file useTranslationLangSelect.ts
 * @description Expanded 翻译页语言下拉的开合、菜单定位与外部点击关闭。
 * @author 鸡哥
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { computeLangMenuStyle } from '../utils/translationUtils';
import type { UseTranslationLangSelectReturn } from '../types/translationTypes';

/**
 * 管理语言下拉的开合与菜单定位。
 * @param optionCount - 选项数量，用于计算菜单高度
 * @returns 开合状态、菜单样式与元素引用
 */
export function useTranslationLangSelect(optionCount: number): UseTranslationLangSelectReturn {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const containerRect = wrapperRef.current.closest('.translation-tab')?.getBoundingClientRect();
    const containerBottom = containerRect?.bottom ?? window.innerHeight;
    setMenuStyle(computeLangMenuStyle(rect, containerBottom, optionCount));
  }, [open, optionCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return { open, setOpen, menuStyle, wrapperRef, menuRef };
}
