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
 * @file smtcMonitorRuntime.test.ts
 * @description SMTC 真实监控器的会话增删、元数据与播放时间线变化、原生错误和轮询清理测试。
 * @author 鸡哥
 */

import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { NativeRuntimeFixture } from '../../test/nativeRuntimeHarness';
import type { SmtcMonitor } from '../index';
const file = fileURLToPath(new URL('../smtc-monitor.js', import.meta.url));
const json = vi.fn<(name: string) => unknown>(); const start = vi.fn<() => number>(); const stop = vi.fn<() => number>(); const counter = vi.fn<() => number>();
let fixture: NativeRuntimeFixture; let Monitor: new () => SmtcMonitor; const monitors: SmtcMonitor[] = [];
/**
 * 创建真实 SMTC 监控器并登记资源清理。
 * @returns 会话监控器
 */
function monitor(): SmtcMonitor { const result = new Monitor(); monitors.push(result); return result; }
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); start.mockReturnValue(0); counter.mockReturnValue(0); json.mockReturnValue([]);
  fixture = createNativeRuntimeFixture(file, new Map<string, unknown>([['./ffi-loader', { smtc: { smtc_start_monitoring: start, smtc_stop_monitoring: stop, smtc_get_sessions_changed: counter }, callJson: json }]])); Monitor = fixture.read<{ SmtcMonitor: typeof Monitor }>().SmtcMonitor;
});
afterEach(() => { monitors.splice(0).forEach((item) => item.stop()); fixture.dispose(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
describe('SMTC 会话快照与通知差异', () => {
  it('原生启动错误、重复启动停止及变化计数缓存', () => {
    const target = monitor(); target.stop(); start.mockReturnValue(2); expect(() => target.start()).toThrow('DLL returned 2'); start.mockReturnValue(0); target.start(); target.start();
    vi.advanceTimersByTime(500); expect(start).toHaveBeenCalledTimes(2); expect(counter).toHaveBeenCalledTimes(6); expect(json).toHaveBeenCalledOnce();
    target.stop(); target.stop(); expect(stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it('负原生计数不查询快照，非法快照可重试，查询异常通知error后恢复', () => {
    const target = monitor(); const errors = vi.fn(); target.on('error', errors); counter.mockReturnValue(-1); target.start(); expect(json).not.toHaveBeenCalled();
    counter.mockReturnValue(1); json.mockReturnValue(null); vi.advanceTimersByTime(100); vi.advanceTimersByTime(100); expect(json).toHaveBeenCalledTimes(2);
    const failure = new Error('native malformed'); counter.mockImplementationOnce(() => { throw failure; }); vi.advanceTimersByTime(100); expect(errors).toHaveBeenCalledWith(failure);
    json.mockReturnValue([]); vi.advanceTimersByTime(100); expect(vi.getTimerCount()).toBe(1); target.stop();
  });
  it('getMediaSessions 标准化缺省与完整字段，不合法数组返回空', () => {
    const target = monitor(); json.mockReturnValue(null); expect(target.getMediaSessions()).toEqual([]);
    const media = { title: 'Title', artist: 'Artist', albumTitle: 'Album', albumArtist: 'AlbumArtist', genres: ['Genre'], albumTrackCount: 8, trackNumber: 3, thumbnail: 'art' };
    json.mockReturnValue([{ sourceAppId: 'empty' }, { sourceAppId: 'defaults', media: {}, playback: {}, timeline: {} }, { media, sourceAppId: 'full', playback: { playbackStatus: 4, playbackType: 2 }, timeline: { position: 10, duration: 100 } }]);
    expect(target.getMediaSessions()).toEqual([{ sourceAppId: 'empty', media: null, playback: null, timeline: null },
      { sourceAppId: 'defaults', media: { title: '', artist: '', albumTitle: '', albumArtist: '', genres: [], albumTrackCount: 0, trackNumber: 0, thumbnail: null }, playback: { playbackStatus: undefined, playbackType: 0 }, timeline: { position: 0, duration: 0 } },
      { media, sourceAppId: 'full', playback: { playbackStatus: 4, playbackType: 2 }, timeline: { position: 10, duration: 100 } }]);
  });
  it('新会话和移除会话正确通知，空ID忽略', () => {
    const target = monitor(); const added = vi.fn(); const removed = vi.fn(); target.on('session-added', added); target.on('session-removed', removed);
    json.mockReturnValue([{ sourceAppId: 'id' }, {}]); target.start(); expect(added).toHaveBeenCalledExactlyOnceWith('id', null);
    counter.mockReturnValue(1); json.mockReturnValue([]); vi.advanceTimersByTime(100); expect(removed).toHaveBeenCalledExactlyOnceWith('id'); target.stop();
  });
  it.each(['title', 'artist', 'albumTitle', 'albumArtist', 'trackNumber', 'thumbnail'])('媒体属性 %s 单独变化通知，稳定快照不重复通知', (key) => {
    const target = monitor(); const changed = vi.fn(); target.on('session-media-changed', changed);
    json.mockReturnValue([{ sourceAppId: 'id', media: {} }]); target.start(); counter.mockReturnValue(1);
    json.mockReturnValue([{ sourceAppId: 'id', media: { [key]: key === 'trackNumber' ? 2 : 'changed' } }]); vi.advanceTimersByTime(100); expect(changed).toHaveBeenCalledOnce();
    counter.mockReturnValue(2); vi.advanceTimersByTime(100); expect(changed).toHaveBeenCalledOnce(); target.stop();
  });
  it.each(['playbackStatus', 'playbackType'])('播放属性 %s 单独变化通知', (key) => {
    const target = monitor(); const changed = vi.fn(); target.on('session-playback-changed', changed);
    json.mockReturnValue([{ sourceAppId: 'id', playback: { playbackStatus: 4, playbackType: 1 } }]); target.start(); counter.mockReturnValue(1);
    json.mockReturnValue([{ sourceAppId: 'id', playback: { playbackStatus: 4, playbackType: 1, [key]: 2 } }]); vi.advanceTimersByTime(100); expect(changed).toHaveBeenCalledOnce(); target.stop();
  });
  it.each(['position', 'duration'])('时间线 %s 变化小于半秒不通知，达到半秒才通知', (key) => {
    const target = monitor(); const changed = vi.fn(); target.on('session-timeline-changed', changed);
    json.mockReturnValue([{ sourceAppId: 'id', timeline: { position: 0, duration: 0 } }]); target.start(); counter.mockReturnValue(1);
    json.mockReturnValue([{ sourceAppId: 'id', timeline: { [key]: 0.49 } }]); vi.advanceTimersByTime(100); expect(changed).not.toHaveBeenCalled();
    counter.mockReturnValue(2); json.mockReturnValue([{ sourceAppId: 'id', timeline: { [key]: 1 } }]); vi.advanceTimersByTime(100); expect(changed).toHaveBeenCalledOnce(); target.stop();
  });
  it('media/playback/timeline 两者为空无通知，从缺失到存在或反向均通知', () => {
    const target = monitor(); const media = vi.fn(); const playback = vi.fn(); const timeline = vi.fn(); target.on('session-media-changed', media); target.on('session-playback-changed', playback); target.on('session-timeline-changed', timeline);
    json.mockReturnValue([{ sourceAppId: 'id' }]); target.start(); counter.mockReturnValue(1); vi.advanceTimersByTime(100); expect(media).not.toHaveBeenCalled(); expect(playback).not.toHaveBeenCalled(); expect(timeline).not.toHaveBeenCalled();
    counter.mockReturnValue(2); json.mockReturnValue([{ sourceAppId: 'id', media: {}, playback: {}, timeline: {} }]); vi.advanceTimersByTime(100);
    expect(media).toHaveBeenCalledOnce(); expect(playback).toHaveBeenCalledOnce(); expect(timeline).toHaveBeenCalledOnce();
    counter.mockReturnValue(3); json.mockReturnValue([{ sourceAppId: 'id' }]); vi.advanceTimersByTime(100);
    expect(media).toHaveBeenCalledTimes(2); expect(playback).toHaveBeenCalledTimes(2); expect(timeline).toHaveBeenCalledTimes(2); target.stop();
  });
  it('session-added 回调停止时不再创建下一轮定时器', () => {
    const target = monitor(); target.on('session-added', () => target.stop()); json.mockReturnValue([{ sourceAppId: 'id' }]); target.start();
    expect(stop).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
});
