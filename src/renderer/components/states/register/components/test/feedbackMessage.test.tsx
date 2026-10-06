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
 * @file feedbackMessage.test.tsx
 * @description FeedbackMessage 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { FeedbackMessage } from '../FeedbackMessage';
import type { TreeElement } from '../../../test/tree';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

describe('FeedbackMessage', () => {
  it('omits absent feedback', () => { expect(((FeedbackMessage({ feedback: null }) as TreeElement))).toBeNull(); });
  it.each(['error', 'success', 'info'] as const)('renders %s feedback without interpreting markup', (type) => { const root = ((FeedbackMessage({ feedback: { type, text: '<b>Message</b>' } }) as TreeElement)); expect(root?.props).toEqual({ className: `settings-user-feedback settings-user-feedback--${type}`, children: '<b>Message</b>' }); });
});
