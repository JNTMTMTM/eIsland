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
 * @file sliderCaptchaFlow.test.ts
 * @description 滑块验证码真实流程配置/挑战错误、挂载宿主、确认取消与卸载清理测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runSliderCaptcha } from '../index';
import type { ReactElement } from 'react';

const leaf = vi.hoisted(() => ({ config: vi.fn(), challenge: vi.fn(), root: vi.fn(), render: vi.fn(), unmount: vi.fn(), remove: vi.fn(), append: vi.fn() }));
vi.mock('../../../api/user/userAccountApi', () => ({ fetchUserCaptchaConfig: leaf.config, createUserCaptchaChallenge: leaf.challenge }));
vi.mock('react-dom/client', () => ({ createRoot: leaf.root }));

interface ModalProps {
  challenge: { challengeId: string; captchaSign: string };
  onCancel: () => void;
  onConfirm: (value: number) => void;
}
const challenge = { challengeId: 'challenge-id', captchaSign: 'challenge-sign', backgroundImage: 'background', pieceImage: 'piece' };
beforeEach(() => {
  leaf.config.mockReset().mockResolvedValue({ ok: true, data: { enabled: true, provider: 'builtin' } });
  leaf.challenge.mockReset().mockResolvedValue({ ok: true, data: challenge });
  leaf.render.mockReset();
  leaf.unmount.mockReset();
  leaf.remove.mockReset();
  leaf.append.mockReset();
  leaf.root.mockReset().mockReturnValue({ render: leaf.render, unmount: leaf.unmount });
});
afterEach(() => vi.unstubAllGlobals());

describe('slider verification flow', () => {
  it.each([
    { response: { ok: false, message: 'config unavailable' }, message: 'config unavailable' },
    { response: { ok: false, message: '' }, message: '获取滑块配置失败' },
    { response: { ok: true }, message: '获取滑块配置失败' },
  ])('rejects unusable configuration $response', async ({ response, message }) => {
    leaf.config.mockResolvedValueOnce(response);
    await expect(runSliderCaptcha('account')).rejects.toThrow(message);
    expect(leaf.challenge).not.toHaveBeenCalled();
  });
  it('returns empty tickets when verification is disabled', async () => {
    leaf.config.mockResolvedValueOnce({ ok: true, data: { enabled: false } });
    expect(await runSliderCaptcha('account')).toEqual({ ticket: '', randstr: '', sign: '' });
    expect(leaf.challenge).not.toHaveBeenCalled();
  });
  it('rejects an unsupported provider before requesting a challenge', async () => {
    leaf.config.mockResolvedValueOnce({ ok: true, data: { enabled: true, provider: 'external' } });
    await expect(runSliderCaptcha('account')).rejects.toThrow('暂不支持的滑块验证提供方');
    expect(leaf.challenge).not.toHaveBeenCalled();
  });
  it.each([
    { response: { ok: false, message: 'challenge unavailable' }, message: 'challenge unavailable' },
    { response: { ok: false, message: '' }, message: '获取滑块挑战失败' },
    { response: { ok: true }, message: '获取滑块挑战失败' },
  ])('rejects unusable challenge $response', async ({ response, message }) => {
    leaf.challenge.mockResolvedValueOnce(response);
    await expect(runSliderCaptcha('account')).rejects.toThrow(message);
    expect(leaf.challenge).toHaveBeenCalledExactlyOnceWith('account');
  });
  it.each([{ shell: true, action: 'confirm' }, { shell: false, action: 'cancel' }])('mounts shell=$shell and cleans up after $action', async ({ shell, action }) => {
    const mount = { remove: leaf.remove };
    const body = { appendChild: vi.fn() };
    const host = { appendChild: leaf.append };
    const createElement = vi.fn().mockReturnValue(mount);
    const querySelector = vi.fn().mockReturnValue(shell ? host : null);
    vi.stubGlobal('document', { body, createElement, querySelector });
    const pending = runSliderCaptcha('account');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(createElement).toHaveBeenCalledExactlyOnceWith('div');
    expect(querySelector).toHaveBeenCalledExactlyOnceWith('.island-shell');
    expect(shell ? leaf.append : body.appendChild).toHaveBeenCalledExactlyOnceWith(mount);
    expect(leaf.root).toHaveBeenCalledExactlyOnceWith(mount);
    const [element] = leaf.render.mock.calls[0] as [ReactElement<ModalProps>];
    expect(element.props.challenge).toBe(challenge);
    if (action === 'confirm') {
      element.props.onConfirm(0);
      expect(await pending).toEqual({ ticket: 'challenge-id', randstr: '0', sign: 'challenge-sign' });
    } else {
      element.props.onCancel();
      expect(await pending).toBeNull();
    }
    expect(leaf.unmount).toHaveBeenCalledTimes(1);
    expect(leaf.remove).toHaveBeenCalledTimes(1);
    expect(leaf.unmount.mock.invocationCallOrder[0]).toBeLessThan(leaf.remove.mock.invocationCallOrder[0]);
  });
  it('propagates bridge rejection without creating a modal', async () => {
    const error = new Error('bridge unavailable');
    leaf.config.mockRejectedValueOnce(error);
    await expect(runSliderCaptcha('account')).rejects.toBe(error);
    leaf.challenge.mockRejectedValueOnce(error);
    await expect(runSliderCaptcha('account')).rejects.toBe(error);
    expect(leaf.root).not.toHaveBeenCalled();
  });
});
