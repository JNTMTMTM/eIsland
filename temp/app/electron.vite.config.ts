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
 * @file electron.vite.config.ts
 * @description 分别构建 main、隔离 preload 与 React renderer，仅注入公开更新配置。
 * @author 鸡哥
 */
import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { publicKey } from './scripts/config.mjs';

export default defineConfig({
  main: {
    define: {
      __ADAPTER_PREVIEW__: JSON.stringify(process.env.EISLAND_ADAPTER_PREVIEW === '1'),
      __ADAPTER_PUBLIC_KEY__: JSON.stringify(publicKey()),
      __ADAPTER_COS_URL__: JSON.stringify(process.env.EISLAND_ADAPTER_COS_URL || ''),
      __ADAPTER_OSS_URL__: JSON.stringify(process.env.EISLAND_ADAPTER_OSS_URL || ''),
    },
    build: { rollupOptions: { input: { index: resolve('main/index.ts'), publisher: resolve('main/publisher.ts') } } },
  },
  preload: { build: { rollupOptions: { input: resolve('preload/index.ts') } } },
  renderer: { root: resolve('renderer'), resolve: { dedupe: ['react', 'react-dom'] }, plugins: [react(), {
    name: 'adapter-development-csp', apply: 'serve',
    transformIndexHtml: (html: string) => html.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'").replace("connect-src 'self'", "connect-src 'self' ws:"),
  }], build: { rollupOptions: { input: resolve('renderer/index.html') } } },
});
