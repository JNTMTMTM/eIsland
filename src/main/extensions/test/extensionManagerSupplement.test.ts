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
 * @file extensionManagerSupplement.test.ts
 * @description 扩展清单忽略字段、无长度下载与系统缓冲分配失败边界测试。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExtensionStatusList, installExtension } from '../extensionManager';

const mocks = vi.hoisted(() => ({
  files: new Set<string>(),
  installDir: 'volume-helper',
  read: vi.fn<(path: string) => string>(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  requests: [] as string[],
  metadataMode: 'ok',
  downloadMode: 'ok',
  yaml: '# extensions\n- id: volume-helper\nversion: 2.3.4\nurl: package.zip\nsize: 4\n- id: incomplete\nversion: 1\n',
  total: 4,
  omitLength: false,
  extractError: null as Error | null,
  valid: true,
  streams: [] as {
    write: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }[],
  exec: vi.fn<(file: string, args: string[], callback: (error: Error | null) => void) => void>()
}));

class FakeRequest extends EventEmitter {
  url: string;

  /**
   * 创建模拟请求对象。
   * @param url - 模拟请求地址。
   */
  constructor(url: string) {
    super();
    this.url = url;
  }

  /** 模拟网络请求结束，在微任务触发响应。 */
  end(): void {
    queueMicrotask(() => {
      const metadata = this.url.endsWith('latest_ext.yml');
      const mode = metadata ? mocks.metadataMode : mocks.downloadMode;
      if (mode === 'request') {
        this.emit('error', new Error('network'));
        return;
      }
      const response = Object.assign(new EventEmitter(), {
        statusCode: mode === 'status' ? 503 : 200,
        headers: {
          ...(mocks.omitLength ? {} : { 'content-length': String(mocks.total) })
        }
      });
      this.emit('response', response);
      if (mode === 'status') {
        return;
      }
      if (mode === 'response') {
        response.emit('error', new Error('response failure'));
        return;
      }
      response.emit('data', Buffer.from(metadata ? mocks.yaml : 'data'));
      response.emit('end');
    });
  }
}

vi.mock('electron', () => ({
  app: {
    getPath: () => 'C:/user-data',
    getVersion: () => '1.0.0'
  },
  net: {
    request: (url: string) => {
      mocks.requests.push(url);
      return new FakeRequest(url);
    }
  }
}));

vi.mock('fs', () => ({
  existsSync: (file: string) => mocks.files.has(file) || mocks.valid && file.endsWith(join('volume-helper', 'index.js')),
  mkdirSync: mocks.mkdir,
  readFileSync: mocks.read,
  writeFileSync: vi.fn(),
  rmSync: mocks.rm,
  createWriteStream: (file: string) => {
    mocks.files.add(file);
    const stream = new EventEmitter();
    const writer = Object.assign(stream, {
      write: vi.fn(),
      destroy: vi.fn(),
      end: (): void => {
        queueMicrotask(() => {
          stream.emit('finish');
        });
      }
    });
    mocks.streams.push(writer);
    return writer;
  }
}));

vi.mock('child_process', () => ({
  execFile: mocks.exec
}));

vi.mock('../extensionRegistry', () => ({
  getExtensionRegistry: () => [{
    id: 'volume-helper',
    name: 'Volume',
    description: 'Audio',
    zipName: 'volume-helper-v1.0.0.zip',
    installDir: mocks.installDir,
    requiredRestart: true
  }]
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.files.clear();
  mocks.installDir = 'volume-helper';
  mocks.requests = [];
  mocks.streams = [];
  mocks.valid = true;
  mocks.total = 4;
  mocks.metadataMode = 'ok';
  mocks.downloadMode = 'ok';
  mocks.extractError = null;
  mocks.read.mockReset();
  mocks.read.mockReturnValue(' 0.9.0 ');
  mocks.exec.mockImplementation((file, args, callback) => {
    void file;
    void args;
    callback(mocks.extractError);
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('扩展元数据边界补充', () => {
  it('清单不认识的字段忽略，非法 size 使用零且末尾完整记录仍收录', async () => {
    mocks.yaml = 'extensions:\n- id: ignored\nversion: 1\nurl: ignored.zip\nsize: nope\n- id: volume-helper\nversion: 8.1\nurl: helper.zip\nunknown: fixture\nsize: not-a-number';
    expect((await getExtensionStatusList('cloudflare-r2'))[0]?.availableVersion).toBe('8.1');
  });
  it('下载没有 content-length 时使用零总量', async () => {
    mocks.omitLength = true;
    const progress = vi.fn();
    await installExtension('volume-helper', 'cloudflare-r2', undefined, progress);
    expect(progress).toHaveBeenCalledWith({ id: 'volume-helper', progress: 0, transferred: 4, total: 0 });
  });
  it('系统 Buffer 拼接分配失败经 catch 回退版本', async () => {
    vi.spyOn(Buffer, 'concat').mockImplementationOnce(() => { throw new RangeError('allocation failed'); });
    expect((await getExtensionStatusList('cloudflare-r2'))[0]?.availableVersion).toBe('1.0.0');
    expect(console.warn).toHaveBeenCalledWith('[Extension] Failed to parse latest_ext.yml:', expect.any(RangeError));
  });
});
