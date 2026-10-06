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
 * @file countdownEditorRuntime.test.tsx
 * @description 真实倒计时编辑表单、图片规范化与抽屉焦点循环及清理测试。
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byClass, elements, find, invoke, text } from '../../../../../test/tree';
import { createHookReactMock, flushHookEffects, renderHook, resetHook, settleHook, unmountHook } from '../../../../../../hooks/test/startupHookHarness';
import { COLOR_PRESETS } from '../../config/countdownConfig';
import type { CountdownDraft } from '../../types/countdownTypes';
import type { ReactNode, RefObject, SetStateAction } from 'react';
let form: typeof import('../CountdownForm');
let drawer: typeof import('../CountdownDrawer');
let draft: CountdownDraft;
const pick = vi.fn<() => Promise<string | null>>();
const load = vi.fn<(path: string) => Promise<string | null>>();
const save = vi.fn<() => Promise<void>>();
const cancel = vi.fn<() => void>();
const remove = vi.fn<() => void>();
/** 承载真实受控表单的父组件状态协议。
 * @param update - 真实表单提交的状态变更
 */
function setDraft(update: SetStateAction<CountdownDraft>): void {
  draft = typeof update === 'function' ? update(draft) : update;
}
/** 返回实际表单元素树。
 * @param patch - 公开表单属性
 * @returns 真实表单
 */
function run(patch: Partial<Parameters<typeof form.CountdownForm>[0]> = {}) {
  return renderHook(form.CountdownForm, {
    draft,
    setDraft,
    formId: 'editor',
    editing: false,
    saving: false,
    resolvedCoverImage: null,
    onSave: save,
    onCancel: cancel,
    ...patch
  });
}
/** 调用实际输入事件。
 * @param node - 原生元素
 * @param value - 输入值
 */
function change(node: ReturnType<typeof find>, value: string | boolean): void {
  invoke(node, 'onChange', {
    target: {
      value,
      checked: value
    }
  });
}
/** 将 React 公开 DOM ref 挂接到原生节点叶。
 * @param tree - 元素树
 * @param name - 类名
 * @param node - 原生节点
 */
function attach(tree: ReactNode, name: string, node: unknown): void {
  const ref = byClass(tree, name).props.ref as RefObject<unknown>;
  ref.current = node;
}
class NativeElement {
  isConnected = true;

  visible = true;

  scrollTop = 200;

  input: NativeElement | null = null;

  page: NativeElement | null = null;

  controls: NativeElement[] = [];

  focus = vi.fn<(options?: FocusOptions) => void>();

  /** 读取原生祖先页面。
   * @returns 所在页面
   */
  closest(): NativeElement | null {
    return this.page;
  }

  /** 返回原生焦点目标。
   * @returns 可聚焦元素
   */
  querySelector(): NativeElement | null {
    return this.input;
  }

  /** 返回原生焦点候选列表。
   * @returns 控件列表
   */
  querySelectorAll(): NativeElement[] {
    return this.controls;
  }

