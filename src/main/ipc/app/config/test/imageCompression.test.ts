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
 * @file imageCompression.test.ts
 * @description imageCompression 配置契约：任务容量、超时及持久化默认值。
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { IMAGE_EXTENSIONS, MAX_PERSISTED_TASKS, PERSIST_DEBOUNCE_MS } from '../imageCompression';

describe('imageCompression 配置契约', () => {
  it('固定公开配置，避免调用方容量和延迟约定漂移', () => {
    expect([...IMAGE_EXTENSIONS]).toEqual(['jpg', 'jpeg', 'png', 'webp', 'bmp']);
    expect(IMAGE_EXTENSIONS.has('svg')).toBe(false);
    expect(MAX_PERSISTED_TASKS).toBe(200);
    expect(PERSIST_DEBOUNCE_MS).toBe(500);
  });
});
