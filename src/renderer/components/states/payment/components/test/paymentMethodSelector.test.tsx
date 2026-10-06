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
 * @file paymentMethodSelector.test.tsx
 * @description PaymentMethodSelector 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { elements, invoke } from '../../../test/tree';

import { PaymentMethodSelector } from '../PaymentMethodSelector';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

describe('PaymentMethodSelector', () => {
  it.each(['wechat', 'alipay'] as const)('marks selected %s channel and delegates selection', (method) => {
    const onSelect = vi.fn(); const root = ((PaymentMethodSelector({ method, onSelect, wechatEnabled: true, alipayEnabled: true }) as TreeElement));
    const buttons = elements(root).filter((node) => node.type === 'button');
    expect(root.props.role).toBe('radiogroup');
    expect(buttons[method === 'wechat' ? 0 : 1].props.className).toContain('active');
    buttons.forEach((button) => invoke(button, 'onClick'));
    expect(onSelect.mock.calls).toEqual([['wechat'], ['alipay']]);
  });
  it('disables unavailable channels without selecting a default', () => {
    const root = ((PaymentMethodSelector({ method: null, wechatEnabled: false, alipayEnabled: false, onSelect: vi.fn() }) as TreeElement));
    const buttons = elements(root).filter((node) => node.type === 'button');
    expect(buttons.every((button) => button.props.disabled)).toBe(true);
    expect(buttons.some((button) => String(button.props.className).includes('active'))).toBe(false);
  });
});
