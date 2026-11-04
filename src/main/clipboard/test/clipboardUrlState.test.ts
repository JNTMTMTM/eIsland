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
 * @file clipboardUrlState.test.ts
 * @description clipboardUrlState 单元测试
 * @author 鸡哥
 * @deprecated Electron 宿主实现已弃用；保留函数与签名供迁移和回归参考，应用入口改用 Tauri。
 */

import { describe, expect, it } from 'vitest';
import { createClipboardUrlState } from '../clipboardUrlState';

describe('createClipboardUrlState', () => {
  it('返回对象包含全部 getter/setter', () => {
    const state = createClipboardUrlState();

    expect(typeof state.getMonitorEnabled).toBe('function');
    expect(typeof state.setMonitorEnabled).toBe('function');
    expect(typeof state.getDetectMode).toBe('function');
    expect(typeof state.setDetectMode).toBe('function');
    expect(typeof state.getBlacklist).toBe('function');
    expect(typeof state.setBlacklist).toBe('function');
  });

  describe('默认值', () => {
    it('monitorEnabled 默认为 true', () => {
      const state = createClipboardUrlState();
      expect(state.getMonitorEnabled()).toBe(true);
    });

    it('detectMode 默认为 http-https', () => {
      const state = createClipboardUrlState();
      expect(state.getDetectMode()).toBe('http-https');
    });

    it('blacklist 默认为空数组', () => {
      const state = createClipboardUrlState();
      expect(state.getBlacklist()).toEqual([]);
    });
  });

  describe('setter 更新后 getter 反映变化', () => {
    it('setMonitorEnabled / getMonitorEnabled', () => {
      const state = createClipboardUrlState();

      state.setMonitorEnabled(false);
      expect(state.getMonitorEnabled()).toBe(false);

      state.setMonitorEnabled(true);
      expect(state.getMonitorEnabled()).toBe(true);
    });

    it('setDetectMode / getDetectMode', () => {
      const state = createClipboardUrlState();

      state.setDetectMode('https-only');
      expect(state.getDetectMode()).toBe('https-only');

      state.setDetectMode('domain-only');
      expect(state.getDetectMode()).toBe('domain-only');

      state.setDetectMode('http-https');
      expect(state.getDetectMode()).toBe('http-https');
    });

    it('setBlacklist / getBlacklist', () => {
      const state = createClipboardUrlState();

      const list = ['example.com', 'test.org'];
      state.setBlacklist(list);
      expect(state.getBlacklist()).toBe(list);

      state.setBlacklist([]);
      expect(state.getBlacklist()).toEqual([]);
    });
  });

  it('多个实例状态互相独立', () => {
    const a = createClipboardUrlState();
    const b = createClipboardUrlState();

    a.setMonitorEnabled(false);
    a.setDetectMode('https-only');
    a.setBlacklist(['blocked.com']);

    expect(b.getMonitorEnabled()).toBe(true);
    expect(b.getDetectMode()).toBe('http-https');
    expect(b.getBlacklist()).toEqual([]);
  });
});
