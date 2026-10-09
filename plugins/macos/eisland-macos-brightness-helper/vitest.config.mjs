/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file vitest.config.mjs
 * @description 独立亮度插件的 Node 环境测试入口。
 * @author 鸡哥
 */
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', pool: 'forks', include: ['test/*Runtime.test.mjs'] },
});
