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
 * @file useIslandBackgroundVideoSync.test.ts
 * @description 灵动岛视频同步 Hook 的参数限值、末尾循环、播放失败及原生事件订阅清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, vi } from 'vitest';
import { lifecycleHooks, resetLifecycle, unmountHooks } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { useIslandBackgroundVideoSync } from '../useIslandBackgroundVideoSync';
import { registerVideoLoopTests } from './backgroundVideoHarness';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks }));
beforeEach(() => { resetLifecycle(); vi.clearAllMocks(); });
afterEach(() => { unmountHooks(); });
registerVideoLoopTests('useIslandBackgroundVideoSync', useIslandBackgroundVideoSync);
