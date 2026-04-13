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
 */

/**
 * @file chromiumFlags.ts
 * @description Chromium 性能优化标志模块
 * @description 应用 Electron/Chromium 性能优化命令行开关
 * @author 鸡哥
 */

import type { App } from 'electron';

/**
 * 应用 Chromium 性能优化标志
 * @description 配置 Electron/Chromium 命令行开关以优化性能和资源使用
 * @param app - Electron 应用实例
 */
export function applyChromiumPerformanceFlags(app: App): void {
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-background-timer-throttling');

  app.commandLine.appendSwitch(
    'disable-features',
    [
      'SpareRendererForSitePerProcess',
      'HardwareMediaKeyHandling',
      'MediaSessionService',
      'WebRtcHideLocalIpsWithMdns',
      'CalculateNativeWinOcclusion',
      'WinRetrieveSuggestionsOnlyOnDemand',
    ].join(','),
  );

  app.commandLine.appendSwitch('enable-features', 'BackForwardCache');
  app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
  app.commandLine.appendSwitch('disable-speech-api');
  app.commandLine.appendSwitch('disable-print-preview');
  app.commandLine.appendSwitch('disable-component-update');
  app.commandLine.appendSwitch('disable-breakpad');
  app.commandLine.appendSwitch('disable-domain-reliability');
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128 --lite-mode');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
}
