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
 * @file comments.config.mjs
 * @description 复用主配置的注释规则，保持 comment:check 与完整检查一致
 * @author 鸡哥
 */

import config from './eslint.config.mjs';

export default config.map((entry) => ({
  ...entry,
  // 只启用注释规则时，不将针对其他规则的合法禁用误报为“未使用”。
  ...(entry.linterOptions && {
    linterOptions: { reportUnusedDisableDirectives: 'off', reportUnusedInlineConfigs: 'off' },
  }),
  ...(entry.languageOptions?.parserOptions && {
    languageOptions: {
      ...entry.languageOptions,
      parserOptions: { ...entry.languageOptions.parserOptions, project: false },
    },
  }),
  ...(entry.rules && {
    rules: Object.fromEntries(Object.entries(entry.rules).filter(([name]) =>
      name.startsWith('jsdoc/') || ['project/file-header', 'project/method-jsdoc'].includes(name))),
  }),
}));
