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
 * @file stylelint-presets.mjs
 * @description 从工具 workspace 定位 Stylelint 18 预设，避免旧 SCSS 预设的传递依赖抢占版本。
 * @author 鸡哥
 */
import { fileURLToPath } from 'node:url';

/** 工具 workspace 显式声明的 CSS 与 SCSS 预设路径。 */
export const presets = [
  fileURLToPath(import.meta.resolve('stylelint-config-standard')),
  fileURLToPath(import.meta.resolve('stylelint-config-recommended-scss')),
];
/** 从工具 workspace 定位插件，兼容完整安装时的嵌套依赖布局。 */
export const plugins = [
  fileURLToPath(import.meta.resolve('@stylistic/stylelint-plugin')),
  fileURLToPath(import.meta.resolve('stylelint-order')),
];
export { default as standardScss } from 'stylelint-config-standard-scss';
