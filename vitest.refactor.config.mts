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
 * @file vitest.refactor.config.mts
 * @description 复用工具箱配置，审计本次更新、设置、引导和启动业务完整文件覆盖率。
 * @author 鸡哥
 */
import { defineConfig } from 'vitest/config';
import toolboxConfig, { toolboxSourceRoots } from './vitest.toolbox.config.mts';

const settings = 'src/renderer/components/states/maxExpand/components/setting';
const components = 'src/renderer/components';
export const refactorSourcePatterns = [
  ...toolboxSourceRoots.map((root) => `${root}/**/*.{ts,tsx,js,jsx,mts,cts}`),
  'src/renderer/api/update/**/*.{ts,tsx,js,jsx,mts,cts}',
  `${components}/components/DynamicIslandGuidePages/update/**/*.{ts,tsx,js,jsx,mts,cts}`,
  `${settings}/components/update/**/*.{ts,tsx,js,jsx,mts,cts}`,
  `${settings}/hooks/{useSettingsConfigurationEffects,useSettingsSyncEffects,useUpdateSettingsState}.ts`,
  `${settings}/config/settingsTabConfig.ts`,
  `${components}/config/dynamicIslandUpdateSource.ts`,
  `${components}/hooks/useIslandStartupAnnouncements.ts`,
  `${components}/DynamicIslandGuide.tsx`,
];
const testPatterns = [
  ...(toolboxConfig.test?.include || []),
  'src/renderer/api/update/**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}',
  `${components}/components/DynamicIslandGuidePages/update/**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${settings}/components/update/**/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${settings}/hooks/test/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${settings}/config/test/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${components}/config/test/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${components}/hooks/test/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
  `${components}/test/*.{test,spec}.{ts,tsx,js,jsx,mts,cts}`,
];
export default defineConfig({
  ...toolboxConfig,
  test: {
    ...toolboxConfig.test,
    name: 'refactor',
    include: testPatterns,
    coverage: {
      ...toolboxConfig.test?.coverage,
      include: refactorSourcePatterns,
      reportsDirectory: process.env.EISLAND_REFACTOR_COVERAGE_DIR || 'coverage/refactor/renderer',
    },
  },
});
