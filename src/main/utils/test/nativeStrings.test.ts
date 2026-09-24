/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * @file nativeStrings.test.ts
 * @description 验证原生插件字符串在转换后释放，避免轮询和图片读取累积 CoTaskMem。
 * @author 鸡哥
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const PLUGINS = [
  { name: 'smtc', prefix: 'smtc', methods: ['get_status', 'get_last_error', 'get_all_sessions', 'get_session', 'get_timestamp'] },
  { name: 'bluetooth', prefix: 'bt', methods: ['get_last_error', 'get_paired_devices', 'get_connected_devices', 'get_all_devices', 'get_device', 'get_monitored_devices', 'get_monitored_device'] },
  { name: 'power', prefix: 'pw', methods: ['get_last_error', 'get_power_info', 'get_monitored_power_info'] },
  { name: 'wifi', prefix: 'wf', methods: ['get_last_error', 'get_wifi_info', 'get_monitored_wifi_info'] },
  { name: 'application-icon', prefix: 'icon', methods: ['get_by_process_name', 'get_by_pid', 'get_by_path', 'get_by_shortcut'] },
  { name: 'screenshot', prefix: 'sc', methods: ['get_last_error', 'capture_primary_display_png', 'capture_all_displays_png', 'get_visible_windows'] },
];

type NativeFunction = (...args: unknown[]) => unknown;
interface OwnedString {
  free: NativeFunction;
}
interface Loader {
  [key: string]: Record<string, NativeFunction> | NativeFunction;
}

function loadPlugin(name: string, prefix: string) {
  const allocations = new Set<object>();
  let returned: string | null = '';
  const free = vi.fn((pointer: unknown) => {
    if (pointer === null) return;
    expect(allocations.delete(pointer as object)).toBe(true);
  });
  const func = (declaration: string, result?: OwnedString): NativeFunction => {
    if (declaration.includes(`${prefix}_free_string(`)) return free;
    return () => {
      if (returned === null) return null;
      const pointer = { value: returned };
      allocations.add(pointer);
      const copied = pointer.value;
      result?.free(pointer);
      return copied;
    };
  };
  const directory = path.resolve('plugins', `eisland-windows-${name}-helper`);
  const filename = path.join(directory, 'ffi-loader.js');
  const cjsModule = { exports: {} as Loader };
  runInNewContext(readFileSync(filename, 'utf8'), {
    Buffer,
    module: cjsModule,
    __dirname: directory,
    require: (id: string) => {
      if (id === 'node:path') return path;
      if (id === 'node:fs') return { accessSync: vi.fn() };
      if (id === 'koffi') {
        return {
          load: () => ({ func }),
          disposable: (type: string, dispose: NativeFunction) => {
            expect(type).toBe('str');
            return { free: dispose };
          },
        };
      }
      throw new Error(`Unexpected dependency: ${id}`);
    },
  }, { filename });
  return { allocations, free, loader: cjsModule.exports, setResult: (value: string | null) => { returned = value; } };
}

describe.each(PLUGINS)('$name native string ownership', ({ name, prefix, methods }) => {
  it('releases every native string during repeated reads, including large covers', () => {
    const runtime = loadPlugin(name, prefix);
    const text = JSON.stringify({ cover: 'a'.repeat(1024 * 1024) });
    runtime.setResult(text);
    const functions = runtime.loader[prefix] as Record<string, NativeFunction>;
    methods.forEach((method) => {
      Array.from({ length: 100 }).forEach(() => {
        expect(functions[`${prefix}_${method}`]('test')).toBe(text);
        expect(runtime.allocations.size).toBe(0);
      });
    });
    expect(runtime.free).toHaveBeenCalledTimes(methods.length * 100);
  });

  it('releases malformed and empty strings and handles null without double free', () => {
    const runtime = loadPlugin(name, prefix);
    const functions = runtime.loader[prefix] as Record<string, NativeFunction>;
    ['', '{malformed', null].forEach((value) => {
      runtime.setResult(value);
      methods.forEach((method) => {
        expect(functions[`${prefix}_${method}`]('test')).toBe(value);
        expect(runtime.allocations.size).toBe(0);
      });
    });
    expect(runtime.free).toHaveBeenCalledTimes(methods.length * 2);
    if (typeof runtime.loader.callJson === 'function') {
      runtime.setResult('{malformed');
      try { runtime.loader.callJson(`${prefix}_${methods[0]}`); } catch { /* 截图插件保留 JSON 解析错误。 */ }
      expect(runtime.allocations.size).toBe(0);
    }
  });
});
