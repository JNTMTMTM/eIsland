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
 * @file localPreview.test.ts
 * @description 验证本地预览覆盖所有阶段，动作仅修改内存并保持订阅隔离。
 * @author 鸡哥
 */
import { expect, it, vi } from 'vitest';
import { createLocalPreview, LOCAL_PHASES } from '../renderer/local/localPreview';

it('renders every stage without reading signing configuration or checking updates', async () => {
  const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Preview must not access the network'));
  const preview = createLocalPreview();
  await LOCAL_PHASES.reduce(async (previous, phase) => {
    await previous;
    preview.setPhase(phase);
    expect((await preview.api.getState()).phase).toBe(phase);
  }, Promise.resolve());
  await preview.api.inspect('github');
  expect((await preview.api.getState()).phase).toBe('ready');
  expect((await preview.api.getState()).source).toBe('github');
  await preview.api.prepare();
  expect((await preview.api.getState()).phase).toBe('prepared');
  await preview.api.install();
  expect((await preview.api.getState()).phase).toBe('complete');
  await preview.api.launch();
  expect((await preview.api.getState()).phase).toBe('welcome');
  expect(fetcher).not.toHaveBeenCalled();
});

it('notifies and unsubscribes listeners without sharing mutable state', async () => {
  const preview = createLocalPreview();
  const listener = vi.fn();
  const off = preview.api.onState(listener);
  preview.setPhase('error');
  expect(listener).toHaveBeenCalledOnce();
  const snapshot = await preview.api.getState();
  snapshot.phase = 'installing';
  expect((await preview.api.getState()).phase).toBe('error');
  off();
  await preview.api.dismissError();
  expect((await preview.api.getState()).phase).toBe('welcome');
  expect(listener).toHaveBeenCalledOnce();
});
