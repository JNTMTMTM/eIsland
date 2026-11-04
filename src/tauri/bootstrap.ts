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
 * @file bootstrap.ts
 * @description 初始化 Tauri 页面原生 API、窗口拖动和渲染就绪通知。
 * @author 鸡哥
 */
import api from './api';
import { desktop, readyForDesktop } from './runtime';

Object.defineProperty(window, 'api', { value: api, configurable: false, writable: false });
Object.defineProperty(window, 'desktop', { value: desktop, configurable: false, writable: false });

/** DOM 创建后绑定原生窗口拖动，并在事件就绪后通知 Rust。
 * @returns 页面初始化完成。
 */
async function mountDesktop(): Promise<void> {
  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    let element: Element | null = event.target;
    while (element) {
      const region = getComputedStyle(element).getPropertyValue('-webkit-app-region').trim();
      if (region === 'no-drag' || element.matches('button,input,textarea,select,a')) return;
      if (region === 'drag' || element.hasAttribute('data-tauri-drag-region')) {
        desktop.send('window:start-dragging'); return;
      }
      element = element.parentElement;
    }
  });
  await readyForDesktop();
  desktop.send('window:renderer-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // eslint-disable-next-line promise/prefer-await-to-then -- DOM 初始化事件须同步返回。
    mountDesktop().catch(console.error);
  }, { once: true });
} else {
  // eslint-disable-next-line promise/prefer-await-to-then -- 入口模块不能阻塞其他页面模块加载。
  mountDesktop().catch(console.error);
}
