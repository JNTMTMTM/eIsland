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
 * @file karaokeSyllableLine.test.tsx
 * @description KaraokeSyllableLine 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass, elements, text } from '../../../test/tree';

import { KaraokeSyllableLine } from '../KaraokeSyllableLine';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

describe('KaraokeSyllableLine', () => {
  it.each([[900, '0.00%'], [1000, '0.00%'], [1250, '50.00%'], [1500, '100.00%'], [2000, '100.00%']] as const)('renders progress at %i ms', (posMs, progress) => { const root = ((KaraokeSyllableLine({ posMs, syllables: [{ text: 'Word', start_offset_ms: 0, duration_ms: 500 }], lineStartMs: 1000 }) as TreeElement)); expect(byClass(root, 'lyrics-syllable').props.style).toEqual({ '--syl-prog': progress }); expect(text(root)).toBe('Word'); });
  it('handles zero duration and empty lines', () => { const root = ((KaraokeSyllableLine({ syllables: [{ text: 'Zero', start_offset_ms: 0, duration_ms: 0 }], lineStartMs: 0, posMs: 0 }) as TreeElement)); expect(byClass(root, 'lyrics-syllable').props.style).toEqual({ '--syl-prog': '100.00%' }); expect(elements(((KaraokeSyllableLine({ syllables: [], lineStartMs: 0, posMs: 0 }) as TreeElement)))).toHaveLength(1); });
});
