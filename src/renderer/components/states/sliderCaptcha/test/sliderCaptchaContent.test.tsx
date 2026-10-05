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
 * @file sliderCaptchaContent.test.tsx
 * @description SliderCaptchaContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, invoke, text } from '../../test/tree';

import { SliderCaptchaContent } from '../SliderCaptchaContent';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const derived = vi.hoisted(() => ({ useSliderCaptchaDerived: vi.fn(() => ({ sliderStyle: { color: 'red' }, challengeExpression: '1 + 2', traceCode: 'trace' })) }));
vi.mock('../hooks/useSliderCaptchaDerived', () => ({ useSliderCaptchaDerived: derived.useSliderCaptchaDerived }));
function fixture() { return { challenge: { challengeId: 'test-id', minValue: 0, maxValue: 10 }, onCancel: vi.fn(), onConfirm: vi.fn() }; }
function render(props = fixture()) { slots.cursor = 0; return ((SliderCaptchaContent(props as unknown as Parameters<typeof SliderCaptchaContent>[0]) as TreeElement)); }
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', { setTimeout }); });
describe('SliderCaptchaContent', () => {
  it('renders challenge range and forwards numeric slider changes', () => { const props = fixture(); const root = render(props); expect(text(root)).toContain('1 + 2'); expect(byClass(root, 'slider-captcha-range').props).toMatchObject({ min: 0, max: 10, step: 1, value: 0 }); invoke(byClass(root, 'slider-captcha-range'), 'onChange', { target: { value: '7' } }); expect(byClass(render(props), 'slider-captcha-range').props.value).toBe(7); });
  it('confirms current value only after closing animation and ignores repeated clicks', () => { const props = fixture(); invoke(byClass(render(props), 'slider-captcha-range'), 'onChange', { target: { value: '8' } }); invoke(byClass(render(props), 'slider-captcha-btn-confirm'), 'onClick'); const closing = render(props); expect(closing.props.className).toContain('is-closing'); invoke(byClass(closing, 'slider-captcha-btn-confirm'), 'onClick'); vi.advanceTimersByTime(179); expect(props.onConfirm).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith(8); });
  it('cancels only when the overlay itself is clicked', () => { const props = fixture(); const root = render(props); const stopPropagation = vi.fn(); const currentTarget = {}; invoke(root, 'onClick', { currentTarget, stopPropagation, target: {} }); vi.advanceTimersByTime(180); expect(props.onCancel).not.toHaveBeenCalled(); invoke(root, 'onClick', { currentTarget, stopPropagation, target: currentTarget }); vi.advanceTimersByTime(180); expect(props.onCancel).toHaveBeenCalledOnce(); expect(stopPropagation).toHaveBeenCalledTimes(2); });
});
