/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * @file config.test.mjs
 * @description 用正反例验证规则加载、环境隔离及文档关键要求，防止配置静默失效
 * @author 鸡哥
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { ESLint } from 'eslint';
import { HtmlValidate } from 'html-validate';
import stylelint from 'stylelint';
import tseslint from 'typescript-eslint';

import htmlRules from './html-rules.cjs';

const HEADER = `/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file probe.ts
 * @description 检查规则测试样例
 * @author 鸡哥
 */
`;
const eslint = new ESLint({
  overrideConfig: [{
    ...tseslint.configs.disableTypeChecked,
    files: ['**/*.{ts,tsx}'],
  }],
});

test('基础规则检测 var、宽松相等、any 及危险构造器', async () => {
  const [result] = await eslint.lintText(`${HEADER}var value: any = 1\nif (value == 1) new Function('return 1');\n`, { filePath: 'test/lint-probe.ts' });
  const rules = new Set(result.messages.map(({ ruleId }) => ruleId));
  ['no-var', 'eqeqeq', '@typescript-eslint/no-explicit-any', 'no-new-func'].forEach((rule) => assert.ok(rules.has(rule), rule));
  assert.equal(result.fatalErrorCount, 0);
});

test('类型感知检查能发现悬空 Promise，声明文件不会因同名源码产生解析错误', async () => {
  const typed = new ESLint();
  // 使用已纳入 TS 项目的文件名提供类型上下文；lintText 不会改写该文件。
  const [result] = await typed.lintText(`${HEADER}export async function probe(): Promise<void> { Promise.resolve(1); }\n`, { filePath: 'vitest.config.ts' });
  assert.equal(result.fatalErrorCount, 0);
  assert.ok(result.messages.some(({ ruleId }) => ruleId === '@typescript-eslint/no-floating-promises'));
  const [declaration] = await typed.lintText(`${HEADER}export interface Probe { value: string; }\n`, { filePath: 'src/preload/index.d.ts' });
  assert.equal(declaration.fatalErrorCount, 0);
});

test('项目规则检测对象简写顺序和不合规文件名', async () => {
  const [result] = await eslint.lintText(`${HEADER}const value = 1;\nexport default { other: 2, value };\n`, { filePath: 'test/Bad_Name.ts' });
  ['project/shorthand-first', 'project/filename'].forEach((rule) => assert.ok(result.messages.some(({ ruleId }) => ruleId === rule), rule));
});

test('合规文件通过；版权、作者、导出箭头函数和私有类方法缺失均失败', async () => {
  const comments = new ESLint({ overrideConfigFile: 'scripts/lint/comments.config.mjs' });
  const valid = `${HEADER}/**
 * 根据输入计算下一值
 * @param value - 当前数值
 * @returns 增加一后的数值
 */
export function next(value: number): number { return value + 1; }
`;
  const [good] = await comments.lintText(valid, { filePath: 'test/lint-probe.ts' });
  assert.deepEqual(good.messages, []);
  const [bad] = await comments.lintText('export const next = async (value: number) => value + 1;\nclass Internal { run() { return 1; } }\n', { filePath: 'test/lint-probe.ts' });
  ['project/file-header', 'project/method-jsdoc', 'jsdoc/require-jsdoc'].forEach((rule) => assert.ok(bad.messages.some(({ ruleId }) => ruleId === rule), rule));
  const [wrongAuthor] = await comments.lintText(valid.replace('鸡哥', '其他作者'), { filePath: 'test/lint-probe.ts' });
  assert.ok(wrongAuthor.messages.some(({ ruleId }) => ruleId === 'project/file-header'));
});

test('禁用注释必须指定规则和原因，失效禁用也会失败', async () => {
  const [result] = await eslint.lintText('// eslint-disable-next-line\nvar value = 1;\n// eslint-disable-next-line no-eval -- 测试未使用的禁用\nexport default value;\n', { filePath: 'test/lint-probe.js' });
  assert.ok(result.messages.some(({ ruleId }) => ruleId === 'eslint-comments/no-unlimited-disable'));
  assert.ok(result.messages.some(({ ruleId }) => ruleId === 'eslint-comments/require-description'));
  assert.ok(result.messages.some(({ message }) => message.includes('Unused eslint-disable')));
});

test('React 检测 Hook 条件调用、props 扩散及缺失 alt', async () => {
  const [result] = await eslint.lintText(`${HEADER}import { useState } from 'react';
export default function Probe(props: { active: boolean }) {
  if (props.active) useState(0);
  return <img {...props} src="icon.png" />;
}
`, { filePath: 'web/eisland-web-issue-report/src/lint-probe.tsx' });
  ['react-hooks/rules-of-hooks', 'react/jsx-props-no-spreading', 'jsx-a11y/alt-text'].forEach((rule) => assert.ok(result.messages.some(({ ruleId }) => ruleId === rule), rule));
  assert.equal(result.fatalErrorCount, 0);
});

test('Node 和浏览器全局隔离，产物忽略而源码与声明文件纳入检查', async () => {
  const node = await eslint.calculateConfigForFile('src/main/index.ts');
  const browser = await eslint.calculateConfigForFile('src/renderer/App.tsx');
  assert.ok('process' in node.languageOptions.globals);
  assert.ok(!('window' in node.languageOptions.globals));
  assert.ok('window' in browser.languageOptions.globals);
  assert.ok(!('process' in browser.languageOptions.globals));
  assert.equal(await eslint.isPathIgnored('out/main/index.js'), true);
  assert.equal(await eslint.isPathIgnored('plugins/example/build/generated.js'), true);
  assert.equal(await eslint.isPathIgnored('src/preload/index.d.ts'), false);
  assert.equal(await eslint.isPathIgnored('plugins/example/index.js'), false);
  assert.equal(await eslint.isPathIgnored('sdk/src/index.ts'), false);
});

test('CSS 规则检测 important、颜色名、ID 选择器；文档格式样例通过', async () => {
  const result = await stylelint.lint({ code: '#test { color: red !important; }\n', codeFilename: 'src/renderer/styles/lint-probe.css' });
  const [css] = result.results;
  assert.deepEqual(css.invalidOptionWarnings, []);
  ['selector-max-id', 'color-named', 'declaration-no-important'].forEach((rule) => assert.ok(css.warnings.some((warning) => warning.rule === rule), rule));
  const good = await stylelint.lint({ code: '.example {\n  color: #fff;\n\n}\n', codeFilename: 'src/renderer/styles/lint-probe.css' });
  assert.equal(good.errored, false, JSON.stringify(good.results.map(({ warnings }) => warnings)));
});

test('HTML 检测大写 doctype、缺失语言和图片替代文本', async () => {
  const config = JSON.parse(await readFile('.htmlvalidate.json', 'utf8'));
  const validator = new HtmlValidate({ ...config, plugins: [htmlRules] });
  const bad = await validator.validateString('<!DOCTYPE html><html><head><title>Test</title></head><body><img src="icon.png"></body></html>');
  ['doctype-style', 'element-required-attributes', 'wcag/h37'].forEach((rule) => assert.ok(bad.results[0].messages.some(({ ruleId }) => ruleId === rule), rule));
  const good = await validator.validateString('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>测试</title></head><body><main><h1>测试</h1></main></body></html>');
  assert.equal(good.valid, true, JSON.stringify(good.results));
  const unsafe = await validator.validateString('<!doctype html><html lang="zh-CN"><head><title>测试</title></head><body><button type="button" class="item" onclick="run()">测试</button></body></html>');
  assert.equal(unsafe.results[0].messages.filter(({ ruleId }) => ruleId === 'eisland/document-standards').length, 3);
});
