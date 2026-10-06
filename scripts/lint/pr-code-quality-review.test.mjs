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
 * @file pr-code-quality-review.test.mjs
 * @description 直接运行 PR 工作流原始检查脚本，验证真实违规、误报及规则豁免，不访问 GitHub 或执行待审代码
 * @author 鸡哥
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const workflow = readFileSync(new URL('../../.github/workflows/pr-code-quality-review.yml', import.meta.url), 'utf8');
const [, scriptSection] = workflow.split(/^ {10}script: \|/mu);
const [scriptBlock] = scriptSection.split(/\r?\n {6}- name:/u);
const script = scriptBlock.split(/\r?\n/u).slice(1).map((line) => line.replace(/^ {12}/u, ''))
  .join('\n');

/**
 * 用文件内容夹具替换 GitHub 读取，并收集真实脚本生成的报告及输出。
 * @param files - 路径到文件内容的映射；null 模拟内容读取失败。
 * @param body - PR 自检清单文本。
 * @returns 检查结果、日志和扫描文件列表。
 */
async function review(files, body = '') {
  const outputs = new Map();
  const reports = new Map();
  await runInNewContext(`(async () => {${script}\n})()`, {
    Buffer,
    process: { env: { RUNNER_TEMP: '/quality-test' } },
    require: (name) => {
      if (name === 'node:fs') return { writeFileSync: (file, content) => reports.set(file, content) };
      assert.equal(name, '/quality-test/pr-quality-tools/node_modules/typescript');
      return ts;
    },
    context: {
      repo: { owner: 'fixture', repo: 'fixture' },
      payload: { pull_request: { body, number: 1, head: { sha: 'fixture' } } },
    },
    core: { setOutput: (key, value) => outputs.set(key, value) },
    github: {
      paginate: async () => Object.keys(files).map((filename) => ({ filename, status: 'modified' })),
      rest: {
        pulls: { listFiles: () => {} },
        repos: {
          getContent: async ({ path }) => {
            if (files[path] === null) throw new Error('Fixture read failure');
            return { data: { content: Buffer.from(files[path]).toString('base64') } };
          },
        },
      },
    },
  });
  return { outputs, log: reports.get('quality-check.log'), checked: reports.get('quality-checked-files.md') };
}

test('字符串、正则、注释和普通对象赋值不触发语法规则', async () => {
  const { outputs } = await review({
    'src/fixture.tsx': [
      'const image = "data:image/png;base64,AA==";',
      'const nsis = \'$3 != "app.exe"\';',
      'const example = "var x: any; eval(); new Function(); for (x of y)";',
      'const pattern = /==|!=/;',
      '// var x: any; eval(); new Function(); for (x of y)',
      '/* a == b */',
      'props = { ...props, changed: true };',
      'it("fixture", () => { mock.current = { width: 10 }; });',
    ].join('\n'),
  });
  assert.equal(outputs.get('passed'), 'true');
  assert.equal(outputs.get('violations'), '0');
});

test('保留真实 JS/TS 违规，并检测模板插值中的比较表达式', async () => {
  const { outputs, log } = await review({
    'src/fixture.ts': [
      'var value: any = 0;',
      'value == 1;',
      'value != 2;',
      'for (const key in items) {}',
      'for (const item of items) {}',
      'eval("value");',
      'new Function("return 1");',
      'const message = `comparison: ${value == 3}`;',
    ].join('\n'),
  });
  assert.equal(outputs.get('passed'), 'false');
  assert.equal(outputs.get('violations'), '9');
  assert.ok(log.includes('src/fixture.ts:8` — **eqeqeq**'));
});

test('仅对真实 JSX 属性报告扩散、索引 key 和花括号空格，覆盖跨行属性', async () => {
  const { outputs, log } = await review({
    'src/fixture.tsx': [
      'const element = <Widget',
      '  {...props}',
      '  key={index}',
      '  label={ value }',
      '/>;',
    ].join('\n'),
  });
  assert.equal(outputs.get('violations'), '3');
  assert.ok(log.includes('src/fixture.tsx:2` — **no-props-spread**'));
  assert.ok(log.includes('src/fixture.tsx:3` — **no-index-key**'));
  assert.ok(log.includes('src/fixture.tsx:4` — **jsx-brace-spacing**'));
});

test('允许 React 运行时和类型引用，仍拒绝实际未使用的默认导入', async () => {
  const { outputs, log } = await review({
    'src/runtime.tsx': "import React from 'react';\nReact.isValidElement(value);",
    'src/types.tsx': "import React from 'react';\ntype Element = React.ReactElement;",
    'src/unused.tsx': "import React from 'react';\nconst text = 'React'; // React\nconst node = <span />;",
  });
  assert.equal(outputs.get('violations'), '1');
  assert.ok(log.includes('src/unused.tsx:1` — **no-react-import-in-jsx-runtime**'));
});

test('带原因的文件、下一行及行内禁用生效，豁免后不产生第 1 行伪违规', async () => {
  const { outputs } = await review({
    'src/file.ts': '/* eslint-disable eqeqeq -- legacy comparison */\nvalue == 1;',
    'src/next.ts': '// eslint-disable-next-line no-var, eqeqeq -- legacy API\nvar same = value == 1;',
    'src/inline.ts': 'value != 2; // eslint-disable-line eqeqeq -- legacy API',
  });
  assert.equal(outputs.get('passed'), 'true');
  assert.equal(outputs.get('violations'), '0');
});

test('继续检测 CSS important 和 HTML 行内事件，忽略工作流范围外的文件', async () => {
  const { outputs, checked } = await review({
    'src/fixture.css': '.fixture { color: red !important; }',
    'src/fixture.html': '<button onclick="run()">Run</button>',
    'plugins/fixture.ts': 'var value: any;',
    'src/fixture.json': '{"value": "=="}',
  });
  assert.equal(outputs.get('violations'), '2');
  assert.ok(!checked.includes('plugins/fixture.ts'));
  assert.ok(!checked.includes('src/fixture.json'));
});

test('内容读取失败仍阻断工作流，自检清单不作为阻断条件', async () => {
  const missing = await review({ 'src/missing.ts': null });
  assert.equal(missing.outputs.get('passed'), 'false');
  assert.ok(missing.log.includes('**fetch-error**'));
  const checklist = ['STD-1-HTML', 'STD-2-CSS', 'STD-3-JSTS', 'STD-4-REACT', 'STD-5-NEXT', 'STD-COMMENT'];
  const checked = await review({}, checklist.map((id) => `- [x] ${id}`).join('\n'));
  assert.equal(checked.outputs.get('checklist_missing'), '0');
  const unchecked = await review({});
  assert.equal(unchecked.outputs.get('passed'), 'true');
  assert.equal(unchecked.outputs.get('checklist_missing'), '6');
});

test('PR 分支信息通过环境变量传入 shell，避免作为脚本源码展开', () => {
  const [, commentSection] = workflow.split('      - name: Compose review comment');
  const [compose] = commentSection.split('      - name: Create or update quality comment');
  const [, run] = compose.split('        run: |');
  assert.ok(compose.includes('PR_HEAD_REF: ${{ github.event.pull_request.head.ref }}'));
  assert.ok(run.includes('$PR_HEAD_REF'));
  assert.ok(!run.includes('${{ github.event.pull_request'));
});
