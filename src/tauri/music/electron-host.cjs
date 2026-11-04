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
 * @file electron-host.cjs
 * @description 既有音乐服务的窄宿主适配层，仅提供所需的存储、网络和隔离验证窗口接口。
 * @author 鸡哥
 */
const { EventEmitter } = require('node:events');
const FetchRequest = require('./net-request.cjs');

const handlers = globalThis.__eislandMusicHandlers ??= new Map();
const host = (operation, args = {}) => globalThis.__eislandMusicRpc(operation, args);
const send = (channel, ...args) => globalThis.__eislandMusicEvent(channel, args);
const app = {
  isPackaged: true,
  /** 音乐辅助进程加载时应用已就绪。
   * @returns {boolean} 始终就绪。
   */
  isReady: () => true,
  /** 兼容原登录模块的就绪等待。 */
  whenReady: async () => {},
  /** 返回 Rust 提供的应用数据目录。
   * @param {string} name - 路径名称。
   * @returns {string} 数据目录。
   */
  getPath: (name) => {
    if (name !== 'userData') throw new Error(`Unsupported music app path: ${name}`);
    return process.env.EISLAND_MUSIC_DATA;
  },
};

const authSession = {
  beforeRequest: null, beforeHeaders: null,
  webRequest: {
    onBeforeRequest: (filter, callback) => { authSession.beforeRequest = { filter, callback }; },
    onBeforeSendHeaders: (filter, callback) => { authSession.beforeHeaders = { filter, callback }; },
    onHeadersReceived: () => {}, onCompleted: () => {}, onErrorOccurred: () => {},
  },
  cookies: { get: () => host('cookies') },
  clearStorageData: () => host('clear'),
  flushStorageData: async () => {},
};

/** 只承接原登录服务所需的隔离验证窗口操作。 */
class BrowserWindow extends EventEmitter {
  constructor(options) {
    super(); this.options = options; this.destroyed = false; this.created = false; this.tail = Promise.resolve(); this.userAgent = '';
    this.webContents = {
      setUserAgent: (agent) => { this.userAgent = agent; },
      executeJavaScript: async (script) => {
        await this.tail;
        const response = await host('eval', { script });
        if (response.request && authSession.beforeHeaders) authSession.beforeHeaders.callback(response.request, () => {});
        return response.result;
      },
    };
  }

  /** 将宿主窗口变更按调用顺序发送，验证 Promise 不占用此队列。
   * @param {string} operation - 宿主操作。
   * @param {object} args - 操作参数。
   * @returns {Promise<unknown>} 宿主结果。
   */
  enqueue(operation, args = {}) {
    const previous = this.tail;
    const pending = (async () => { await previous; return host(operation, args); })();
    this.tail = (async () => { try { await pending; } catch (error) { console.error('[Music host]', error.message); } })();
    return pending;
  }

  /** 加载已有安全脚本页面。
   * @param {string} url - 原安全资源服务器地址。
   * @returns {Promise<unknown>} 页面完成加载。
   */
  async loadURL(url) {
    if (!this.created) {
      let redirect = '';
      authSession.beforeRequest?.callback({}, (result) => { redirect = result.redirectURL; });
      await this.enqueue('open', { url, redirect, userAgent: this.userAgent }); this.created = true;
      return true;
    }
    return this.enqueue('navigate', { url });
  }

  /** 读取本地销毁标记。
   * @returns {boolean} 是否已销毁。
   */
  isDestroyed() { return this.destroyed; }

  /** Tauri 没有默认窗口菜单。 */
  setMenuBarVisibility() {}

  /** 更新验证窗口标题。
   * @param {string} title - 标题。
   */
  setTitle(title) { this.enqueue('title', { title }); }

  /** 更新验证窗口尺寸。
   * @param {number} width - 宽度。
   * @param {number} height - 高度。
   */
  setSize(width, height) { this.enqueue('size', { width, height }); }

  /** 将验证窗口居中。 */
  center() { this.enqueue('center'); }

  /** 显示验证窗口。 */
  show() { this.enqueue('show'); }

  /** 聚焦验证窗口。 */
  focus() { this.enqueue('focus'); }

  /** 隐藏验证窗口。 */
  hide() { this.enqueue('hide'); }

  /** 销毁验证窗口。 */
  destroy() { this.destroyed = true; globalThis.__eislandCancelMusicEvaluations(); this.enqueue('destroy'); }

  /** 复用原设置广播，不枚举验证窗口或暴露凭据。
   * @returns {object[]} 广播目标。
   */
  static getAllWindows() { return [{ isDestroyed: () => false, webContents: { send, id: 0 } }]; }
}

module.exports = {
  app, BrowserWindow,
  handlers,
  ipcMain: {
    /** 注册现有音乐 IPC 处理器。
     * @param {string} channel - 通道。
     * @param {Function} handler - 原处理器。
     * @returns {Map} 处理器映射。
     */
    handle: (channel, handler) => handlers.set(channel, handler) },
  net: {
    /** 创建兼容请求。
     * @param {object} options - 原网络选项。
     * @returns {FetchRequest} 请求。
     */
    request: (options) => new FetchRequest(options) },
  session: {
    /** 返回专用验证会话。
     * @returns {object} 会话适配。
     */
    fromPartition: () => authSession },
};
