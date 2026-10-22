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

/**
 * 执行工作流实际的报告生成代码，模拟五个矩阵任务的 JSON 附件。
 * @param overrides - 按 project 替换附件；null 模拟整个任务未能上传附件。
 * @param outcome - GitHub 聚合矩阵结果，包含报告之外的安装或上传失败。
 * @returns 实际生成的 PR 评论文本。
 */
async function renderMatrixReport(overrides = {}, outcome = 'success') {
  const workflow = readFileSync(new URL('../../.github/workflows/test.yml', import.meta.url), 'utf8');
  const [, block] = workflow.split(/^ {10}script: \|\r?\n/mu);
  const script = block.split('// ==================== Post Comment')[0].split(/\r?\n/u)
    .map((line) => line.replace(/^ {12}/u, '')).join('\n');
  const artifacts = new Map();
  ['main', 'preload', 'shared', 'plugins', 'renderer'].forEach((project) => {
    const files = Object.hasOwn(overrides, project) ? overrides[project] : {
      'test-metadata.json': { exit_code: 0, duration_seconds: 5 },
      'vitest-results.json': {
        success: true, numTotalTests: 2, numPassedTests: 2, numFailedTests: 0,
        numPendingTests: 0, numTodoTests: 0,
        testResults: [{
          name: `C:\\work\\src\\${project}\\test\\fixture.test.ts`, status: 'passed',
          assertionResults: [{ status: 'passed' }, { status: 'passed' }],
        }],
      },
    };
    Object.entries(files ?? {}).forEach(([name, content]) => {
      artifacts.set(`test-reports/test-logs-${project}/${name}`, typeof content === 'string' ? content : JSON.stringify(content));
    });
  });
  return runInNewContext(`(async () => {${script}\nreturn body;})()`, {
    process: { env: { VITEST_RESULT: outcome } },
    context: {
      serverUrl: 'https://github.com', repo: { owner: 'fixture', repo: 'fixture' }, runId: 1,
      payload: { pull_request: { head: { sha: 'current-commit' } } },
    },
    require: (name) => {
      assert.equal(name, 'node:fs');
      return { readFileSync: (file) => {
        assert.ok(artifacts.has(file), `Missing fixture: ${file}`);
        return artifacts.get(file);
      } };
    },
  });
}

test('矩阵报告汇总五个 project 的真实测试数量和独立耗时', async () => {
  const body = await renderMatrixReport();
  assert.match(body, /\*\*PASS\*\*/u);
  assert.match(body, /10 passed, 0 failed, 0 skipped\/todo/u);
  ['main', 'preload', 'shared', 'plugins', 'renderer'].forEach((project) => {
    assert.ok(body.includes(`| ${project} | PASS | 2 | 0 | 0 | 5s |`));
    assert.ok(body.includes(`| src/${project}/test | 2 | 0 | 0 |`));
  });
});

test('测试失败与文件加载失败均在矩阵报告中保留失败状态和详情', async () => {
  const body = await renderMatrixReport({ main: {
    'test-metadata.json': { exit_code: 1, duration_seconds: 8 },
    'vitest-results.json': {
      success: false, numTotalTests: 3, numPassedTests: 0, numFailedTests: 1,
      numPendingTests: 1, numTodoTests: 1,
      testResults: [{
        name: 'src/main/test/failed.test.ts', status: 'failed', message: 'Cannot load dependency',
        assertionResults: [{ status: 'failed', fullName: 'failed assertion', failureMessages: ['Expected true'] }],
      }],
    },
  } });
  assert.match(body, /\*\*FAIL\*\*/u);
  assert.ok(body.includes('| main | FAIL | 0 | 1 | 2 | 8s |'));
  assert.ok(body.includes('Cannot load dependency'));
  assert.ok(body.includes('Expected true'));
});

test('矩阵任务没有附件或 JSON 损坏时明确显示 ERROR', async () => {
  const body = await renderMatrixReport({
    main: null,
    renderer: {
      'test-metadata.json': { exit_code: 1, duration_seconds: 2 },
      'vitest-results.json': '{broken',
      'vitest.log': 'Renderer worker crashed',
    },
  }, 'failure');
  assert.match(body, /\*\*FAIL\*\*/u);
  assert.ok(body.includes('| main | ERROR |'));
  assert.ok(body.includes('| renderer | ERROR |'));
  assert.ok(body.includes('Renderer worker crashed'));
  assert.ok(body.includes('Check job setup and dependency installation'));
});

test('JSON 测试结果通过但进程异常退出时报告仍失败', async () => {
  const body = await renderMatrixReport({ main: {
    'test-metadata.json': { exit_code: 1, duration_seconds: 3 },
    'vitest-results.json': {
      success: true, numTotalTests: 1, numPassedTests: 1, numFailedTests: 0,
      numPendingTests: 0, numTodoTests: 0, testResults: [],
    },
    'vitest.log': 'Unhandled rejection after tests',
  } });
  assert.match(body, /\*\*FAIL\*\*/u);
  assert.ok(body.includes('| main | FAIL |'));
  assert.ok(body.includes('Unhandled rejection after tests'));
});

test('附件上传等矩阵任务失败不能被全部通过的 JSON 覆盖', async () => {
  const body = await renderMatrixReport({}, 'failure');
  assert.match(body, /\*\*FAIL\*\*/u);
  assert.ok(body.includes('| main | PASS |'));
});

test('失败日志转义 HTML 和提及符号并限制评论长度', async () => {
  const body = await renderMatrixReport({ main: {
    'test-metadata.json': { exit_code: 1, duration_seconds: 1 },
    'vitest.log': `${'x'.repeat(70_000)}<script>@someone|broken</script>`,
  } }, 'failure');
  assert.ok(!body.includes('<script>'));
  assert.ok(!body.includes('@someone'));
  assert.ok(body.includes('&#60;script&#62;&#64;someone&#124;broken'));
  assert.ok(body.length < 10_000);
  const expanded = await renderMatrixReport(Object.fromEntries(
    ['main', 'preload', 'shared', 'plugins', 'renderer'].map((project) => [project, {
      'vitest.log': '@'.repeat(70_000),
    }]),
  ), 'failure');
  assert.ok(expanded.length < 65_536);
});

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

  if (['test.yml', 'i18n-check.yml', 'build-size-report.yml'].includes(file)) {
    test(`${file}: fork PR runs unprivileged checks and skips direct comments`, () => {
      assert.match(workflow, /^ {2}pull_request:/mu);
      assert.doesNotMatch(workflow, /^ {2}pull_request_target:/mu);
      assert.doesNotMatch(workflow, /allow-unsafe-pr-checkout/u);
      const [, guard] = workflow.match(/if: (.*github.event_name.*full_name.*)/u);
      const canComment = (repository, eventName = 'pull_request') => runInNewContext(guard, {
        always: () => true,
        github: { repository: 'fixture/repo', event_name: eventName,
          event: { pull_request: { head: { repo: { full_name: repository } } } } },
      });
      assert.equal(canComment('fixture/repo'), true);
      assert.equal(canComment('contributor/fork'), false);
      assert.equal(canComment('fixture/repo', 'workflow_dispatch'), false);
    });
  }

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
