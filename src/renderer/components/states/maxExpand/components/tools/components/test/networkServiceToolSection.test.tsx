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
 * @file networkServiceToolSection.test.tsx
 * @description 验证 IP 查询的输入、请求、加载互斥、响应兼容与失败分支。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nodes, render, text, value } from '../../../../test/componentHarness';
import { NetworkServiceToolSection } from '../NetworkServiceToolSection';
import { fire, fireAsync } from './toolTestEvents';

interface Response { ok: boolean; status: number; body: string; }
const netFetch = vi.fn<() => Promise<Response>>();

describe('NetworkServiceToolSection', () => {
  beforeEach(() => {
    netFetch.mockReset();
    netFetch.mockResolvedValue({ ok: true, status: 200, body: '{"ip":"127.0.0.1"}' });
    vi.stubGlobal('window', { api: { netFetch } });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('空白输入显示提示且不发送请求', async () => {
    fire(render(NetworkServiceToolSection), 'input', 'onChange', 0, { target: { value: '  ' } });
    await fireAsync(render(NetworkServiceToolSection), 'button', 'onClick');
    expect(netFetch).not.toHaveBeenCalled();
    expect(text(render(NetworkServiceToolSection))).toContain('ipinfo.emptyIp');
    expect(value(render(NetworkServiceToolSection), 'button', 'disabled')).toBe(false);
  });

  it.each([
    { body: '{"ip":"127.0.0.1","latitude":0,"longitude":0}', label: '顶层响应' },
    { body: '{"code":200,"data":{"ip":"127.0.0.1","latitude":0,"longitude":0}}', label: '嵌套响应' },
  ])('$label保留零经纬度，缺失字段使用占位符', async ({ body }) => {
    netFetch.mockResolvedValue({ body, ok: true, status: 200 });
    fire(render(NetworkServiceToolSection), 'input', 'onChange', 0, { target: { value: ' 127.0.0.1 ' } });
    await fireAsync(render(NetworkServiceToolSection), 'button', 'onClick');
    const tree = render(NetworkServiceToolSection);
    expect(netFetch).toHaveBeenCalledWith('https://uapis.cn/api/v1/network/ipinfo?ip=127.0.0.1', { method: 'GET', timeoutMs: 10000 });
    expect(value(tree, '.ipinfo-result-ip', 'children')).toBe('127.0.0.1');
    expect(value(tree, '.ipinfo-result-value', 'children', 4)).toBe('0');
    expect(value(tree, '.ipinfo-result-value', 'children', 5)).toBe('0');
    expect(value(tree, '.ipinfo-result-badge', 'children')).toBe('-');
    expect(nodes(tree, '.ipinfo-error')).toHaveLength(0);
  });

  it.each([
    { response: { ok: false, status: 503, body: '' }, error: 'ipinfo.httpError' },
    { response: { ok: true, status: 200, body: '  <html>error</html>' }, error: 'ipinfo.nonJson' },
    { response: { ok: true, status: 200, body: '{' }, error: 'ipinfo.failed' },
    { response: { ok: true, status: 200, body: '{}' }, error: 'ipinfo.failed' },
    { response: { ok: true, status: 200, body: '{"code":500,"msg":"API error","data":{}}' }, error: 'API error' },
    { response: { ok: true, status: 200, body: '{"code":500,"message":"fallback message","data":{}}' }, error: 'fallback message' },
  ])('无效响应 $error清除结果并提供错误信息', async ({ response, error }) => {
    netFetch.mockResolvedValue(response);
    fire(render(NetworkServiceToolSection), 'input', 'onChange', 0, { target: { value: 'x & y' } });
    await fireAsync(render(NetworkServiceToolSection), 'button', 'onClick');
    expect(text(render(NetworkServiceToolSection))).toContain(error);
    expect(nodes(render(NetworkServiceToolSection), '.ipinfo-result-card')).toHaveLength(0);
    expect(netFetch).toHaveBeenCalledWith('https://uapis.cn/api/v1/network/ipinfo?ip=x%20%26%20y', expect.anything());
  });

  it('请求挂起时禁用查询并防止重复请求，异常后恢复', async () => {
    const deferred = Promise.withResolvers<Response>();
    netFetch.mockReturnValue(deferred.promise);
    fire(render(NetworkServiceToolSection), 'input', 'onChange', 0, { target: { value: '::1' } });
    const pending = fireAsync(render(NetworkServiceToolSection), 'button', 'onClick');
    expect(value(render(NetworkServiceToolSection), 'button', 'disabled')).toBe(true);
    await fireAsync(render(NetworkServiceToolSection), 'button', 'onClick');
    expect(netFetch).toHaveBeenCalledOnce();
    deferred.reject(new Error('offline'));
    await pending;
    expect(text(render(NetworkServiceToolSection))).toContain('ipinfo.failed');
    expect(value(render(NetworkServiceToolSection), 'button', 'disabled')).toBe(false);
  });

  it('非Enter不请求，Enter触发查询', async () => {
    fire(render(NetworkServiceToolSection), 'input', 'onChange', 0, { target: { value: '127.0.0.1' } });
    fire(render(NetworkServiceToolSection), 'input', 'onKeyDown', 0, { key: 'Escape' });
    expect(netFetch).not.toHaveBeenCalled();
    fire(render(NetworkServiceToolSection), 'input', 'onKeyDown', 0, { key: 'Enter' });
    await vi.waitFor(() => { expect(nodes(render(NetworkServiceToolSection), '.ipinfo-result-card')).toHaveLength(1); });
  });
});
