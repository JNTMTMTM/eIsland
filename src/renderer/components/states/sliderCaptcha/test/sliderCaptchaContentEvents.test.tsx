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
 * @file sliderCaptchaContentEvents.test.tsx
 * @description 验证真实验证码派生Hook、鼠标冒泡隔离、取消动画与数值确认回调。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lifecycleHooks, renderWithHooks, resetLifecycle } from '../../../components/test/contentLifecycleHarness';
import { findElement, hookMocks, invoke, textContent } from '../../../test/elementHarness';
import { SliderCaptchaContent } from '../SliderCaptchaContent';
import type { SliderCaptchaContentProps } from '../config/sliderCaptchaTypes';

vi.mock('react', async (load) => ({ ...await load<typeof import('react')>(), ...hookMocks, ...lifecycleHooks }));
vi.mock('react-i18next', async (load) => ({
  ...await load<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }),
}));

/** 构造完整服务端挑战和 UI 公开回调。
 * @param challengeId - 允许为空字符串的挑战标识。
 * @returns 真实组件参数。
 */
function fixture(challengeId = ' challenge-1 '): SliderCaptchaContentProps {
  return {
    challenge: { challengeId, minValue: 10, maxValue: 110, targetValue: 40, tolerance: 2, captchaSign: 'signed' },
    onCancel: vi.fn(), onConfirm: vi.fn(),
  };
}
/** 保留实际状态和 memo 依赖求值。
 * @param props - 当前组件参数。
 * @returns 真实元素树。
 */
function render(props: SliderCaptchaContentProps) {
  return findElement(renderWithHooks(() => SliderCaptchaContent(props)), () => true);
}

describe('滑块弹层真实派生 Hook 与鼠标事件', () => {
  beforeEach(() => {
    resetLifecycle();
    vi.useFakeTimers();
    vi.stubGlobal('window', { setTimeout });
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('鼠标按下停止传播，取消按钮在180ms动画后执行且忽略重复取消', () => {
    const props = fixture();
    const tree = render(props);
    const stopPropagation = vi.fn();
    invoke(tree, 'onMouseDown', { stopPropagation });
    expect(stopPropagation).toHaveBeenCalledOnce();
    const cancel = findElement(tree, ({ props: attributes }) => String(attributes.className).includes('slider-captcha-btn-cancel'));
    invoke(cancel, 'onClick');
    const closing = render(props);
    expect(closing.props.className).toContain('is-closing');
    invoke(findElement(closing, ({ props: attributes }) => String(attributes.className).includes('slider-captcha-btn-cancel')), 'onClick');
    vi.advanceTimersByTime(179);
    expect(props.onCancel).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('输入数值驱动真实进度和算式，并延迟确认当前值', () => {
    const props = fixture();
    let tree = render(props);
    expect(textContent(tree)).toContain('20 + 20');
    invoke(findElement(tree, ({ type }) => type === 'input'), 'onChange', { target: { value: '60' } });
    tree = render(props);
    expect(findElement(tree, ({ type }) => type === 'input').props.style).toEqual({ '--slider-progress': '50%' });
    invoke(findElement(tree, ({ props: attributes }) => String(attributes.className).includes('slider-captcha-btn-confirm')), 'onClick');
    vi.advanceTimersByTime(180);
    expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith(60);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it('空挑战号不写title，内部点击不取消、遮罩点击取消', () => {
    const props = fixture('');
    const tree = render(props);
    expect(findElement(tree, ({ props: attributes }) => String(attributes.className).includes('slider-captcha-trace-code')).props.title).toBeUndefined();
    const currentTarget = {};
    const stopPropagation = vi.fn();
    invoke(tree, 'onClick', { currentTarget, stopPropagation, target: {} });
    vi.advanceTimersByTime(180);
    expect(props.onCancel).not.toHaveBeenCalled();
    invoke(tree, 'onClick', { currentTarget, stopPropagation, target: currentTarget });
    vi.advanceTimersByTime(180);
    expect(props.onCancel).toHaveBeenCalledOnce();
    expect(stopPropagation).toHaveBeenCalledTimes(2);
  });
});
