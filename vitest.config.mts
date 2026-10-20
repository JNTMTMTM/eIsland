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
 * @file vitest.config.mts
 * @description 按主进程、预加载、共享模块、原生插件与渲染进程划分 Vitest 测试项目。
 * @author 鸡哥
 */

import { coverageConfigDefaults, defineConfig } from 'vitest/config';

const nativeIntegrationTests = [
  'src/main/installer/test/*.integration.test.ts',
  'src/main/window/test/screenshotProcess.test.ts',
];

/** 真实 Windows 插件测试会读取设备或发送系统命令，独立串行执行。 */
const pluginIntegrationTests = [
  'plugins/windows/**/test/{icon,bluetooth,brightness,fullscreen-detector,hardware-info,power,screenshot,smtc-helper,volume-analyzer,volume,wifi}.test.ts',
  'plugins/windows/**/test/{bluetooth,brightness,power,volume,wifi}.monitor.test.ts',
  'plugins/windows/**/test/{performance-monitor,windows-toast-listener}.polling.test.ts',
  'plugins/windows/**/test/windows-toast-listener.test.ts',
  'plugins/windows/**/test/smtc-helper.{play,pause,next,previous,timestamp}.test.ts',
];

export default defineConfig({
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      // 保留覆盖率目录中的源码哈希与不可达审计；每轮报告仍由报告器覆盖。
      clean: false,
      include: ['src/**/*.{ts,tsx,js}', 'plugins/*/*/*.js'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/test/**',
        ...(process.platform !== 'darwin' ? ['plugins/macos/**'] : []),
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: { label: 'main', color: 'yellow' },
          include: ['src/main/**/*.test.{ts,tsx}'],
          exclude: nativeIntegrationTests,
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'main-integration', color: 'yellow' },
          include: nativeIntegrationTests,
          // 真实进程扫描、安装和终止在单元测试释放负载后独占执行阶段。
          sequence: { groupOrder: 1 },
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'preload', color: 'cyan' },
          include: ['src/preload/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'shared', color: 'green' },
          include: ['src/shared/**/*.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'plugins', color: 'blue' },
          include: ['plugins/**/*.{test,spec}.{ts,tsx,js,mjs,cjs,mts,cts}'],
          exclude: pluginIntegrationTests,
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'plugins-integration', color: 'blue' },
          // 其他平台仍执行插件单元测试；真实 Windows 测试由 Windows CI 执行。
          include: process.platform === 'win32' ? pluginIntegrationTests : [],
          sequence: { groupOrder: 1 },
          fileParallelism: false,
          testTimeout: 15000,
        },
      },
      {
        extends: true,
        test: {
          name: { label: 'renderer', color: 'magenta' },
          include: ['src/renderer/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
});
