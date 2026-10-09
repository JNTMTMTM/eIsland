/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file client.d.ts
 * @description 独立媒体客户端的公共类型。
 * @author 鸡哥
 */
import type { ClientOptions, MediaStatus, TimestampInfo, SessionSnapshot, CommandResult } from './types';

/** 独立客户端，支持同时在主线程和 Worker 中使用不同实例。 */
// eslint-disable-next-line import-x/prefer-default-export -- 声明对应 client.js 的命名导出，保持公共接口一致。
export class MediaClient {
  /**
   * 创建客户端或监控器。
   * @param options - 桥接资源目录与超时配置。
   */
  constructor(options?: ClientOptions);
  /**
   * 读取当前媒体状态缓存。
   * @returns 最近的媒体缓存；首次 refresh 或监控更新前为不可用。
   */
  getStatus(): MediaStatus;
  /**
   * 读取轻量播放时间戳。
   * @returns 推算后的轻量时间戳。
   */
  getTimestamp(): TimestampInfo;
  /**
   * 读取当前可观测播放源。
   * @returns 当前播放源列表，长度为零或一。
   */
  getMediaSessions(): SessionSnapshot[];
  /**
   * 主动查询并刷新媒体缓存。
   * @returns 主动查询后的状态，桥接失败时拒绝 Promise。
   */
  refresh(): Promise<MediaStatus>;
  /**
   * 发送播放命令。
   * @returns 播放命令发送结果。
   */
  play(): Promise<CommandResult>;
  /**
   * 发送暂停命令。
   * @returns 暂停命令发送结果。
   */
  pause(): Promise<CommandResult>;
  /**
   * 发送下一首命令。
   * @returns 下一首命令发送结果。
   */
  next(): Promise<CommandResult>;
  /**
   * 发送上一首命令。
   * @returns 上一首命令发送结果。
   */
  previous(): Promise<CommandResult>;
  /**
   * 发送停止命令。
   * @returns 停止命令发送结果。
   */
  stop(): Promise<CommandResult>;
  /**
   * 定位到指定播放位置。
   * @param positionSeconds - 非负目标位置，单位为秒。
   * @returns 命令发送结果。
   */
  seek(positionSeconds: number): Promise<CommandResult>;
  /**
   * 设置随机播放模式。
   * @param active - true 开启曲目随机，false 关闭。
   * @returns 命令发送结果。
   */
  setShuffle(active: boolean): Promise<CommandResult>;
  /**
   * 设置循环播放模式。
   * @param mode - 0 关闭，1 单曲，2 列表。
   * @returns 命令发送结果。
   */
  setRepeatMode(mode: number): Promise<CommandResult>;
  /**
   * 设置播放速率。
   * @param rate - 当前桥接支持的正整数速率。
   * @returns 命令发送结果。
   */
  setPlaybackRate(rate: number): Promise<CommandResult>;
  /** 取消监听与后台请求；该客户端关闭后不可复用。 */
  close(): void;
}
