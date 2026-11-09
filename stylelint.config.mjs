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
 * @file stylelint.config.mjs
 * @description 按前端规范配置 CSS 和 SCSS 检查
 * @author 鸡哥
 */

import { plugins, presets, standardScss } from './scripts/lint/stylelint-presets.mjs';

// FRONTEND_STANDARDS §2：CSS/SCSS 由 Stylelint 检查，避免 ESLint 将样式当作 JS。
export default {
  plugins,
  // SCSS 标准预设仍继承 Stylelint 17 的 CSS 规则，改用兼容 18 的 CSS 预设。
  // 保留 SCSS 推荐预设和下方标准规则，单行声明数量由 Stylistic 继续检查。
  extends: presets,
  ignoreFiles: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/build/**', '**/coverage/**', '**/.temp/**', '**/.cache/**'],
  reportNeedlessDisables: true,
  reportDescriptionlessDisables: true,
  rules: {
    ...standardScss.rules,
    'selector-class-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    'selector-id-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    'keyframes-name-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    'custom-media-pattern': '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
    'selector-max-id': 0,
    'selector-max-class': 4,
    'selector-max-attribute': 2,
    'selector-max-combinators': 4,
    'selector-max-universal': 1,
    'selector-max-type': 2,
    'selector-no-qualifying-type': true,
    'selector-pseudo-element-colon-notation': 'double',
    'selector-type-case': 'lower',
    'selector-attribute-quotes': 'always',
    'color-hex-length': 'short',
    'color-named': 'never',
    'hue-degree-notation': 'angle',
    'length-zero-no-unit': true,
    'font-weight-notation': 'numeric',
    'shorthand-property-no-redundant-values': true,
    'declaration-block-no-shorthand-property-overrides': true,
    'property-no-vendor-prefix': true,
    'value-no-vendor-prefix': true,
    'at-rule-no-vendor-prefix': true,
    'media-feature-name-no-vendor-prefix': true,
    'declaration-no-important': true,
    'comment-whitespace-inside': 'always',
    'comment-empty-line-before': ['always', { except: ['first-nested'] }],
    'comment-no-empty': true,
    'no-empty-source': true,
    'block-no-empty': true,
    'no-duplicate-selectors': true,
    'no-duplicate-at-import-rules': true,
    'declaration-block-no-duplicate-properties': true,
    'color-no-invalid-hex': true,
    'string-no-newline': true,
    'unit-no-unknown': true,
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    'function-no-unknown': [true, { ignoreFunctions: ['theme', '--alpha', '--spacing'] }],
    // Tailwind v4 的合法语法；其余未知 @ 规则仍然报错。
    'scss/at-rule-no-unknown': [true, { ignoreAtRules: ['theme', 'utility', 'variant', 'custom-variant', 'source', 'reference', 'apply', 'config', 'plugin', 'tailwind'] }],
    '@stylistic/scss/indentation': 2,
    '@stylistic/scss/string-quotes': 'double',
    '@stylistic/scss/color-hex-case': 'lower',
    '@stylistic/scss/number-leading-zero': 'never',
    '@stylistic/scss/number-no-trailing-zeros': true,
    '@stylistic/scss/no-eol-whitespace': true,
    '@stylistic/scss/no-empty-first-line': true,
    '@stylistic/scss/no-missing-end-of-source-newline': true,
    '@stylistic/scss/max-empty-lines': 1,
    '@stylistic/scss/selector-combinator-space-before': 'always',
    '@stylistic/scss/selector-combinator-space-after': 'always',
    '@stylistic/scss/selector-list-comma-newline-after': 'always-multi-line',
    '@stylistic/scss/selector-list-comma-space-after': 'always-single-line',
    '@stylistic/scss/block-opening-brace-space-before': 'always',
    '@stylistic/scss/block-closing-brace-newline-after': 'always',
    '@stylistic/scss/block-closing-brace-newline-before': 'always-multi-line',
    '@stylistic/scss/block-closing-brace-empty-line-before': 'always-multi-line',
    '@stylistic/scss/declaration-colon-space-before': 'never',
    '@stylistic/scss/declaration-colon-space-after': 'always-single-line',
    '@stylistic/scss/declaration-block-trailing-semicolon': 'always',
    '@stylistic/scss/function-whitespace-after': 'always',
    '@stylistic/scss/function-comma-space-before': 'never',
    '@stylistic/scss/function-comma-space-after': 'always-single-line',
    '@stylistic/scss/function-parentheses-newline-inside': 'always-multi-line',
    '@stylistic/scss/media-feature-colon-space-before': 'never',
    '@stylistic/scss/media-feature-colon-space-after': 'always',
    '@stylistic/scss/media-feature-parentheses-space-inside': 'never',
    '@stylistic/scss/media-feature-range-operator-space-before': 'always',
    '@stylistic/scss/media-feature-range-operator-space-after': 'always',
    '@stylistic/scss/declaration-block-single-line-max-declarations': 1,
    'scss/at-mixin-argumentless-call-parentheses': 'always',
    'scss/at-function-named-arguments': 'never',
    'scss/at-mixin-named-arguments': 'never',
    'scss/at-extend-no-missing-placeholder': true,
    'scss/at-import-partial-extension-disallowed-list': ['scss', 'sass'],
    'scss/load-no-partial-leading-underscore': true,
    'scss/selector-no-redundant-nesting-selector': true,
    'scss/declaration-nested-properties-no-divided-groups': true,
    'scss/operator-no-unspaced': true,
    'scss/operator-no-newline-after': true,
    'scss/operator-no-newline-before': true,
    'order/order': ['custom-properties', 'dollar-variables', 'at-rules', 'declarations', 'rules'],
    'order/properties-order': [
      'composes', 'all',
      'position', 'inset', 'top', 'right', 'bottom', 'left', 'z-index',
      'box-sizing', 'display',
      'flex', 'flex-basis', 'flex-direction', 'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap',
      'grid', 'grid-area', 'grid-template', 'grid-template-areas', 'grid-template-columns', 'grid-template-rows', 'grid-auto-flow', 'grid-auto-columns', 'grid-auto-rows', 'grid-column', 'grid-row',
      'gap', 'row-gap', 'column-gap',
      'align-content', 'align-items', 'align-self', 'justify-content', 'justify-items', 'justify-self', 'place-content', 'place-items', 'place-self', 'order',
      'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'overflow', 'overflow-x', 'overflow-y',
      'font', 'font-family', 'font-size', 'font-style', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-decoration', 'text-overflow', 'white-space', 'word-break',
      'appearance', 'cursor', 'pointer-events', 'user-select',
      'background', 'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat',
      'border', 'border-width', 'border-style', 'border-color', 'border-radius', 'outline', 'outline-offset', 'box-shadow', 'opacity',
      'mask', 'mask-image', 'mask-position', 'mask-size', 'mask-repeat',
      'fill', 'stroke', 'stroke-width',
      'transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
      'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state',
      'transform', 'transform-origin', 'break-before', 'break-after', 'break-inside', 'orphans', 'widows',
    ],
  },
};
