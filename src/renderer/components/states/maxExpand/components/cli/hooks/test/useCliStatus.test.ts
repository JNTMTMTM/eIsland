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
 * @file useCliStatus.test.ts
 * @description CLI 离场快照暂停、重新进入与异步响应失效回归测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_CLI_STATUS, type CliStatusSnapshot } from '../../types/types';
import { useCliStatus } from '../useCliStatus';
import type { CliProvider } from '../../../../../../../store/types';

const { stateMock, effectMock, refMock, activity } = vi.hoisted(() => ({
  stateMock: vi.fn(), effectMock: vi.fn(), refMock: vi.fn(), activity: { active: true },
}));
vi.mock('react', () => ({
  useState: stateMock, useEffect: effectMock, useRef: refMock,
  useCallback: (callback: unknown) => callback,
}));
vi.mock('../../../../../../hooks/islandContentActivity', () => ({ useIslandContentActive: () => activity.active }));

let states: unknown[];
let refs: Array<{ current: unknown }>;
let stateIndex: number;
let refIndex: number;
let previousDeps: unknown[];
let cleanup: (() => void) | void;
let pendingEffect: (() => void | (() => void)) | undefined;
let resolveGet: (snapshot: CliStatusSnapshot) => void;
let receiveSnapshot: (snapshot: CliStatusSnapshot) => void;
const unsubscribe = vi.fn();
const get = vi.fn();
const subscribe = vi.fn();
const enable = vi.fn();
const codexGet = vi.fn();
const codexSubscribe = vi.fn();
const snapshot = { ...EMPTY_CLI_STATUS, enabled: true, updatedAt: 10 };

beforeEach(() => {
  states = [];
  refs = [];
  previousDeps = [];
  cleanup = undefined;
  pendingEffect = undefined;
  activity.active = true;
  stateMock.mockImplementation((initial: unknown) => {
    const index = stateIndex++;
    if (!(index in states)) states[index] = initial;
    return [states[index], (value: unknown) => { states[index] = value; }];
  });
  refMock.mockImplementation((initial: unknown) => {
    const index = refIndex++;
    refs[index] ??= { current: initial };
    return refs[index];
  });
  effectMock.mockImplementation((effect: () => void | (() => void), deps: unknown[]) => {
    if (deps.some((dep, index) => dep !== previousDeps[index])) {
      pendingEffect = effect;
      previousDeps = deps;
    }
  });
  get.mockImplementation(() => new Promise<CliStatusSnapshot>((resolve) => { resolveGet = resolve; }));
  subscribe.mockImplementation((callback: typeof receiveSnapshot) => { receiveSnapshot = callback; return unsubscribe; });
  codexGet.mockImplementation(() => new Promise<CliStatusSnapshot>(() => {}));
  codexSubscribe.mockReturnValue(unsubscribe);
  vi.stubGlobal('window', { api: {
    claudeCodeStatusGet: get, onClaudeCodeStatusUpdated: subscribe, claudeCodeHookInstall: enable,
    codexStatusGet: codexGet, onCodexStatusUpdated: codexSubscribe,
  } });
});

afterEach(() => {
  cleanup?.();
  vi.unstubAllGlobals();
});

function render(provider: CliProvider = 'claude'): ReturnType<typeof useCliStatus> {
  stateIndex = 0;
  refIndex = 0;
  const result = useCliStatus(provider);
  if (pendingEffect) {
    cleanup?.();
    cleanup = pendingEffect();
    pendingEffect = undefined;
  }
  return result;
}

describe('CLI transition subscriptions', () => {
  it('does not fetch or subscribe while content is inactive', () => {
    activity.active = false;
    render();
    expect(get).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('stops updates on exit and ignores both pending reads and queued event callbacks', async () => {
    render();
    activity.active = false;
    render();
    expect(unsubscribe).toHaveBeenCalledOnce();
    receiveSnapshot(snapshot);
    resolveGet(snapshot);
    await Promise.resolve();
    expect(render().snapshot).toBe(EMPTY_CLI_STATUS);
  });

  it('keeps the previous view on reentry until the latest snapshot arrives', async () => {
    render();
    receiveSnapshot(snapshot);
    activity.active = false;
    render();
    activity.active = true;
    expect(render().snapshot).toBe(snapshot);
    expect(get).toHaveBeenCalledTimes(2);
    const next = { ...snapshot, updatedAt: 20 };
    resolveGet(next);
    await Promise.resolve();
    expect(render().snapshot).toBe(next);
  });

  it('does not let an older initial read overwrite a newer pushed snapshot', async () => {
    render();
    receiveSnapshot(snapshot);
    resolveGet(EMPTY_CLI_STATUS);
    await Promise.resolve();
    expect(render().snapshot).toBe(snapshot);
  });

  it('ignores an action response after switching provider', async () => {
    let resolveEnable!: (result: { snapshot: CliStatusSnapshot; message: string }) => void;
    enable.mockReturnValue(new Promise((resolve) => { resolveEnable = resolve; }));
    const result = render();
    const pendingAction = result.enableMonitor();
    receiveSnapshot(snapshot);
    render('codex');
    resolveEnable({ snapshot, message: 'old-provider-action' });
    await pendingAction;
    expect(render('codex').snapshot).toBe(EMPTY_CLI_STATUS);
    expect(render('codex').actionMessage).toBe('');
    expect(codexGet).toHaveBeenCalledOnce();
  });
});
