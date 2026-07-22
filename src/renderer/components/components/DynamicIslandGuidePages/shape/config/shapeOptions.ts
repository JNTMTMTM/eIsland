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
 * @file shapeOptions.ts
 * @description 引导灵动岛形态设置步骤配置
 * @author 鸡哥
 */

import type { IslandShapeMode } from '../../../../../store/types';

/** 形态选项条目 */
export interface ShapeModeOption {
  /** 模式值 */
  value: IslandShapeMode;
  /** 显示名称 i18n key */
  labelKey: string;
  /** 描述 i18n key */
  descKey: string;
}

/** 灵动岛形态选项列表 */
export const SHAPE_MODE_OPTIONS: ShapeModeOption[] = [
  { value: 'notch', labelKey: 'guide.shape.notch', descKey: 'guide.shape.notchDesc' },
  { value: 'pill', labelKey: 'guide.shape.pill', descKey: 'guide.shape.pillDesc' },
];
