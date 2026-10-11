/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file vitest.config.mjs
 * @description 使用独立 Node 进程验证原生插件，保留真实定时器与子进程生命周期。
 * @author 鸡哥
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { provider: 'v8', include: ['*.js'], reporter: [['text', { skipFull: false }], 'json', 'json-summary', 'html'], reportsDirectory: 'coverage/js' },
    pool: 'forks',
    include: ['test/*Runtime.test.mjs'],
    testTimeout: 10000,
  },
});
