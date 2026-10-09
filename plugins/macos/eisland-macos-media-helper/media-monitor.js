/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file media-monitor.js
 * @description 将 Swift 缓存变更转换为与 Windows 插件兼容的媒体事件。
 * @author 鸡哥
 */
const { EventEmitter } = require('node:events');
// eslint-disable-next-line import-x/extensions -- CommonJS 使用无扩展名路径，同名 .d.ts 使解析器误判扩展名。
const { getDefaultClient } = require('./client');

const POLL_INTERVAL_MS = 100;
const TIMELINE_INTERVAL_MS = 500;

/** 当前播放源监控器；事件中的移除表示不再是当前可观测源。 */
class MediaMonitor extends EventEmitter {
  client;

  running = false;

  timer = null;

  cache = new Map();

  lastRevision = -1;

  lastTimelineAt = 0;

  lastError = null;

  /**
   * 创建客户端或监控器。
   * @param client - 可指定独立客户端；默认与顶层查询接口共享缓存。
   */
  constructor(client = getDefaultClient()) {
    super();
    this.client = client;
  }

  /** 启动监控，重复调用不增加引用计数。 */
  start() {
    if (this.running) return;
    this.client.acquireMonitor();
    this.running = true;
    this.lastRevision = -1;
    this.lastError = null;
    this.poll();
  }

  /** 停止监控，保留监听器以便再次启动。 */
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.cache.clear();
    this.client.releaseMonitor();
  }

  /**
   * 读取当前可观测播放源。
   * @returns 当前可观测的播放源快照，长度为零或一。
   */
  getMediaSessions() {
    return this.client.getMediaSessions();
  }

  /** 仅在原生缓存变化时传输封面；时间线单独轻量采样。 */
  poll() {
    if (!this.running) return;
    const state = this.client.getMonitorState();
    const now = Date.now();
    if (state.revision !== this.lastRevision) {
      this.lastRevision = state.revision;
      this.update(this.client.getMediaSessions());
    } else if (now - this.lastTimelineAt >= TIMELINE_INTERVAL_MS && this.cache.size > 0) {
      const timestamp = this.client.getTimestamp();
      if (timestamp.timeline) {
        this.cache.forEach((session) => {
          this.updateTimeline(session.sourceAppId, session, {
            position: timestamp.timeline.position,
            duration: timestamp.timeline.endTime,
          });
        });
      }
    }
    if (now - this.lastTimelineAt >= TIMELINE_INTERVAL_MS) this.lastTimelineAt = now;
    if (!this.running) return;
    if (!state.running) this.stop();
    if (state.error && state.error !== this.lastError) {
      this.lastError = state.error;
      this.emit('error', new Error(state.error));
    } else if (!state.error) {
      this.lastError = null;
    }
    if (this.running) this.timer = setTimeout(() => this.poll(), POLL_INTERVAL_MS);
  }

  /**
   * 将原生快照转换为媒体事件。
   * @param sessions - 原生返回的完整快照；先移除旧源，再新增当前源。
   */
  update(sessions) {
    const currentIds = new Set(sessions.map((session) => session.sourceAppId));
    Array.from(this.cache.keys()).forEach((id) => {
      if (!this.running || currentIds.has(id)) return;
      this.cache.delete(id);
      this.emit('session-removed', id);
    });
    sessions.forEach((session) => {
      if (!this.running) return;
      const id = session.sourceAppId;
      const previous = this.cache.get(id);
      // 保留上次已发布的位置，让小幅更新累计到阈值后仍能触发时间线事件。
      this.cache.set(id, previous ? { ...session, timeline: previous.timeline } : session);
      if (!previous) {
        this.emit('session-added', id, session.media);
        return;
      }
      if (JSON.stringify(previous.media) !== JSON.stringify(session.media)) {
        this.emit('session-media-changed', id, session.media);
      }
      if (!this.running) return;
      if (JSON.stringify(previous.playback) !== JSON.stringify(session.playback)) {
        this.emit('session-playback-changed', id, session.playback);
      }
      if (this.running) this.updateTimeline(id, previous, session.timeline);
    });
  }

  /**
   * 在达到变化阈值时发布播放位置。
   * @param id - Bundle ID。
   * @param previous - 上次已发布快照。
   * @param timeline - 秒单位的新时间线。
   */
  updateTimeline(id, previous, timeline) {
    const old = previous.timeline;
    if (old && timeline && Math.abs(old.position - timeline.position) < 0.5 && Math.abs(old.duration - timeline.duration) < 0.5) return;
    if (!old && !timeline) return;
    const cached = this.cache.get(id);
    if (cached) cached.timeline = timeline;
    this.emit('session-timeline-changed', id, timeline);
  }
}

module.exports = { MediaMonitor };
