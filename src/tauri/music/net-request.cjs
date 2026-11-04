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
 * @file net-request.cjs
 * @description 将现有网络代理所需的事件接口接到独立 Node 运行时。
 * @author 鸡哥
 */
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');

/** 将 Node fetch 适配为现有 Electron net.request 使用的事件流。 */
class FetchRequest extends EventEmitter {
  constructor(options) {
    super(); this.options = options; this.headers = new Headers(); this.body = ''; this.controller = new AbortController();
  }

  /** 兼容原网络代理的请求头设置。
   * @param {string} name - 头名称。
   * @param {string} value - 头值。
   */
  setHeader(name, value) { this.headers.set(name, value); }

  /** 缓存原服务写入的文本请求体。
   * @param {string} body - 请求体。
   */
  write(body) { this.body += body; }

  /** 中止正在进行的请求。 */
  abort() { this.controller.abort(); this.emit('abort'); }

  /** 发起请求并转为原代理使用的 Node 响应流。 */
  async end() { try { await this.perform(); } catch (error) { this.emit('error', error); } }

  /** 执行支持重定向、解压和取消的网络请求。
   * @returns {Promise<void>} 响应流已交给原处理器。
   */
  async perform() {
    const method = this.options.method || 'GET';
    const response = await fetch(this.options.url, {
      method, headers: this.headers, signal: this.controller.signal,
      ...(!['GET', 'HEAD'].includes(method.toUpperCase()) ? { body: this.body } : {}),
    });
    const stream = response.body ? Readable.fromWeb(response.body) : Readable.from([]);
    stream.statusCode = response.status;
    stream.headers = Object.fromEntries(response.headers);
    this.controller.signal.addEventListener('abort', () => stream.destroy(), { once: true });
    this.emit('response', stream);
  }
}

module.exports = FetchRequest;
