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
 * @description Electron + Vite 构建配置，定义 main、preload、renderer 的打包入口与输出目录
 * @author 鸡哥
 */

import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin, type UserConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const e2eNativeModules = [
  '@eisland/windows-smtc-helper',
  '@eisland/windows-volume-helper',
  '@eisland/windows-brightness-helper',
  '@eisland/windows-application-icon-helper',
];

export default defineConfig(({ mode }): UserConfig => ({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: mode === 'e2e' ? e2eNativeModules : [] })],
    define: { 'process.env.EISLAND_E2E': JSON.stringify(mode === 'e2e' ? '1' : '') },
    resolve: {
      alias: mode === 'e2e'
        ? e2eNativeModules.map((find) => ({ find, replacement: resolve(__dirname, 'e2e/native.ts') }))
        : [],
    },
    build: {
      sourcemap: mode === 'development' ? 'inline' : false,
      outDir: mode === 'e2e' ? 'e2e/out/main' : 'out/main',
      rollupOptions: {
        ...(mode === 'e2e' ? { output: { inlineDynamicImports: true } } : {}),
        input: mode === 'e2e'
          ? { index: resolve(__dirname, 'e2e/main.mjs') }
          : {
            index: resolve(__dirname, 'src/main/index.ts'),
            smtcWorker: resolve(__dirname, 'src/main/smtcWorker.ts'),
          }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      sourcemap: mode === 'development' ? 'inline' : false,
      outDir: mode === 'e2e' ? 'e2e/out/preload' : 'out/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    publicDir: resolve(__dirname, 'src/renderer/public'),
    build: {
      sourcemap: mode === 'development' ? 'inline' : false,
      outDir: mode === 'e2e' ? 'e2e/out/renderer' : 'out/renderer',
      rollupOptions: {
        input: {
          DynamicIslandIndex: resolve(__dirname, 'src/renderer/html/DynamicIslandIndex.html'),
          DynamicIslandStandalone: resolve(__dirname, 'src/renderer/html/DynamicIslandStandalone.html'),
          DynamicIslandAibackground: resolve(__dirname, 'src/renderer/html/DynamicIslandAibackground/index.html'),
          DynamicIslandSplash: resolve(__dirname, 'src/renderer/html/DynamicIslandSplash.html'),
          DynamicIslandGuide: resolve(__dirname, 'src/renderer/html/DynamicIslandGuide.html')
        }
      },
    },
    plugins: [react(), tailwindcss()]
  }
}));
