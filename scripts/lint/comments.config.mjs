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
