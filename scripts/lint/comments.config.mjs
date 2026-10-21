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

/** 注释检查实际执行规则的插件。 */
const COMMENT_PLUGINS = new Set(['jsdoc', 'project']);
const stubbedPlugins = new WeakMap();

/**
 * 将插件规则替换为保留 schema 的空实现。
 * @description 源码可用行内配置启用类型感知规则，而注释检查关闭了类型信息，空实现避免这类规则加载时崩溃。
 * @param {import('eslint').ESLint.Plugin} plugin - 原插件
 * @returns {import('eslint').ESLint.Plugin} 规则均为空实现的插件，同一插件复用同一实例以免重复注册
 */
function stubRules(plugin) {
  if (!stubbedPlugins.has(plugin)) {
    const emptyRules = Object.fromEntries(Object.entries(plugin.rules ?? {}).map(([name, rule]) => [
      name, { meta: rule.meta, create: () => ({}) },
    ]));
    stubbedPlugins.set(plugin, { ...plugin, rules: emptyRules });
  }
  return stubbedPlugins.get(plugin);
}

export default config.map((entry) => ({
  ...entry,
  ...(entry.plugins && {
    plugins: Object.fromEntries(Object.entries(entry.plugins).map(([name, plugin]) => [
      name, COMMENT_PLUGINS.has(name) ? plugin : stubRules(plugin),
    ])),
  }),
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
