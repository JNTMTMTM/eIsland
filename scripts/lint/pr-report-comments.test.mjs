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
 * @description 验证当前 CI 评论、原生模块分类、命令和构建附件策略。
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

test('issue 分类识别原生 Tauri，保留功能及类型类别', () => {
  const script = classificationScript('issue-auto-label.yml', 'const text =', 'const labels =');
  const classify = (title) => Array.from(runInNewContext(`${script}\n[...labelsToApply]`, { issue: { title } }));
  const native = classify('Tauri Rust WebView2 原生窗口 crash');
  assert(native.includes('area: tauri-core'));
  assert(native.includes('type: bug'));
  const stock = classify('股票 chart feature');
  assert(stock.includes('area: stock'));
  assert(stock.includes('area: chart'));
  assert(stock.includes('type: feature'));
});

test('PR 路径分类覆盖 Rust、Tauri API、插件和脚本', () => {
  const script = classificationScript('pr-auto-label.yml', 'const filenames =', 'const labels =');
  const classify = (names) => Array.from(runInNewContext(`${script}\n[...labelsToApply]`, { files: names.map((filename) => ({ filename })) }));
  ['src-tauri/src/main.rs', 'src/tauri/api.ts', 'plugins/windows/helper/src/lib.rs', 'scripts/native/smoke.mjs'].forEach((path) => {
    assert(classify([path]).includes('tauri-core'), path);
  });
  const existing = classify(['src/renderer/App.tsx', 'README.md', 'assets/icon.svg']);
  ['frontend', 'documentation', 'assets'].forEach((label) => assert(existing.includes(label)));
});

test('PR 摘要按 Tauri 构建配置、原生服务和界面分组', () => {
  const script = classificationScript('pr-summary-comment.yml', 'const moduleRules =', '// ========== 4. Statistics');
  const groups = runInNewContext(`${script}\ngroups`, { files: [
    'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json', 'src-tauri/build.rs', 'vite.config.ts', 'package-lock.json',
    'src-tauri/src/main.rs', 'src/tauri/api.ts', 'src/renderer/App.tsx',
  ].map((filename) => ({ filename })) });
  assert.equal(groups['Build / Config'].length, 5);
  assert.equal(groups['Tauri Core'].length, 2);
  assert.equal(groups.Renderer.length, 1);
});

test('原生测试工作流只提供可执行的 dispatch 项目', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/test.yml', import.meta.url), 'utf8');
  assert.match(workflow, /options: \[all, shared, plugins, renderer, cli\]/u);
  assert.doesNotMatch(workflow, /legacy is available|options:.*legacy/u);
});

test('原生 CI 的固定 npm 命令均存在', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  ['test.yml', 'e2e.yml', 'release-build-upload.yml', 'build-size-report.yml'].forEach((file) => {
    const source = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
    Array.from(source.matchAll(/npm run ([\w:-]+)(?![\w:$])/gu)).forEach(([, command]) => {
      if (command.endsWith(':')) return;
      assert.equal(typeof pkg.scripts[command], 'string', `${file}: ${command}`);
    });
  });
});

test('桌面 CI 只准备一次插件并直接构建原生测试程序', () => {
  const source = readFileSync(new URL('../../.github/workflows/e2e.yml', import.meta.url), 'utf8');
  assert.equal(Array.from(source.matchAll(/run: npm run plugins:build\s*$/gmu)).length, 1);
  assert.match(source, /npx tauri build --debug --no-bundle/u);
  assert.doesNotMatch(source, /run: npm run package/u);
});

test('安装器 CI 只准备一次插件并在显式发布时仅上传 R2 和 GitHub', () => {
  const source = readFileSync(new URL('../../.github/workflows/release-build-upload.yml', import.meta.url), 'utf8');
  assert.equal(Array.from(source.matchAll(/run: npm run package\s*$/gmu)).length, 1);
  assert.doesNotMatch(source, /run: npm run plugins:build/u);
  const wrapper = readFileSync(new URL('../../scripts/native/package-release.mjs', import.meta.url), 'utf8');
  assert.equal(Array.from(wrapper.matchAll(/execute\(\[join\(root, 'scripts\/native\/build-native\.mjs'/gu)).length, 1);
  assert.match(wrapper, /'build', '--bundles', 'nsis'/u);
  assert.match(wrapper, /TAURI_SIGNING_PRIVATE_KEY/u);
  assert.match(source, /publish:[\s\S]*?type: boolean\s+default: false/u);
  assert.match(source, /PUBLISH_REQUESTED:.*github\.event_name == 'workflow_dispatch' && inputs\.publish/u);
  assert.match(source, /git merge-base --is-ancestor \$env:GITHUB_SHA origin\/main/u);
  assert.match(source, /environment: release/u);
  const publicationSteps = source.split(/^ {6}- /mu).filter((step) => /npm run release:upload-only|gh release (?:create|edit)/u.test(step));
  assert.equal(publicationSteps.length, 3);
  publicationSteps.forEach((step) => assert.match(step, /if: env\.EISLAND_PUBLISH == '1'/u));
  assert.match(source, /run: npm run release:upload-only -- --r2-only\s*$/mu);
  assert.doesNotMatch(source, /secrets\.(?:COS_|OSS_|MINIO_|ESA_)/u);
});

test('原生测试 CI 同时执行 API 和 Rust 测试', () => {
  const source = readFileSync(new URL('../../.github/workflows/e2e.yml', import.meta.url), 'utf8');
  assert.match(source, /npm run test:api && npm run test:rust/u);
  assert.match(source, /cargo clippy .*--all-targets -- -D warnings/u);
});

test('CI 原生脚本路径存在且命令无需运行时后缀', () => {
  const files = ['test.yml', 'e2e.yml', 'release-build-upload.yml', 'build-size-report.yml'];
  files.forEach((file) => {
    const source = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /:tauri|scripts\/tauri\//u);
    Array.from(source.matchAll(/node (scripts\/native\/[\w.-]+\.mjs)/gu)).forEach(([, path]) => {
      assert(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8').length > 0);
    });
  });
});

test('package 与 release 命令保持构建和上传职责', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.package, 'node scripts/native/package-release.mjs');
  assert.equal(pkg.scripts.release, 'npm run package && npm run release:upload-only');
  assert.equal(pkg.scripts['release:upload-only'], 'node scripts/native/upload-release.mjs');
  assert.equal(pkg.scripts['release:upload-minio'], 'node scripts/native/upload-release.mjs --minio-only');
});

['test.yml', 'build-size-report.yml', 'e2e.yml', 'release-build-upload.yml'].forEach((file) => {
  test(`${file}: 原生工作流保留失败状态且不依赖 PR 写权限`, () => {
    const workflow = readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8');
    assert.match(workflow, file === 'release-build-upload.yml' ? /contents: write/u : /contents: read/u);
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
  assert.match(desktop, /npm run test:e2e/u);
  assert.match(desktop, /EISLAND_SMOKE_BINARY:/u);
  assert.match(release, /run: npm run package/u);
  assert.match(release, /TAURI_SIGNING_PRIVATE_KEY/u);
  assert.match(release, /\*-setup\.exe\.sig/u);
  assert.match(release, /bundle\/tauri-latest\.yml/u);
  assert.match(release, /temp\/app\/dist\/\*\.exe/u);
  assert.match(release, /temp\/app\/dist\/latest\.yml/u);
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

  if (file === 'i18n-check.yml') {
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
