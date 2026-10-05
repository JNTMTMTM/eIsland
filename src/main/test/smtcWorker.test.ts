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
 * @file smtcWorker.test.ts
 * @description SMTC Worker启动、缓存刷新、事件消息、缩略图优化和退出清理回归。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Session {
  sourceAppId: string;
  media: {
    title: string;
    artist: string;
    albumTitle: string;
    thumbnail: string;
  } | null;
  playback: {
    playbackStatus: number;
  } | null;
  timeline: {
    position: number;
  } | null;
}

const mocks = vi.hoisted(() => ({
  active: true,
  events: new Map<string, (...args: unknown[]) => void>(),
  message: null as ((message: {
    type: string;
  }) => void) | null,
  exit: null as (() => void) | null,
  post: vi.fn(),
  sessions: vi.fn<() => Session[]>(),
  start: vi.fn(),
  stop: vi.fn()
}));

class MockMonitor {
  /**
   * 保存模拟原生监听器。
   * @param event - 事件名称。
   * @param callback - 事件回调。
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    mocks.events.set(event, callback);
  }

  /**
   * 读取模拟会话。
   * @returns 当前模拟会话快照。
   */
  getMediaSessions(): Session[] {
    return mocks.sessions();
  }

  /** 启动模拟监听。 */
  start(): void {
    mocks.start();
  }

  /** 停止模拟监听。 */
  stop(): void {
    mocks.stop();
  }
}

vi.mock('@eisland/windows-smtc-helper', () => ({
  SmtcMonitor: MockMonitor
}));

vi.mock('worker_threads', () => ({
  get parentPort() {
    return mocks.active ? {
      postMessage: mocks.post,
      on: (event: string, callback: (message: {
        type: string;
      }) => void) => {
        void event;
        mocks.message = callback;
      }
    } : null;
  }
}));

const media = {
  title: 'Song',
  artist: 'Artist',
  albumTitle: 'Album',
  thumbnail: 'cover'
};

const playback = {
  playbackStatus: 4
};

const timeline = {
  position: 1
};
/**
 * 发送模拟原生事件。
 * @param event - 原生事件名称。
 * @param args - 原生事件载荷。
 */

function emit(event: string, ...args: unknown[]): void {
  mocks.events.get(event)?.(...args);
}

beforeEach(() => {
  vi.resetModules();
  mocks.active = true;
  mocks.events.clear();
  mocks.message = null;
  mocks.exit = null;
  vi.clearAllMocks();
  mocks.sessions.mockReset();
  mocks.sessions.mockReturnValue([]);
  const original = process.on.bind(process);
  vi.spyOn(process, 'on').mockImplementation((event, listener) => {
    if (event === 'exit') {
      mocks.exit = listener as () => void;
      return process;
    }
    return original(event, listener);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SMTC Worker', () => {
  it('非Worker环境拒绝启动，不创建原生监听', async () => {
    mocks.active = false;
    await expect(import('../smtcWorker')).rejects.toThrow('must be run as a Worker');
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it('启动推送现有快照，退出停止监听', async () => {
    mocks.sessions.mockReturnValue([{
      media,
      playback,
      timeline,
      sourceAppId: 'app'
    }]);
    await import('../smtcWorker');
    expect(mocks.start).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith({
      type: 'session-update',
      sourceAppId: 'app',
      session: {
        media,
        playback,
        timeline
      }
    });
    mocks.exit?.();
    expect(mocks.stop).toHaveBeenCalledOnce();
  });

  it('初始查询失败仍安装事件监听，新增会话及时刷新播放和时间', async () => {
    mocks.sessions.mockImplementationOnce(() => {
      throw new Error('init');
    });
    await import('../smtcWorker');
    expect(mocks.events.size).toBe(5);
    mocks.sessions.mockReturnValue([{
      media,
      playback,
      timeline,
      sourceAppId: 'app'
    }]);
    emit('session-added', 'app', media);
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'app',
      session: {
        media,
        playback,
        timeline
      }
    });
  });

  it('新增查询失败使用空播放信息，媒体更新查询失败保留已缓存状态', async () => {
    await import('../smtcWorker');
    mocks.sessions.mockImplementationOnce(() => {
      throw new Error('query');
    });
    emit('session-added', 'app', media);
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'app',
      session: {
        media,
        playback: null,
        timeline: null
      }
    });
    emit('session-playback-changed', 'app', playback);
    emit('session-timeline-changed', 'app', timeline);
    mocks.sessions.mockImplementationOnce(() => {
      throw new Error('query');
    });
    const updated = {
      ...media,
      title: 'Next'
    };
    emit('session-media-changed', 'app', updated);
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'app',
      session: {
        playback,
        timeline,
        media: updated
      }
    });
  });

  it('媒体更新刷新会话，新会话的播放与时间事件可独立创建缓存且不重复图片', async () => {
    await import('../smtcWorker');
    mocks.sessions.mockReturnValue([{
      media,
      playback,
      timeline,
      sourceAppId: 'app'
    }]);
    emit('session-media-changed', 'app', media);
    emit('session-playback-changed', 'app', {
      playbackStatus: 5
    });
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'app',
      session: {
        timeline,
        media: {
          title: 'Song',
          artist: 'Artist',
          albumTitle: 'Album'
        },
        playback: {
          playbackStatus: 5
        }
      }
    });
    emit('session-timeline-changed', 'new', timeline);
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'new',
      session: {
        timeline,
        media: null,
        playback: null
      }
    });
    emit('session-playback-changed', 'play', playback);
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-update',
      sourceAppId: 'play',
      session: {
        playback,
        media: null,
        timeline: null
      }
    });
  });

  it('主动检测选择缓存缩略图并识别播放/标题，删除会话后退回原生图片', async () => {
    await import('../smtcWorker');
    emit('session-added', 'app', media);
    mocks.sessions.mockReturnValue([{
      playback,
      timeline,
      sourceAppId: 'app',
      media: {
        ...media,
        thumbnail: 'native'
      }
    }, {
      sourceAppId: 'empty',
      media: null,
      playback: null,
      timeline: null
    }]);
    mocks.message?.({
      type: 'detect-sources'
    });
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'detect-sources-result',
      sources: [{
        sourceAppId: 'app',
        isPlaying: true,
        hasTitle: true,
        thumbnail: 'cover'
      }, {
        sourceAppId: 'empty',
        isPlaying: false,
        hasTitle: false,
        thumbnail: null
      }]
    });
    emit('session-removed', 'app');
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'session-removed',
      sourceAppId: 'app'
    });
    mocks.message?.({
      type: 'detect-sources'
    });
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'detect-sources-result',
      sources: [{
        sourceAppId: 'app',
        isPlaying: true,
        hasTitle: true,
        thumbnail: 'native'
      }, {
        sourceAppId: 'empty',
        isPlaying: false,
        hasTitle: false,
        thumbnail: null
      }]
    });
  });

  it('未知主进程消息无副作用，检测失败回复空列表', async () => {
    await import('../smtcWorker');
    mocks.message?.({
      type: 'unknown'
    });
    expect(mocks.post).not.toHaveBeenCalled();
    mocks.sessions.mockImplementationOnce(() => {
      throw new Error('offline');
    });
    mocks.message?.({
      type: 'detect-sources'
    });
    expect(mocks.post).toHaveBeenLastCalledWith({
      type: 'detect-sources-result',
      sources: []
    });
  });
});
