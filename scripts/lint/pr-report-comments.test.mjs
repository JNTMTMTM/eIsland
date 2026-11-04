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
 * @description 验证当前 CI 评论和原生构建附件策略，并保留旧报告纯文本生成回归。
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
];

/**
 * 从工作流读取实际分类脚本，只运行不涉及 GitHub 写入的分类片段。
 * @param file - 工作流文件名。
 * @param start - 片段开始标记。
 * @param end - 片段结束标记。
 * @returns 保留实际正则和判断的分类源码。
 */
function classificationScript(file, start, end) {
  const workflow = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
  const script = workflow.split(/^ {10}script: \|\r?\n/mu)[1].split(/\r?\n/u)
    .map((line) => line.replace(/^ {12}/u, '')).join('\n');
  assert(script.includes(start) && script.includes(end), file);
  return script.slice(script.indexOf(start), script.indexOf(end));
}

test('issue 分类识别原生 Tauri 与遗留 Electron，保留功能及类型类别', () => {
  const script = classificationScript('issue-auto-label.yml', 'const text =', 'const labels =');
  const classify = (title) => Array.from(runInNewContext(`${script}\n[...labelsToApply]`, { issue: { title } }));
  const native = classify('Tauri Rust WebView2 原生窗口 crash');
  assert(native.includes('area: tauri-core'));
  assert(native.includes('type: bug'));
  assert(!native.includes('area: legacy-electron'));
  assert(classify('Electron preload BrowserWindow migration').includes('area: legacy-electron'));
  const stock = classify('股票 chart feature');
  assert(stock.includes('area: stock'));
  assert(stock.includes('area: chart'));
  assert(stock.includes('type: feature'));
});

test('PR 路径分类覆盖 Rust、Tauri API、插件和遗留源码', () => {
  const script = classificationScript('pr-auto-label.yml', 'const filenames =', 'const labels =');
  const classify = (names) => Array.from(runInNewContext(`${script}\n[...labelsToApply]`, { files: names.map((filename) => ({ filename })) }));
  ['src-tauri/src/main.rs', 'src/tauri/api.ts', 'plugins/windows/helper/src/lib.rs', 'scripts/tauri/smoke.mjs'].forEach((path) => {
    assert(classify([path]).includes('tauri-core'), path);
  });
  assert.deepEqual(classify(['src/main/index.ts', 'src/preload/index.ts']), ['legacy-electron']);
  const existing = classify(['src/renderer/App.tsx', 'README.md', 'assets/icon.svg']);
  ['frontend', 'documentation', 'assets'].forEach((label) => assert(existing.includes(label)));
});

test('PR 摘要按 Tauri 构建配置、原生服务和遗留模块分组', () => {
  const script = classificationScript('pr-summary-comment.yml', 'const moduleRules =', '// ========== 4. Statistics');
  const groups = runInNewContext(`${script}\ngroups`, { files: [
    'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json', 'src-tauri/build.rs', 'vite.config.ts', 'package-lock.json',
    'src-tauri/src/main.rs', 'src/tauri/api.ts', 'src/main/index.ts', 'src/preload/index.ts', 'src/renderer/App.tsx',
  ].map((filename) => ({ filename })) });
  assert.equal(groups['Build / Config'].length, 5);
  assert.equal(groups['Tauri Core'].length, 2);
  assert.equal(groups['Legacy Electron Main'].length, 1);
  assert.equal(groups['Legacy Electron Preload'].length, 1);
  assert.equal(groups.Renderer.length, 1);
});

test('原生测试工作流只提供可执行的 dispatch 项目', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/test.yml', import.meta.url), 'utf8');
  assert.match(workflow, /options: \[all, shared, plugins, renderer, cli\]/u);
  assert.doesNotMatch(workflow, /legacy is available|options:.*legacy/u);
});

// 弃用工作流的报告协议，仅作为纯文本生成回归夹具；不安装或运行 Electron。
const PROJECTS = ['main', 'preload', 'shared', 'plugins', 'renderer', 'cli'];

/**
 * 执行工作流实际的报告生成代码，模拟六个矩阵任务的 JSON 附件。
 * @param overrides - 按 project 替换附件；null 模拟整个任务未能上传附件。
 * @param outcome - GitHub 聚合矩阵结果，包含报告之外的安装或上传失败。
 * @returns 实际生成的 PR 评论文本。
 * @deprecated 原 Electron 矩阵报告已归档；保留其纯文本生成函数与回归，当前原生工作流使用 Actions 状态和附件。
 */
async function renderMatrixReport(overrides = {}, outcome = 'success') {
  const workflow = readFileSync(new URL('../../.github/legacy-workflows/test.yml.disabled', import.meta.url), 'utf8');
  const [, block] = workflow.split(/^ {10}script: \|\r?\n/mu);
  const script = block.split('// ==================== Post Comment')[0].split(/\r?\n/u)
    .map((line) => line.replace(/^ {12}/u, '')).join('\n');
  const artifacts = new Map();
  PROJECTS.forEach((project) => {
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

test('矩阵报告汇总六个 project 的真实测试数量和独立耗时', async () => {
  const body = await renderMatrixReport();
  assert.match(body, /\*\*PASS\*\*/u);
  assert.match(body, /12 passed, 0 failed, 0 skipped\/todo/u);
  PROJECTS.forEach((project) => {
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
    PROJECTS.map((project) => [project, {
      'vitest.log': '@'.repeat(70_000),
    }]),
  ), 'failure');
  assert.ok(expanded.length < 65_536);
});

['test.yml', 'build-size-report.yml', 'e2e.yml', 'release-build-upload.yml'].forEach((file) => {
  test(`${file}: 原生工作流保留失败状态且不依赖 PR 写权限`, () => {
    const workflow = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
    assert.match(workflow, /contents: read/u);
    assert.doesNotMatch(workflow, /issues\.createComment|pull_request_target:|continue-on-error:\s*true/u);
    assert.doesNotMatch(workflow, /(?:electron-vite|electron-builder|install-electron)/u);
  });
});

test('原生桌面和安装器工作流上传实际产物', () => {
  const renderer = readFileSync(new URL('../../.github/workflows/build-size-report.yml', import.meta.url), 'utf8');
  const desktop = readFileSync(new URL('../../.github/workflows/e2e.yml', import.meta.url), 'utf8');
  const release = readFileSync(new URL('../../.github/workflows/release-build-upload.yml', import.meta.url), 'utf8');
  assert.match(renderer, /npm run build:web/u);
  assert.match(renderer, /path: renderer-sizes\.json/u);
  assert.match(desktop, /npm run test:e2e:tauri/u);
  assert.match(desktop, /EISLAND_SMOKE_BINARY:/u);
  assert.match(release, /create-update-manifest\.mjs/u);
  assert.match(release, /bundle\/tauri-latest\.json/u);
  assert.match(release, /if-no-files-found: error/u);
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
