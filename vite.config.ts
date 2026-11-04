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
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** 提供截图静态资源，仅在 Tauri 构建中替换 Electron 入口。
 * @returns 开发服务器和生产构建共用的资源插件。
 */
function captureAssets(): Plugin {
  const names = ['capture.html', 'capture.js', 'capture.css'];
  const source = (name: string): string => {
    const content = readFileSync(resolve(__dirname, 'resources', name), 'utf8');
    return name === 'capture.js' ? content.replace("require('electron')", 'window.__EISLAND_CAPTURE__') : content;
  };
  return {
    name: 'eisland-capture-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split('?')[0]?.slice(1);
        if (!name || !names.includes(name)) { next(); return; }
        const contentType = { 'capture.html': 'text/html', 'capture.css': 'text/css', 'capture.js': 'text/javascript' };
        response.setHeader('Content-Type', contentType[name as keyof typeof contentType]);
        response.end(source(name));
      });
    },
    generateBundle() {
      names.forEach((name) => this.emitFile({ type: 'asset', fileName: name, source: source(name) }));
    },
  };
}

export default defineConfig({
  root: 'src/renderer',
  base: './',
  publicDir: resolve(__dirname, 'src/renderer/public'),
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '127.0.0.1' },
  plugins: [react(), tailwindcss(), captureAssets()],
  build: {
    outDir: resolve(__dirname, 'out/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries([
        'DynamicIslandIndex.html', 'DynamicIslandStandalone.html', 'DynamicIslandSplash.html',
        'DynamicIslandGuide.html', 'DynamicIslandTrayMenu.html', 'DynamicIslandAibackground/index.html',
      ].map((page) => [page, resolve(__dirname, 'src/renderer/html', page)])),
    },
  },
});
