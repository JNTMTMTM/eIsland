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
 * @file mediaKey.test.ts
 * @description 媒体虚拟按键的命令编码、成功与失败回调测试。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendMediaVirtualKey } from '../mediaKey';
const execute = vi.hoisted(() => vi.fn<(command: string, callback: (error: Error | null) => void) => void>());
vi.mock('child_process', () => ({ exec: execute }));
beforeEach(() => { execute.mockReset(); });
describe('sendMediaVirtualKey', () => {
  it.each([0xb0, 0xb1, 0xb2, 0xb3])('encodes key %d as UTF-16LE with press and release instructions', (code) => {
    sendMediaVirtualKey(code);
    expect(execute).toHaveBeenCalledOnce();
    const [[command]] = execute.mock.calls;
    expect(command).toMatch(/^powershell.exe -NonInteractive -NoProfile -EncodedCommand [A-Za-z0-9+/=]+$/);
    const encoded = command.split(' ').at(-1)!;
    const decoded = Buffer.from(encoded, 'base64').toString('utf16le');
    expect(decoded).toContain('[DllImport("user32.dll")]');
    expect(decoded).toContain(`[MediaKey]::keybd_event(${  code  }, 0, 0, [IntPtr]::Zero)`);
    expect(decoded).toContain(`[MediaKey]::keybd_event(${  code  }, 0, 2, [IntPtr]::Zero)`);
    expect(decoded.match(/::keybd_event/g)).toHaveLength(2);
  });
  it('does not log an error after a successful command', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMediaVirtualKey(0xb3);
    const [[, callback]] = execute.mock.calls;
    callback(null);
    expect(log).not.toHaveBeenCalled();
  });
  it('logs a failed command callback without throwing', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    sendMediaVirtualKey(0xb3);
    const [[, callback]] = execute.mock.calls;
    expect(() => callback(new Error('PowerShell unavailable'))).not.toThrow();
    expect(log).toHaveBeenCalledWith('[Media] virtual key error:', 'PowerShell unavailable');
  });
});
