/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file media-monitor.d.ts
 * @description 当前播放源事件监控器的公共类型。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import type { MediaClient } from './client';
import type { SessionSnapshot, MediaEvents } from './types';

/** 同一客户端上的多个监控器共享一个原生监听进程。 */
// eslint-disable-next-line import-x/prefer-default-export -- 声明对应 media-monitor.js 的命名导出，保持公共接口一致。
export class MediaMonitor extends EventEmitter {
  /**
   * 创建客户端或监控器。
   * @param client - 默认使用顶层接口的共享客户端。
   */
  constructor(client?: MediaClient);
  /** 幂等启动监控。 */
  start(): void;
  /** 幂等停止监控，保留监听器以供重启。 */
  stop(): void;
  /**
   * 读取当前可观测播放源。
   * @returns 当前播放源快照。
   */
  getMediaSessions(): SessionSnapshot[];
  /**
   * 提供媒体插件接口。
   * @param event - 事件名称。
   * @param listener - 对应事件处理函数。
   * @returns 当前监控器。
   */
  on<E extends keyof MediaEvents>(event: E, listener: MediaEvents[E]): this;
  /**
   * 注册媒体监控事件处理函数。
   * @param event - 自定义事件名称。
   * @param listener - 事件处理函数。
   * @returns 当前监控器。
   */
  on(event: string | symbol, listener: (...args: unknown[]) => void): this;
}
