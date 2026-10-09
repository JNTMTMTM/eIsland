/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file client.js
 * @description 独立媒体客户端、缓存查询与异步控制接口。
 * @author 鸡哥
 */
const { createNativeClient } = require('./native-loader');

/** 管理独立 Swift 缓存与共享该缓存的监控器。 */
class MediaClient {
  native;

  monitorCount = 0;

  closed = false;

  /**
   * 创建客户端或监控器。
   * @param options - 桥接资源目录与请求超时配置。
   */
  constructor(options = {}) {
    this.native = createNativeClient(options);
  }

  /**
   * 读取当前媒体状态缓存。
   * @returns 最近一次查询或监听获得的媒体状态，时间线实时推算。
   */
  getStatus() {
    return JSON.parse(this.native.snapshot(0));
  }

  /**
   * 读取轻量播放时间戳。
   * @returns 不包含封面和元数据的轻量时间戳。
   */
  getTimestamp() {
    return JSON.parse(this.native.snapshot(1));
  }

  /**
   * 读取当前可观测播放源。
   * @returns 当前可观测的播放源列表，长度为零或一。
   */
  getMediaSessions() {
    return JSON.parse(this.native.snapshot(2));
  }

  /**
   * 读取原生监控状态。
   * @returns 监控状态，供 JS 事件适配器检查变更与异常退出。
   */
  getMonitorState() {
    return JSON.parse(this.native.snapshot(3));
  }

  /** 注册共享监听；只有第一个监控器启动原生进程。 */
  acquireMonitor() {
    if (this.closed) throw new Error('Media client is closed.');
    if (this.monitorCount === 0) {
      const result = JSON.parse(this.native.start());
      if (!result.success) throw new Error(result.error);
    }
    this.monitorCount += 1;
  }

  /** 最后一个监控器停止时释放监听进程。 */
  releaseMonitor() {
    this.monitorCount = Math.max(0, this.monitorCount - 1);
    if (this.monitorCount === 0) this.native.stop();
  }

  /**
   * 异步执行媒体桥接请求。
   * @param operation - 原生媒体操作。
   * @param value - 已验证的命令参数。
   * @returns 命令发送结果。
   */
  async request(operation, value = 0) {
    if (this.closed) return { success: false, error: 'Media client is closed.' };
    return JSON.parse(await this.native.request(operation, value));
  }

  /**
   * 主动查询并刷新媒体缓存。
   * @returns 主动刷新后的媒体状态；桥接失败时抛出 Error。
   */
  async refresh() {
    const result = await this.request('refresh');
    if (!result.success) throw new Error(result.error);
    return this.getStatus();
  }

  /**
   * 发送播放命令。
   * @returns 播放命令发送结果。
   */
  async play() { return this.request('play'); }

  /**
   * 发送暂停命令。
   * @returns 暂停命令发送结果。
   */
  async pause() { return this.request('pause'); }

  /**
   * 发送下一首命令。
   * @returns 下一首命令发送结果。
   */
  async next() { return this.request('next'); }

  /**
   * 发送上一首命令。
   * @returns 上一首命令发送结果。
   */
  async previous() { return this.request('previous'); }

  /**
   * 发送停止命令。
   * @returns 停止播放命令发送结果。
   */
  async stop() { return this.request('stop'); }

  /**
   * 定位到指定播放位置。
   * @param positionSeconds - 非负且有限的目标位置，单位为秒。
   * @returns 命令发送结果。
   */
  async seek(positionSeconds) {
    if (!Number.isFinite(positionSeconds) || positionSeconds < 0 || positionSeconds >= 9.22e12) {
      throw new RangeError('Seek position must be a finite non-negative number of seconds below 9.22e12.');
    }
    return this.request('seek', positionSeconds);
  }

  /**
   * 设置随机播放模式。
   * @param active - true 开启曲目随机，false 关闭随机。
   * @returns 命令发送结果。
   */
  async setShuffle(active) {
    if (typeof active !== 'boolean') throw new TypeError('Shuffle value must be boolean.');
    return this.request('shuffle', active ? 1 : 0);
  }

  /**
   * 设置循环播放模式。
   * @param mode - 0 关闭，1 单曲循环，2 列表循环。
   * @returns 命令发送结果。
   */
  async setRepeatMode(mode) {
    if (![0, 1, 2].includes(mode)) throw new RangeError('Repeat mode must be 0, 1 or 2.');
    return this.request('repeat', mode);
  }

  /**
   * 设置播放速率。
   * @param rate - 当前桥接支持的正整数播放速度。
   * @returns 命令发送结果。
   */
  async setPlaybackRate(rate) {
    if (!Number.isInteger(rate) || rate <= 0 || rate > 2147483647) {
      throw new RangeError('This media bridge supports positive integer playback rates only.');
    }
    return this.request('rate', rate);
  }

  /** 关闭监听和后台请求；关闭后不可再次启动此客户端。 */
  close() {
    if (this.closed) return;
    this.closed = true;
    this.native.close();
  }
}

let defaultClient;

/**
 * 获取当前环境的默认媒体客户端。
 * @returns 当前 JS 环境的默认客户端，不跨 Worker 共享。
 */
function getDefaultClient() {
  if (!defaultClient || defaultClient.closed) defaultClient = new MediaClient();
  return defaultClient;
}

/** 释放默认客户端，不在模块加载时自动启动监听进程。 */
function shutdown() {
  defaultClient?.close();
  defaultClient = undefined;
}

module.exports = { MediaClient, getDefaultClient, shutdown };
