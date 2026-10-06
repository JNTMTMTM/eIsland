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
 * @file sliceStorageFixture.ts
 * @description 两个状态切片测试的局部存储叶边界，记录读写并支持持久化故障注入。
 * @author 鸡哥
 */

import { vi } from 'vitest';
/** 安装可观察的存储叶边界。
 * @returns 存储数据、读写函数与原始存储事件监听器
 */
export default function installStorage() {
  const values = new Map<string, string>();
  const get = vi.fn<(key: string) => string | null>().mockImplementation((key) => values.get(key) ?? null);
  const set = vi.fn<(key: string, value: string) => void>().mockImplementation((key, value) => {
    values.set(key, value);
  });
  const listeners: ((event: {
    key: string | null;
  }) => void)[] = [];
  const listen = vi.fn<(name: string, callback: (event: {
    key: string | null;
  }) => void) => void>().mockImplementation((name, callback) => {
    if (name === 'storage') listeners.push(callback);
  });
  const storage = {
    getItem: get,
    setItem: set
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', {
    localStorage: storage,
    addEventListener: listen,
    location: {
      pathname: '/index.html'
    }
  });
  return {
    values,
    get,
    set,
    storage,
    listen,
    listeners
  };
}
