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
 * @file downloadToolSection.test.tsx
 * @description 验证下载创建、历史状态、任务操作和错误反馈。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes, render, text, value } from '../../../../test/componentHarness';
import { DownloadToolSection } from '../DownloadToolSection';
import { fire } from './toolTestEvents';
import type { DownloadTaskSnapshot, DownloadTaskStatus } from '../../config/downloadToolConfig';
import type { useDownloadTasks } from '../../hooks/useDownloadTasks';

const mocks = vi.hoisted(() => ({
  hook: vi.fn<typeof useDownloadTasks>(), pick: vi.fn<() => Promise<string | null>>(),
  start: vi.fn<() => Promise<{ ok: boolean; message?: string }>>(), cancel: vi.fn<() => Promise<boolean>>(),
  pause: vi.fn<() => Promise<boolean>>(), resume: vi.fn<() => Promise<{ ok: boolean; message?: string }>>(),
  remove: vi.fn<() => Promise<boolean>>(), open: vi.fn<() => Promise<boolean>>(),
}));
vi.mock('../../hooks/useDownloadTasks', () => ({ useDownloadTasks: mocks.hook }));

/**
 * 构造下载状态快照。
 * @param status - 待测状态。
 * @returns 包含进度越界和错误信息的快照。
 */
function task(status: DownloadTaskStatus): DownloadTaskSnapshot {
  return { status, id: 'task', url: 'https://example.test/file.bin', fileName: '', savePath: '/downloads/file.bin',
    totalBytes: 0, downloadedBytes: 100, progress: 1.2, speedBytesPerSecond: 20, estimatedFinishAt: null,
    threads: 8, createdAt: 10, updatedAt: 5010, errorMessage: 'task error' };
}

