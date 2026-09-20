/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * @file eslint.config.mjs
 * @description 按 docs 前端与注释规范配置分环境、类型感知的 ESLint 检查
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';

import comments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import tailwind from 'eslint-plugin-better-tailwindcss';
import importX from 'eslint-plugin-import-x';
import jsdoc from 'eslint-plugin-jsdoc';
import a11y from 'eslint-plugin-jsx-a11y';
import promise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import project from './project-rules.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CODE = ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'];
const TYPESCRIPT = ['**/*.{ts,mts,cts,tsx}'];

export default defineConfig([
  {
    // 仅排除产物、工具元数据及第三方拷贝，不按历史违规程度排除业务源码。
    ignores: [
      '**/node_modules/**', '**/dist/**', '**/out/**', '**/build/**', '**/coverage/**',
      '**/.git/**', '**/.codegraph/**', '**/.temp/**', '**/.cache/**', '**/.next/**',
      '.agents/**', '.claude/**', '.cursor/**', '.gemini/**', '.kiro/**',
      'resources/qishui-auth-v6/bdms.js', 'resources/qishui-auth-v6/react.js',
      'resources/qishui-auth-v6/react-dom.js',
    ],
  },
  {
    files: CODE,
    extends: [js.configs.recommended],
    plugins: {
      jsdoc,
      promise,
      project,
      '@stylistic': stylistic,
      'import-x': importX,
      'eslint-comments': comments,
    },
    linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' },
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    settings: {
      jsdoc: { mode: 'typescript' },
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: `${ROOT}/tsconfig.eslint.json` })],
    },
    rules: {
      // FRONTEND_STANDARDS §3：语法、模块、异步与安全。
      'no-var': 'error',
      'prefer-const': 'error',
      'one-var': ['error', 'never'],
      'no-use-before-define': 'error',
      'no-undef-init': 'error',
      'no-new-wrappers': 'error',
      'no-object-constructor': 'error',
      'no-array-constructor': 'error',
      'object-shorthand': ['error', 'always'],
      'project/shorthand-first': 'error',
      'project/filename': 'error',
      'prefer-object-spread': 'error',
      'array-callback-return': 'error',
      'prefer-spread': 'error',
      'prefer-destructuring': ['error', { array: true, object: true }],
      'prefer-template': 'error',
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
      'default-param-last': 'error',
      'no-param-reassign': ['error', { props: true }],
      'prefer-rest-params': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'max-classes-per-file': ['error', 1],
      'dot-notation': 'error',
      eqeqeq: ['error', 'always'],
      'no-else-return': 'error',
      curly: ['error', 'multi-line'],
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-case-declarations': 'error',
      'no-implicit-coercion': 'error',
      radix: ['error', 'always'],
      'prefer-promise-reject-errors': 'error',
      'no-await-in-loop': 'error',
      'no-unsafe-finally': 'error',
      'prefer-regex-literals': 'error',
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      'no-restricted-globals': ['error', 'isNaN', 'isFinite'],
      'no-restricted-syntax': [
        'error',
        { selector: 'ForInStatement', message: '§3.11：使用数组高阶函数代替 for…in。' },
        { selector: 'ForOfStatement', message: '§3.11：使用数组高阶函数代替 for…of。' },
        { selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]', message: '§3.24：DOM HTML 写入必须审查清理过程，并在最小范围说明例外。' },
      ],
      'import-x/first': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/no-commonjs': 'error',
      'import-x/prefer-default-export': 'error',
      'import-x/order': ['error', { groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'] }],
      'import-x/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never', ts: 'never', tsx: 'never', mjs: 'always', cjs: 'always' }],
      'promise/catch-or-return': 'error',
      'promise/no-nesting': 'error',
      'promise/prefer-await-to-then': 'error',
      'eslint-comments/no-unlimited-disable': 'error',
      'eslint-comments/require-description': 'error',
      'eslint-comments/no-unused-enable': 'error',
      'eslint-comments/disable-enable-pair': 'error',
      // §3.15、§4.2：显式配置，避免格式化工具默认值覆盖文档。
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      '@stylistic/jsx-quotes': ['error', 'prefer-double'],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/arrow-parens': ['error', 'always'],
      '@stylistic/space-before-blocks': 'error',
      '@stylistic/keyword-spacing': 'error',
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
      '@stylistic/function-call-spacing': ['error', 'never'],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/eol-last': ['error', 'always'],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
      '@stylistic/newline-per-chained-call': ['error', { ignoreChainWithDepth: 3 }],
      '@stylistic/lines-between-class-members': ['error', 'always'],
      '@stylistic/spaced-comment': ['error', 'always', { markers: ['/'], block: { balanced: true } }],
      // COMMENT_STANDARDS：不自动生成空壳注释，要求作者补充真实语义。
      'project/method-jsdoc': 'error',
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        enableFixer: false,
        checkGetters: false,
        checkSetters: false,
        require: { FunctionDeclaration: true, FunctionExpression: true, ArrowFunctionExpression: true, ClassDeclaration: true, ClassExpression: true },
      }],
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/require-description': 'error',
      'jsdoc/require-param': ['error', { enableFixer: false }],
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-hyphen-before-param-description': ['error', 'always'],
      'jsdoc/require-returns': ['error', { enableFixer: false }],
      'jsdoc/require-returns-description': 'error',
    },
  },
  {
    files: ['*.{js,mjs,cjs,ts}', 'scripts/**', 'test/**', 'src/main/**', 'src/preload/**', 'plugins/**', 'sdk/**', 'web/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/renderer/**', 'resources/**/*.js', 'web/**/src/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Native 插件及部分工具文件由 Node require 加载，不能强制转成 ESM。
    files: ['**/*.cjs', 'plugins/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
    rules: { 'import-x/no-commonjs': 'off' },
  },
  {
    files: TYPESCRIPT,
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { project: './tsconfig.eslint.json', tsconfigRootDir: ROOT } },
    rules: {
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      'default-param-last': 'off',
      '@typescript-eslint/default-param-last': 'error',
      'dot-notation': 'off',
      '@typescript-eslint/dot-notation': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/return-await': ['error', 'never'],
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/naming-convention': ['error',
        { selector: 'variableLike', format: ['camelCase', 'PascalCase', 'UPPER_CASE'], leadingUnderscore: 'forbid', trailingUnderscore: 'forbid' },
        { selector: 'typeLike', format: ['PascalCase'] },
      ],
      'project/file-header': 'error',
      'jsdoc/no-types': 'error',
    },
  },
  {
    // TS 编译器会丢弃与 .ts 同名的 .d.ts；声明文件仍进行完整语法和注释检查。
    files: ['**/*.d.{ts,mts,cts}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{jsx,tsx}'],
    extends: [react.configs.flat.recommended, react.configs.flat['jsx-runtime'], a11y.flatConfigs.recommended],
    plugins: { 'react-hooks': hooks },
    settings: { react: { version: '19.2' } },
    rules: {
      // TS 已负责 props 类型检查；采用 React 17+ JSX runtime。
      'react/prop-types': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/function-component-definition': ['error', { namedComponents: ['function-declaration', 'function-expression'], unnamedComponents: 'arrow-function' }],
      'react/jsx-boolean-value': ['error', 'never'],
      'react/self-closing-comp': 'error',
      'react/jsx-tag-spacing': ['error', { beforeSelfClosing: 'always' }],
      'react/jsx-wrap-multilines': ['error', { declaration: 'parens-new-line', assignment: 'parens-new-line', return: 'parens-new-line' }],
      'react/jsx-first-prop-new-line': ['error', 'never'],
      'react/jsx-indent-props': ['error', 2],
      'react/jsx-curly-spacing': ['error', { when: 'never' }],
      'react/destructuring-assignment': ['error', 'always'],
      'react/jsx-props-no-spreading': 'error',
      'react/no-array-index-key': 'error',
      'react/jsx-pascal-case': 'error',
      'react/hook-use-state': 'error',
      'react/jsx-no-bind': 'error',
      'react/no-unstable-nested-components': 'error',
      'react/no-danger': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': ['error', { allowReferrer: false, enforceDynamicLinks: 'always' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    plugins: { 'better-tailwindcss': tailwind },
    settings: { 'better-tailwindcss': { entryPoint: `${ROOT}/src/renderer/styles/reset/reset.css` } },
    rules: {
      'better-tailwindcss/enforce-consistent-class-order': ['error', { order: 'official' }],
      'better-tailwindcss/enforce-shorthand-classes': 'error',
      'better-tailwindcss/no-restricted-classes': ['error', { restrict: [{ pattern: '(?:^|:)[a-z][\\w-]*-\\[-', message: '§2.1.4：负任意值的负号应写在方括号外。' }] }],
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/no-conflicting-classes': 'error',
      'better-tailwindcss/no-duplicate-classes': 'error',
    },
  },
]);
