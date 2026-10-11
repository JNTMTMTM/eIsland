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
 * @file pr-report-comments.test.mjs
 * @description 执行六类 CI 报告的实际发布脚本，验证评论复用、去重及旧提交保护。
 * @author 鸡哥
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const workflows = [
  'pr-summary-comment.yml',
  'pr-comment-report.yml',
  'pr-code-quality-review.yml',
  'i18n-check.yml',
  'build-size-report.yml',
  'test.yml',
];

workflows.forEach((file) => {
  const workflow = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
  const sections = workflow.split(/^ {10}script: \|\r?\n/mu).slice(1);
  const block = sections.find((section) => section.split(/\r?\n {6}- name:/u)[0].includes('issues.createComment'));
  assert.ok(block, `${file}: missing comment script`);
  const script = block.split(/\r?\n {6}- name:/u)[0].split(/\r?\n/u)
    .map((line) => line.replace(/^ {12}/u, '')).join('\n');
  const [, marker] = script.match(/const marker = '([^']+)'/u);
  const publish = script.slice(script.indexOf('// Queued runs for older commits'));
  assert.match(workflow, /group: \$\{\{ github.workflow \}\}-\$\{\{ github.event.pull_request.number \|\| github.ref \}\}/u);
  assert.match(workflow, /cancel-in-progress: false/u);

  /**
   * 运行工作流发布代码，模拟 GitHub 评论存储及提交信息。
   * @param comments - 可变的评论列表。
   * @param options - 当前提交及写入失败配置。
   * @returns GitHub 写入调用记录。
   */
  async function publishReport(comments, options = {}) {
    const calls = [];
    const body = `${marker}\nLatest report`;
    await runInNewContext(`(async () => {${publish}\n})()`, {
      marker, body,
      owner: 'fixture', repo: 'fixture', issue_number: 230, pr: { number: 230 },
      commentBody: body,
      context: { payload: { pull_request: { number: 230, head: { sha: 'current' } } } },
      core: { notice: () => {} },
      github: {
        paginate: async (_method, params) => {
          assert.equal(params.issue_number, 230);
          assert.equal(params.per_page, 100);
          return [...comments];
        },
        rest: {
          pulls: { get: async () => ({ data: { head: { sha: options.head ?? 'current' } } }) },
          issues: {
            listComments: () => {},
            updateComment: async ({ comment_id, body: updatedBody }) => {
              if (options.failUpdate) throw new Error('Update failed');
              calls.push(['update', comment_id]);
              const storedComment = comments.find((comment) => comment.id === comment_id);
              storedComment.body = updatedBody;
            },
            createComment: async ({ body: newBody }) => {
              calls.push(['create']);
              comments.push({ id: 100, user: { login: 'eislandBot', type: 'User' }, body: newBody });
            },
            deleteComment: async ({ comment_id }) => {
              calls.push(['delete', comment_id]);
              comments.splice(comments.findIndex((comment) => comment.id === comment_id), 1);
            },
          },
        },
      },
    });
    return calls;
  }

  ['eislandBot', 'github-actions[bot]'].forEach((login) => {
    test(`${file}: 更新 ${login} 的原评论`, async () => {
      const comments = [{ id: 1, user: { login, type: login === 'eislandBot' ? 'User' : 'Bot' }, body: `${marker}\nOld` }];
      assert.deepEqual(await publishReport(comments), [['update', 1]]);
      assert.equal(comments[0].body, `${marker}\nLatest report`);
    });
  });

  test(`${file}: 第一次创建、第二次复用`, async () => {
    const comments = [];
    assert.deepEqual(await publishReport(comments), [['create']]);
    assert.deepEqual(await publishReport(comments), [['update', 100]]);
    assert.equal(comments.length, 1);
  });

  test(`${file}: 更新后清理重复报告，保留人工和其他报告`, async () => {
    const comments = [
      { id: 1, user: { login: 'eislandBot' }, body: `${marker}\nFirst` },
      { id: 2, user: { login: 'github-actions[bot]' }, body: `${marker}\nDuplicate` },
      { id: 3, user: { login: 'reviewer' }, body: `${marker}\nHuman` },
      { id: 4, user: { login: 'eislandBot' }, body: '<!-- other-report -->\nOther' },
      { id: 5, user: { login: 'another[bot]', type: 'Bot' }, body: `${marker}\nOther author` },
      { id: 6, user: { login: 'eislandBot' }, body: `Quoted marker: ${marker}` },
    ];
    assert.deepEqual(await publishReport(comments), [['update', 1], ['delete', 2]]);
    assert.deepEqual(comments.map((comment) => comment.id), [1, 3, 4, 5, 6]);
  });

  test(`${file}: 更新失败时保留所有旧报告`, async () => {
    const comments = [1, 2].map((id) => ({ id, user: { login: 'eislandBot' }, body: marker }));
    await assert.rejects(publishReport(comments, { failUpdate: true }), /Update failed/u);
    assert.equal(comments.length, 2);
  });

  test(`${file}: 旧提交执行完毕不覆盖当前报告`, async () => {
    const comments = [{ id: 1, user: { login: 'eislandBot' }, body: marker }];
    assert.deepEqual(await publishReport(comments, { head: 'newer-commit' }), []);
    assert.equal(comments[0].body, marker);
  });
});