describe('DownloadToolSection', () => {
  let state: ReturnType<typeof useDownloadTasks>;
  const setDownloadPage = vi.fn();
  beforeEach(() => {
    state = { tasks: [], setTasks: vi.fn(), defaultDir: '/downloads', nowMs: 1000, activeTask: null };
    mocks.hook.mockImplementation(() => state);
    mocks.pick.mockResolvedValue('/output/file.bin');
    mocks.start.mockResolvedValue({ ok: true });
    mocks.cancel.mockResolvedValue(true);
    mocks.pause.mockResolvedValue(true);
    mocks.resume.mockResolvedValue({ ok: true });
    mocks.remove.mockResolvedValue(true);
    mocks.open.mockResolvedValue(true);
    vi.stubGlobal('window', { api: { downloadPickSavePath: mocks.pick, downloadStart: mocks.start,
      downloadCancel: mocks.cancel, downloadPause: mocks.pause, downloadResume: mocks.resume,
      downloadRemove: mocks.remove, openInExplorer: mocks.open } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('路径选择要求URL，创建请求保留输入且非法线程回退为8', async () => {
    const input = { setDownloadPage, downloadPage: 'create' };
    let tree = render(DownloadToolSection, input);
    expect(value(tree, '.download-save-path-input', 'disabled')).toBe(true);
    fire(tree, '.settings-lyrics-source-btn', 'onClick');
    expect(mocks.pick).not.toHaveBeenCalled();
    fire(tree, 'input', 'onChange', 0, { target: { value: 'https://example.test/file.bin' } });
    tree = render(DownloadToolSection, input);
    fire(tree, '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(value(render(DownloadToolSection, input), '.download-save-path-input', 'value')).toBe('/output/file.bin'); });
    fire(render(DownloadToolSection, input), '.download-threads-inline-input', 'onChange', 0, { target: { value: 'NaN' } });
    fire(render(DownloadToolSection, input), '.download-start-btn-full', 'onClick');
    await vi.waitFor(() => { expect(setDownloadPage).toHaveBeenCalledWith('history'); });
    expect(mocks.start).toHaveBeenCalledWith({ url: 'https://example.test/file.bin', savePath: '/output/file.bin', threads: 8 });
    expect(text(render(DownloadToolSection, input))).toContain('messages.started');
  });

  it.each([
    { failure: { ok: false, message: 'server failure' }, message: 'server failure' },
    { failure: { ok: false }, message: 'messages.startFailed' },
  ])('创建失败 $message在原页面反馈并恢复按钮', async ({ failure, message }) => {
    const input = { setDownloadPage, downloadPage: 'create' };
    mocks.start.mockResolvedValue(failure);
    fire(render(DownloadToolSection, input), '.download-start-btn-full', 'onClick');
    await vi.waitFor(() => { expect(text(render(DownloadToolSection, input))).toContain(message); });
    expect(setDownloadPage).not.toHaveBeenCalled();
    expect(value(render(DownloadToolSection, input), '.download-start-btn-full', 'disabled')).toBe(false);
  });

  it('选择路径与创建异常分别反馈，当前任务提供取消入口', async () => {
    const input = { setDownloadPage, downloadPage: 'create' };
    state.activeTask = task('downloading');
    mocks.pick.mockRejectedValue(new Error('dialog failure'));
    fire(render(DownloadToolSection, input), 'input', 'onChange', 0, { target: { value: 'url' } });
    fire(render(DownloadToolSection, input), '.settings-lyrics-source-btn', 'onClick');
    await vi.waitFor(() => { expect(text(render(DownloadToolSection, input))).toContain('messages.pickPathFailed'); });
    mocks.start.mockRejectedValue(new Error('offline'));
    fire(render(DownloadToolSection, input), '.download-start-btn-full', 'onClick');
    await vi.waitFor(() => { expect(text(render(DownloadToolSection, input))).toContain('offline'); });
    fire(render(DownloadToolSection, input), '.download-start-btn-full', 'onClick', 1);
    await vi.waitFor(() => { expect(mocks.cancel).toHaveBeenCalledWith('task'); });
  });

  it.each(['downloading', 'paused', 'completed', 'failed', 'canceled'] as const)('历史任务状态 %s控制按钮和时间提示', (status) => {
    state.tasks = [task(status)];
    const tree = render(DownloadToolSection, { setDownloadPage, downloadPage: 'history' });
    expect(text(tree)).toContain(status);
    expect(text(tree)).toContain('https://example.test/file.bin');
    expect(text(tree)).toContain('task error');
    expect(value(tree, '.download-task-progress-fill', 'style')).toEqual({ width: '100%' });
    expect(nodes(nodes(tree, '.download-task-actions')[0], 'button')).toHaveLength(status === 'paused' || status === 'completed' ? 2 : 1);
    expect(text(tree)).toContain(status === 'downloading' ? 'remainingLabel' : 'elapsedLabel');
  });

  it('暂停、恢复和删除操作交给IPC，成功删除更新任务列表', async () => {
    const input = { setDownloadPage, downloadPage: 'history' };
    state.tasks = [task('downloading')];
    fire(nodes(render(DownloadToolSection, input), '.download-task-actions')[0], 'button', 'onClick');
    await vi.waitFor(() => { expect(mocks.pause).toHaveBeenCalledWith('task'); });
    state.tasks = [task('paused')];
    fire(nodes(render(DownloadToolSection, input), '.download-task-actions')[0], 'button', 'onClick', 0);
    await vi.waitFor(() => { expect(mocks.resume).toHaveBeenCalledWith('task'); });
    fire(nodes(render(DownloadToolSection, input), '.download-task-actions')[0], 'button', 'onClick', 1);
    await vi.waitFor(() => { expect(state.setTasks).toHaveBeenCalledOnce(); });
    const update = (state.setTasks as ReturnType<typeof vi.fn>).mock.calls[0][0] as (previous: DownloadTaskSnapshot[]) => DownloadTaskSnapshot[];
    expect(update([task('paused')])).toEqual([]);
  });

  it('完成任务可以打开目录，失败或拒绝删除不会移除记录', async () => {
    const input = { setDownloadPage, downloadPage: 'history' };
    state.tasks = [task('completed')];
    mocks.open.mockResolvedValue(false);
    mocks.remove.mockResolvedValue(false);
    let [actions] = nodes(render(DownloadToolSection, input), '.download-task-actions');
    fire(actions, 'button', 'onClick', 1);
    await vi.waitFor(() => { expect(mocks.open).toHaveBeenCalledWith('/downloads/file.bin'); });
    fire(actions, 'button', 'onClick', 0);
    await vi.waitFor(() => { expect(mocks.remove).toHaveBeenCalledOnce(); });
    expect(state.setTasks).not.toHaveBeenCalled();
    expect(text(render(DownloadToolSection, input))).toContain('messages.removeFailed');
    [actions] = nodes(render(DownloadToolSection, input), '.download-task-actions');
    mocks.remove.mockRejectedValue(new Error('offline'));
    fire(actions, 'button', 'onClick', 0);
    await vi.waitFor(() => { expect(mocks.remove).toHaveBeenCalledTimes(2); });
  });

  it('空历史显示提示且页面按钮转发切页', () => {
    const tree = render(DownloadToolSection, { setDownloadPage, downloadPage: 'history' });
    expect(text(tree)).toContain('tasks.empty');
    fire(tree, '.settings-app-page-dot', 'onClick');
    expect(setDownloadPage).toHaveBeenCalledWith('create');
  });

  it.each([
    { status: 'downloading', operation: 'pause', button: 0, message: 'messages.pauseFailed' },
    { status: 'paused', operation: 'resume', button: 0, message: 'messages.resumeFailed' },
    { status: 'completed', operation: 'open', button: 1, message: 'messages.openFolderFailed' },
    { status: 'completed', operation: 'remove', button: 0, message: 'messages.removeFailed' },
  ] as const)('历史页直接显示 $operation异常，不需要切回创建页', async ({ status, operation, button, message }) => {
    const input = { setDownloadPage, downloadPage: 'history' };
    state.tasks = [task(status)];
    mocks[operation].mockRejectedValue(new Error('offline'));
    const [actions] = nodes(render(DownloadToolSection, input), '.download-task-actions');
    fire(actions, 'button', 'onClick', button);
    await vi.waitFor(() => { expect(text(render(DownloadToolSection, input))).toContain(message); });
    expect(setDownloadPage).not.toHaveBeenCalled();
  });
});
