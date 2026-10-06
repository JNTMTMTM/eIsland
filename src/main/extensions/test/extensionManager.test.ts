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
 * @file extensionManager.test.ts
 * @description 扩展安装状态、CDN版本解析、下载进度、解压验证、失败清理和卸载回归。
 * @author 鸡哥
 */
import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExtensionPath, getExtensionStatusList, installExtension, uninstallExtension } from '../extensionManager';
import { ESA_CDN_URL, R2_UPDATE_URL } from '../../ipc/app/config/updater';

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
          'content-length': String(mocks.total)
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

describe('extensionManager', () => {
  it('本地路径存在才返回，状态无更新源不发送网络请求', async () => {
    expect(getExtensionPath('volume-helper')).toBeNull();
    const dir = join('C:/user-data', 'extensions', 'volume-helper');
    mocks.files.add(dir);
    expect(getExtensionPath('volume-helper')).toBe(dir);
    const status = await getExtensionStatusList();
    expect(mocks.requests).toHaveLength(0);
    expect(status[0]).toMatchObject({
      id: 'volume-helper',
      isInstalled: true,
      installedVersion: null,
      availableVersion: '1.0.0',
      requiredRestart: true
    });
  });

  it('读取版本去空白，版本读取失败/未安装返回null', async () => {
    mocks.files.add(join('C:/user-data', 'extensions', 'volume-helper', '.version'));
    expect((await getExtensionStatusList())[0].installedVersion).toBe('0.9.0');
    mocks.read.mockImplementationOnce(() => {
      throw new Error('read');
    });
    expect((await getExtensionStatusList())[0].installedVersion).toBeNull();
    mocks.valid = false;
    expect((await getExtensionStatusList())[0].isInstalled).toBe(false);
  });

  it.each([
    ['cloudflare-r2', undefined, R2_UPDATE_URL],
    ['esa-cdn', undefined, ESA_CDN_URL],
    ['github', undefined, 'https://github.com/JNTMTMTM/eIsland/releases/download/v1.0.0'],
    ['tencent-cos', 'https://mirror/', 'https://mirror'],
    ['aliyun-oss', 'https://mirror/', 'https://mirror'],
    ['tencent-cos', undefined, R2_UPDATE_URL]
  ] as const)('源%s选择正确清单地址并解析完整版本', async (source, url, base) => {
    const status = await getExtensionStatusList(source, url);
    expect(mocks.requests).toEqual([`${base}/extensions/latest_ext.yml`]);
    expect(status[0].availableVersion).toBe('2.3.4');
  });

  it.each(['status', 'request', 'response'] as const)('远端清单%s失败回退应用版本', async (mode) => {
    mocks.metadataMode = mode;
    expect((await getExtensionStatusList('cloudflare-r2'))[0].availableVersion).toBe('1.0.0');
  });

  it.each([4, 0])('安装成功使用远端版本且进度总量%d规范化', async (total) => {
    mocks.total = total;
    const progress = vi.fn();
    await installExtension('volume-helper', 'cloudflare-r2', undefined, progress);
    expect(mocks.requests[1]).toBe(`${R2_UPDATE_URL}/extensions/volume-helper-v2.3.4.zip`);
    expect(progress).toHaveBeenCalledWith({
      total,
      id: 'volume-helper',
      progress: total ? 100 : 0,
      transferred: 4
    });
    expect(mocks.exec).toHaveBeenCalledWith('powershell', expect.arrayContaining(['-Command']), expect.any(Function));
    expect(mocks.rm).toHaveBeenCalledWith(join('C:/user-data', 'extensions', 'volume-helper.tmp.zip'));
  });

  it('清单不可用则下载当前版本包，未传参数使用默认CDN', async () => {
    mocks.metadataMode = 'status';
    await installExtension('volume-helper');
    expect(mocks.requests[1]).toBe(`${R2_UPDATE_URL}/extensions/volume-helper-v1.0.0.zip`);
  });

  it('未知安装ID在任何磁盘/网络操作前拒绝', async () => {
    await expect(installExtension('unknown')).rejects.toThrow('Unknown extension');
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.requests).toHaveLength(0);
  });

  it.each(['status', 'request', 'response'] as const)('下载%s失败透传且清理已创建的临时zip', async (mode) => {
    mocks.downloadMode = mode;
    await expect(installExtension('volume-helper')).rejects.toThrow();
    expect(mocks.exec).not.toHaveBeenCalled();
    if (mode === 'response') {
      expect(mocks.streams[0].destroy).toHaveBeenCalledOnce();
      expect(mocks.rm).toHaveBeenCalled();
    }
  });

  it('解压失败/包缺少入口都拒绝安装，并清理临时文件', async () => {
    mocks.extractError = new Error('extract');
    await expect(installExtension('volume-helper')).rejects.toThrow('extract');
    expect(mocks.rm).toHaveBeenCalled();
    mocks.extractError = null;
    mocks.valid = false;
    await expect(installExtension('volume-helper')).rejects.toThrow('index.js not found');
    expect(mocks.rm).toHaveBeenCalledTimes(2);
  });

  it.each([
    'unknown',
    '',
    '..',
    '../outside',
    '..\\outside',
    '/outside',
    'C:\\outside',
    'volume-helper/../outside',
    'volume-helper\\..\\outside',
    ' volume-helper',
    'volume-helper ',
    'VOLUME-HELPER'
  ])('卸载拒绝未知或越界ID %j，且不删除任何目录', (id) => {
    mocks.files.add(join('C:/user-data', 'extensions', id));
    expect(() => uninstallExtension(id)).toThrow('Unknown extension');
    expect(mocks.rm).not.toHaveBeenCalled();
    expect(mocks.mkdir).not.toHaveBeenCalled();
    expect(mocks.requests).toHaveLength(0);
  });

  it('卸载使用注册表中的安装目录，与安装路径保持一致', () => {
    mocks.installDir = 'custom-volume';
    const installPath = join('C:/user-data', 'extensions', 'custom-volume');
    mocks.files.add(installPath);
    mocks.files.add(join('C:/user-data', 'extensions', 'volume-helper'));
    uninstallExtension('volume-helper');
    expect(mocks.rm).toHaveBeenCalledExactlyOnceWith(installPath, { recursive: true, force: true });
  });

  it('卸载不存在目录无操作，存在目录按约定递归删除', () => {
    uninstallExtension('volume-helper');
    expect(mocks.rm).not.toHaveBeenCalled();
    const dir = join('C:/user-data', 'extensions', 'volume-helper');
    mocks.files.add(dir);
    uninstallExtension('volume-helper');
    expect(mocks.rm).toHaveBeenCalledWith(dir, {
      recursive: true,
      force: true
    });
  });
});
