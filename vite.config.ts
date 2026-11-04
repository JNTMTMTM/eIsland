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

/** @file vite.config.ts
 * @description Tauri 多页面构建，复用现有 React 页面并提供截图覆盖层资源。
 * @author 鸡哥
 */
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** 所有窗口直接加载原生桌面模块，不再注入兼容 preload。
 * @returns 统一页面模块入口插件。
 */
function nativeDesktopPages(): Plugin {
  return {
    name: 'eisland-native-desktop-pages',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/<head(?:\s[^>]*)?>/i, '$&<script type="module" src="/tauri-bootstrap.ts"></script>'),
    },
  };
}

export default defineConfig({
  root: 'src/renderer',
  base: './',
  publicDir: resolve(__dirname, 'src/renderer/public'),
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '127.0.0.1' },
  plugins: [react(), tailwindcss(), nativeDesktopPages()],
  build: {
    outDir: resolve(__dirname, 'out/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        ...Object.fromEntries([
          'DynamicIslandIndex.html', 'DynamicIslandStandalone.html', 'DynamicIslandSplash.html',
          'DynamicIslandGuide.html', 'DynamicIslandTrayMenu.html', 'DynamicIslandAibackground/index.html',
        ].map((page) => [page, resolve(__dirname, 'src/renderer/html', page)])),
        capture: resolve(__dirname, 'src/renderer/capture.html'),
      },
    },
  },
});
