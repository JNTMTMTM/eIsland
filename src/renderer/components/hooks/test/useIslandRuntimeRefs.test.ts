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
 * @file useIslandRuntimeRefs.test.ts
 * @description 运行时 Ref 容器的默认值、引用身份与通知回调布局提交测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, resetLifecycle } from '../../components/test/contentLifecycleHarness';
import { hookMocks } from '../../test/elementHarness';
import { renderWithHooks, runEffects, unmountHooks } from '../../states/register/hooks/test/authHookHarness';
import { useIslandRuntimeRefs } from '../useIslandRuntimeRefs';
import type { NotificationData } from '../../../store/types';
vi.mock('react', async (load) => ({ ...(await load<typeof import('react')>()), ...hookMocks, ...lifecycleHooks, useLayoutEffect: lifecycleHooks.useEffect }));
beforeEach(resetLifecycle);
afterEach(unmountHooks);
describe('useIslandRuntimeRefs 实际共享引用', () => {
  it('初始化所有运行时引用为明确默认值', () => {
    const setNotification = vi.fn<(data: NotificationData) => void>();
    const result = renderWithHooks(() => useIslandRuntimeRefs({ setNotification })); runEffects();
    expect(Object.fromEntries((Object.keys(result) as (keyof typeof result)[]).map((key) => [key, result[key].current]))).toEqual({
      setNotificationRef: setNotification,
      initRef: false, isHoveringRef: false, enterTimerRef: null, leaveTimerRef: null,
      expandLeaveIdleRef: false, maxExpandLeaveIdleRef: false, idleClickExpandRef: false,
      pendingAnnouncementAfterGuideRef: false, pendingAnnouncementAppVersionRef: '', startupAutoCheckHandledRef: false,
      autoDimEnabledRef: false, autoDimDelayRef: 10, positionLockedRef: false,
    });
  });
  it('重新求值保留已有引用与外部状态，布局提交后更新通知回调', () => {
    const first = vi.fn<(data: NotificationData) => void>(); const second = vi.fn<(data: NotificationData) => void>();
    const previous = renderWithHooks(() => useIslandRuntimeRefs({ setNotification: first })); runEffects();
    previous.initRef.current = true; previous.autoDimDelayRef.current = 20; previous.pendingAnnouncementAppVersionRef.current = '1.0';
    const result = renderWithHooks(() => useIslandRuntimeRefs({ setNotification: second }));
    Object.entries(previous).forEach(([key, ref]) => { expect(result[key as keyof typeof result]).toBe(ref); });
    expect(result.setNotificationRef.current).toBe(first); runEffects(); result.setNotificationRef.current({ title: 'Title', body: 'Body' });
    expect(second).toHaveBeenCalledWith({ title: 'Title', body: 'Body' }); expect(first).not.toHaveBeenCalled();
    expect(result.initRef.current).toBe(true); expect(result.autoDimDelayRef.current).toBe(20); expect(result.pendingAnnouncementAppVersionRef.current).toBe('1.0');
  });
});
