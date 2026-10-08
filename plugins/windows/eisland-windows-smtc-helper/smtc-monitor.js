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
 * @file smtc-monitor.js
 * @description SMTC 会话实时监控器，替代 @coooookies/windows-smtc-monitor
 * @description 通过 DLL FFI 监听 WinRT 事件，提供与 SMTCMonitor 兼容的 EventEmitter 接口
 */

const { EventEmitter } = require('node:events');
const { smtc, callJson } = require('./ffi-loader');

/** 合并频繁的原生事件，并让 Worker 能及时处理消息和停止请求。 */
const POLL_INTERVAL_MS = 100;

class SmtcMonitor extends EventEmitter {
  constructor() {
    super();
    this._running = false;
    this._cache = new Map();
    this._pollTimer = null;
    this._lastChangeCounter = null;
  }

  /**
   * 启动监控（幂等）
   * 内部启动 DLL 监控线程和 Node 侧轮询循环
   */
  start() {
    if (this._running) return;
    const result = smtc.smtc_start_monitoring();
    if (result !== 0) {
      throw new Error('Failed to start SMTC monitoring (DLL returned ' + result + ')');
    }
    this._running = true;
    this._lastChangeCounter = null;
    this._pollLoop();
  }

  /**
   * 停止监控（幂等）
   */
  stop() {
    if (!this._running) return;
    this._running = false;
    if (this._pollTimer !== null) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }
    smtc.smtc_stop_monitoring();
    this._cache.clear();
    this.removeAllListeners();
  }

  /**
   * 获取当前所有会话快照（同步）
   * @returns {Array<{sourceAppId: string, media: object|null, playback: object|null, timeline: object|null}>}
   */
  getMediaSessions() {
    const sessions = callJson('smtc_get_all_sessions');
    if (!Array.isArray(sessions)) return [];
    return sessions.map((s) => this._normalizeSession(s));
  }

  /**
   * 轮询变更计数，只有快照变化时才复制并解析包含封面的 JSON
   * @private
   */
  _pollLoop() {
    if (!this._running) return;

    try {
      const counter = smtc.smtc_get_sessions_changed();
      if (counter >= 0 && counter !== this._lastChangeCounter) {
        if (this._drainChanges()) this._lastChangeCounter = counter;
      }
    } catch (err) {
      this.emit('error', err);
    }

    if (this._running) {
      this._pollTimer = setTimeout(() => this._pollLoop(), POLL_INTERVAL_MS);
    }
  }

  /**
   * 拉取最新快照，与缓存 diff 后触发事件
   * @private
   */
  _drainChanges() {
    const sessions = callJson('smtc_get_all_sessions');
    if (!Array.isArray(sessions)) return false;

    const currentIds = new Set();

    for (const raw of sessions) {
      const id = raw.sourceAppId;
      if (!id) continue;
      currentIds.add(id);

      const normalized = this._normalizeSession(raw);
      const prev = this._cache.get(id);

      if (!prev) {
        // 新会话
        this._cache.set(id, normalized);
        this.emit('session-added', id, normalized.media);
      } else {
        // 检查各维度变化
        this._emitIfChanged(id, prev, normalized);
        this._cache.set(id, normalized);
      }
    }

    // 检查已移除的会话
    for (const [id] of this._cache) {
      if (!currentIds.has(id)) {
        this._cache.delete(id);
        this.emit('session-removed', id);
      }
    }
    return true;
  }

  /**
   * 比较并触发变更事件
   * @private
   */
  _emitIfChanged(id, prev, curr) {
    // 媒体属性变化
    if (this._mediaChanged(prev.media, curr.media)) {
      this.emit('session-media-changed', id, curr.media);
    }

    // 播放状态变化
    if (this._playbackChanged(prev.playback, curr.playback)) {
      this.emit('session-playback-changed', id, curr.playback);
    }

    // 时间线变化
    if (this._timelineChanged(prev.timeline, curr.timeline)) {
      this.emit('session-timeline-changed', id, curr.timeline);
    }
  }

  /** @private */
  _mediaChanged(a, b) {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return (
      a.title !== b.title ||
      a.artist !== b.artist ||
      a.albumTitle !== b.albumTitle ||
      a.albumArtist !== b.albumArtist ||
      a.trackNumber !== b.trackNumber ||
      a.thumbnail !== b.thumbnail
    );
  }

  /** @private */
  _playbackChanged(a, b) {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return (
      a.playbackStatus !== b.playbackStatus ||
      a.playbackType !== b.playbackType
    );
  }

  /** @private */
  _timelineChanged(a, b) {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return (
      Math.abs(a.position - b.position) >= 0.5 ||
      Math.abs(a.duration - b.duration) >= 0.5
    );
  }

  /**
   * 将 DLL SessionInfo 格式转换为 SMTCMonitor 兼容格式
   * @private
   */
  _normalizeSession(raw) {
    const media = raw.media
      ? {
          title: raw.media.title || '',
          artist: raw.media.artist || '',
          albumTitle: raw.media.albumTitle || '',
          albumArtist: raw.media.albumArtist || '',
          genres: raw.media.genres || [],
          albumTrackCount: raw.media.albumTrackCount || 0,
          trackNumber: raw.media.trackNumber || 0,
          thumbnail: raw.media.thumbnail || null,
        }
      : null;

    const playback = raw.playback
      ? {
          playbackStatus: raw.playback.playbackStatus,
          playbackType: raw.playback.playbackType || 0,
        }
      : null;

    const timeline = raw.timeline
      ? {
          position: raw.timeline.position || 0,
          duration: raw.timeline.duration || 0,
        }
      : null;

    return {
      sourceAppId: raw.sourceAppId,
      media,
      playback,
      timeline,
    };
  }
}

module.exports = { SmtcMonitor };