  /** 原生可见区域。
   * @returns 实际可见矩形列表
   */
  getClientRects(): unknown[] {
    return this.visible ? [{}] : [];
  }
}
let documentBoundary: {
  activeElement: NativeElement | null;
};
beforeEach(async () => {
  unmountHook();
  resetHook();
  vi.resetModules();
  vi.resetAllMocks();
  pick.mockResolvedValue('C:/image.png');
  load.mockResolvedValue('data:image/png;base64,pixels');
  save.mockResolvedValue(undefined);
  draft = {
    name: 'Release',
    date: '2026-10-06',
    type: 'countdown',
    color: COLOR_PRESETS[0]
  };
  documentBoundary = {
    activeElement: null
  };
  vi.stubGlobal('window', {
    api: {
      openImageDialog: pick,
      loadWallpaperFile: load
    }
  });
  vi.stubGlobal('document', documentBoundary);
  vi.stubGlobal('HTMLElement', NativeElement);
  vi.doMock('react', async (original) => ({
    ...createHookReactMock(await original<typeof import('react')>()),
    useId: () => 'countdown-editor-id'
  }));
  form = await import('../CountdownForm');
  drawer = await import('../CountdownDrawer');
});
afterEach(() => {
  unmountHook();
  vi.unstubAllGlobals();
});
describe('CountdownForm true controlled inputs and image pipeline', () => {
  it('name description event type and direction changes use real defaults, yearly/archive/continue rules', () => {
    change(find(run(), (node) => node.type === 'input' && node.props.required === true), 'Changed');
    change(find(run(), (node) => node.type === 'textarea'), 'details');
    change(elements(run()).filter((node) => node.type === 'select')[0], 'birthday');
    expect(draft).toMatchObject({
      name: 'Changed',
      description: 'details',
      type: 'birthday',
      mode: 'down',
      repeat: 'yearly'
    });
    expect(elements(run()).filter((node) => node.type === 'select')[2].props.value).toBe('yearly');
    change(elements(run()).filter((node) => node.type === 'select')[2], 'archive');
    expect(draft).toMatchObject({
      repeat: 'none',
      expiryAction: 'archive'
    });
    change(elements(run()).filter((node) => node.type === 'select')[2], 'continue');
    expect(draft.expiryAction).toBe('continue');
    change(elements(run()).filter((node) => node.type === 'select')[2], 'yearly');
    expect(draft.repeat).toBe('yearly');
    change(elements(run()).filter((node) => node.type === 'select')[1], 'up');
    change(find(run(), (node) => node.props.type === 'checkbox'), true);
    expect(draft).toMatchObject({
      mode: 'up',
      repeat: 'none',
      expiryAction: 'continue',
      includeToday: true
    });
  });
  it('preset and custom color apply actual callbacks and public native color ref', () => {
    invoke(byClass(run(), 'cd-color-dot'), 'onClick');
    expect(draft.color).toBe(COLOR_PRESETS[0]);
    const click = vi.fn<() => void>();
    const colorInput = find(run(), (node) => node.props.type === 'color');
    (colorInput.props.ref as RefObject<unknown>).current = {
      click
    };
    invoke(byClass(run(), 'cd-custom-color'), 'onClick');
    expect(click).toHaveBeenCalledOnce();
    change(colorInput, '#123abc');
    expect(byClass(run(), 'cd-custom-color').props['aria-pressed']).toBe(true);
  });
  it('album/custom backgrounds normalize actual leaf image and opacity before clearing', async () => {
    const cover = 'data:image/jpeg;base64,cover';
    invoke(find(run({
      resolvedCoverImage: cover
    }), (node) => node.type === 'button' && text(node) === 'countdown.form.albumBackground'), 'onClick');
    expect(draft.backgroundImage).toBe(cover);
    const opacity = find(run(), (node) => node.props.type === 'range');
    expect(opacity.props.value).toBe(0.35);
    change(opacity, '0.8');
    expect(draft.backgroundOpacity).toBe(0.8);
    invoke(find(run(), (node) => node.type === 'button' && text(node) === 'countdown.form.customBackground'), 'onClick');
    await settleHook();
    expect(load).toHaveBeenCalledWith('C:/image.png');
    expect(draft.backgroundImage).toBe('data:image/png;base64,pixels');
    invoke(find(run(), (node) => node.type === 'button' && text(node) === 'countdown.form.clearBackground'), 'onClick');
    expect(draft.backgroundImage).toBeUndefined();
  });
  it.each(['cancel', 'failure'])('native image dialog %s preserves background and error is visible only for failure', async (kind) => {
    if (kind === 'cancel') pick.mockResolvedValue(null);else pick.mockRejectedValue(new Error('native'));
    invoke(find(run(), (node) => node.type === 'button' && text(node) === 'countdown.form.customBackground'), 'onClick');
    await settleHook();
    expect(draft.backgroundImage).toBeUndefined();
    expect(text(run()).includes('countdown.manage.imageError')).toBe(kind === 'failure');
  });
  it('disabled album image never changes draft, submit/cancel/delete use parent public callbacks', async () => {
    const tree = run({
      editing: true,
      onDelete: remove
    });
    const album = find(tree, (node) => node.type === 'button' && text(node) === 'countdown.form.albumBackground');
    expect(album.props.disabled).toBe(true);
    invoke(album, 'onClick');
    expect(draft.backgroundImage).toBeUndefined();
    invoke(find(tree, (node) => node.type === 'form'), 'onSubmit', {
      preventDefault: vi.fn()
    });
    await settleHook();
    expect(save).toHaveBeenCalledOnce();
    invoke(find(tree, (node) => node.type === 'button' && text(node) === 'countdown.actions.cancel'), 'onClick');
    invoke(byClass(tree, 'danger'), 'onClick');
    expect(cancel).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(byClass(run({
      saving: true
    }), 'save').props.disabled).toBe(true);
    expect(text(run({
      saving: true
    }))).toContain('countdown.manage.saving');
  });
});
describe('CountdownDrawer true focus and keyboard lifecycle', () => {
  it.each(['connected', 'disconnected', 'none'] as const)('focus restore %s resets body and falls back to new-event control', (kind) => {
    const previous = new NativeElement();
    previous.isConnected = kind === 'connected';
    documentBoundary.activeElement = kind === 'none' ? null : previous;
    const input = new NativeElement();
    const newEvent = new NativeElement();
    const page = new NativeElement();
    page.input = newEvent;
    const panel = new NativeElement();
    panel.page = page;
    panel.input = input;
    const body = new NativeElement();
    const props = {
      open: true,
      saving: false,
      title: 'Editor',
      onClose: cancel,
      children: 'body'
    };
    const tree = renderHook(drawer.CountdownDrawer, props);
    attach(tree, 'cd-drawer', panel);
    attach(tree, 'cd-drawer-body', body);
    flushHookEffects();
    expect(body.scrollTop).toBe(0);
    expect(input.focus).toHaveBeenCalledWith({
      preventScroll: true
    });
    unmountHook();
    expect(kind === 'connected' ? previous.focus : newEvent.focus).toHaveBeenCalledOnce();
  });
  it('queued native Tab callback after public DOM ref detachment safely handles absent controls', () => {
    const tree = renderHook(drawer.CountdownDrawer, {
      open: true,
      saving: false,
      title: 'Editor',
      onClose: cancel,
      children: 'body'
    });
    const panel = new NativeElement();
    attach(tree, 'cd-drawer', panel);
    attach(tree, 'cd-drawer', null);
    const event = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', event);
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
  it('closed drawer retains inert content without focus effects', () => {
    const tree = renderHook(drawer.CountdownDrawer, {
      open: false,
      saving: true,
      title: 'Editor',
      onClose: cancel,
      children: 'body'
    });
    flushHookEffects();
    expect(byClass(tree, 'cd-drawer-layer').props.inert).toBe(true);
  });
  it('Tab and Shift+Tab wrap visible controls, other keys preserve behavior and Escape respects saving', () => {
    const first = new NativeElement();
    const last = new NativeElement();
    const hidden = new NativeElement();
    hidden.visible = false;
    const panel = new NativeElement();
    panel.controls = [first, hidden, last];
    const props = {
      open: true,
      saving: false,
      title: 'Editor',
      onClose: cancel,
      children: 'body'
    };
    let tree = renderHook(drawer.CountdownDrawer, props);
    attach(tree, 'cd-drawer', panel);
    const e = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    };
    documentBoundary.activeElement = last;
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', e);
    expect(first.focus).toHaveBeenCalledOnce();
    documentBoundary.activeElement = first;
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', {
      ...e,
      shiftKey: true
    });
    expect(last.focus).toHaveBeenCalledOnce();
    documentBoundary.activeElement = new NativeElement();
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', e);
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', {
      ...e,
      key: 'Enter'
    });
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', {
      ...e,
      key: 'Escape'
    });
    expect(cancel).toHaveBeenCalledOnce();
    tree = renderHook(drawer.CountdownDrawer, {
      ...props,
      saving: true
    });
    invoke(byClass(tree, 'cd-drawer'), 'onKeyDown', {
      ...e,
      key: 'Escape'
    });
    expect(cancel).toHaveBeenCalledOnce();
  });
});
