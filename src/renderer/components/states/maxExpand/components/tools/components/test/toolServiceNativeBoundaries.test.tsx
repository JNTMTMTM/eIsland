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
 * @file toolServiceNativeBoundaries.test.tsx
 * @description 工具服务真实接口空结果、失败提示、复制与语言菜单原生生命周期回归测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import type { ReactElement, RefObject } from 'react';
let FileService: typeof import('../FileServiceToolSection').FileServiceToolSection;
let NetworkService: typeof import('../NetworkServiceToolSection').NetworkServiceToolSection;
let SoftwareService: typeof import('../SoftwareToolSection').SoftwareToolSection;
let TranslateService: typeof import('../TranslateToolSection').TranslateToolSection;
const leaves = {
  pick: vi.fn<() => Promise<string | null>>(),
  compute: vi.fn<(file: string, algorithm: string) => Promise<{
    hash: string;
    fileSize: number;
  } | null>>(),
  copy: vi.fn<(value: string) => Promise<void>>(),
  fetch: vi.fn<() => Promise<{
    ok: boolean;
    status: number;
    body: string;
  }>>(),
  write: vi.fn<(key: string, value: unknown) => Promise<boolean>>()
};
let documentLeaf: EventTarget;
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  leaves.pick.mockResolvedValue('C:/files/a.bin');
  leaves.compute.mockResolvedValue({
    hash: 'ABC',
    fileSize: 10
  });
  leaves.copy.mockResolvedValue();
  leaves.fetch.mockResolvedValue({
    ok: false,
    status: 503,
    body: ''
  });
  leaves.write.mockResolvedValue(true);
  documentLeaf = new EventTarget();
  vi.stubGlobal('document', documentLeaf);
  vi.stubGlobal('window', Object.assign(new EventTarget(), {
    location: {
      hostname: 'electron.invalid'
    },
    api: {
      pickFileForHash: leaves.pick,
      computeFileHash: leaves.compute,
      netFetch: leaves.fetch,
      storeWrite: leaves.write
    }
  }));
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: leaves.copy
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null
  });
  vi.doMock('react', async (original) => createHookReactMock(await original<typeof import('react')>()));
  ({
    FileServiceToolSection: FileService
  } = await import('../FileServiceToolSection'));
  ({
    NetworkServiceToolSection: NetworkService
  } = await import('../NetworkServiceToolSection'));
  ({
    SoftwareToolSection: SoftwareService
  } = await import('../SoftwareToolSection'));
  ({
    TranslateToolSection: TranslateService
  } = await import('../TranslateToolSection'));
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('tool service native failure boundaries', () => {
  it('native file hash null keeps the result absent and enables another attempt', async () => {
    leaves.compute.mockResolvedValueOnce(null);
    await invoke(byClass(renderHook(FileService), 'file-hash-pick-btn'), 'onClick');
    await invoke(byClass(renderHook(FileService), 'download-start-btn-full'), 'onClick');
    const tree = renderHook(FileService);
    expect(elements(tree).some((n) => n.props.className === 'file-hash-result')).toBe(false);
    expect(byClass(tree, 'download-start-btn-full').props.disabled).toBe(false);
    await invoke(byClass(tree, 'download-start-btn-full'), 'onClick');
    expect(text(byClass(renderHook(FileService), 'file-hash-result'))).toContain('ABC');
    expect(leaves.compute).toHaveBeenCalledTimes(2);
  });
  it('clipboard rejection is consumed and preserves the displayed hash', async () => {
    leaves.copy.mockRejectedValue(new Error('clipboard unavailable'));
    await invoke(byClass(renderHook(FileService), 'file-hash-pick-btn'), 'onClick');
    await invoke(byClass(renderHook(FileService), 'download-start-btn-full'), 'onClick');
    invoke(byClass(renderHook(FileService), 'file-hash-copy-btn'), 'onClick');
    await settleHook();
    expect(leaves.copy).toHaveBeenCalledWith('ABC');
    expect(text(byClass(renderHook(FileService), 'file-hash-result-value'))).toBe('ABC');
  });
  it('server error without a message uses the existing translated failure hint', async () => {
    leaves.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: JSON.stringify({
        code: 500,
        data: {}
      })
    });
    invoke(byClass(renderHook(NetworkService), 'ipinfo-input'), 'onChange', {
      target: {
        value: '127.0.0.1'
      }
    });
    await invoke(elements(renderHook(NetworkService)).find((n) => n.type === 'button')!, 'onClick');
    expect(text(renderHook(NetworkService))).toContain('ipinfo.failed');
    expect(leaves.fetch).toHaveBeenCalledOnce();
  });
  it('real empty software API result still navigates when persistence rejects', async () => {
    const onFeedbackNavigate = vi.fn();
    renderHook(SoftwareService, {
      onFeedbackNavigate
    });
    flushHookEffects();
    await settleHook();
    const tree = renderHook(SoftwareService, {
      onFeedbackNavigate
    });
    expect(text(tree)).toContain('software.empty');
    leaves.write.mockRejectedValue(new Error('store unavailable'));
    invoke(elements(tree).filter((n) => n.type === 'button')[1], 'onClick');
    await settleHook();
    expect(leaves.fetch).toHaveBeenCalledOnce();
    expect(leaves.write).toHaveBeenCalledWith('settings-open-tab', 'about-feedback');
    expect(onFeedbackNavigate).toHaveBeenCalledOnce();
  });
  it('real translate source dropdown commits initial closed state and actual inside/outside clicks', () => {
    const contains = vi.fn<(target: Node) => boolean>().mockReturnValue(true);
    /** 保留真实父组件与语言菜单的同一 Hook 提交顺序。
     * @returns 来源语言菜单元素树
     */
    function runDropdown() {
      return renderHook(() => {
        const parent = TranslateService();
        const child = elements(parent).find((n) => Array.isArray(n.props.options))!;
        const component = child.type as (props: Record<string, unknown>) => ReactElement;
        return component(child.props);
      });
    }
    let tree = runDropdown();
    (byClass(tree, 'translate-lang-dropdown').props.ref as RefObject<unknown>).current = {
      contains
    };
    flushHookEffects();
    invoke(byClass(tree, 'translate-lang-dropdown-trigger'), 'onClick');
    tree = runDropdown();
    flushHookEffects();
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(contains).toHaveBeenCalledOnce();
    expect(text(runDropdown())).toContain('translate.lang.zh');
    invoke(elements(runDropdown()).filter((n) => String(n.props.className).includes('translate-lang-dropdown-item'))[1], 'onClick');
    tree = runDropdown();
    flushHookEffects();
    expect(byClass(tree, 'translate-lang-dropdown-label').props.children).toBe('maxExpand.toolbox.translate.lang.zh');
    expect(byClass(tree, 'translate-lang-flag').props.className).toContain('no-filter');
    invoke(byClass(tree, 'translate-lang-dropdown-trigger'), 'onClick');
    runDropdown();
    flushHookEffects();
    contains.mockReturnValue(false);
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(elements(runDropdown()).some((n) => n.props.className === 'translate-lang-dropdown-menu')).toBe(false);
    unmountHook();
    documentLeaf.dispatchEvent(new Event('mousedown'));
    expect(contains).toHaveBeenCalledTimes(2);
  });
});
