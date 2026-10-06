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
 * @file renderFeedback.test.tsx
 * @description renderFeedback 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it } from 'vitest';
import { renderFeedback } from '../renderFeedback';

describe('renderFeedback', () => {
  it('omits missing feedback', () => { expect(renderFeedback(null)).toBeNull(); });
  it.each(['success', 'error'] as const)('renders %s feedback safely as text', (type) => {
    const result = renderFeedback({ type, text: '<script>unsafe</script>' });
    expect(result?.props).toEqual({ className: `settings-user-feedback settings-user-feedback--${type}`, children: '<script>unsafe</script>' });
  });
});
