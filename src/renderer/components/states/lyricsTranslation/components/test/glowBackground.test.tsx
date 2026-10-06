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
 * @file glowBackground.test.tsx
 * @description GlowBackground 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';

import { byClass } from '../../../test/tree';

import { GlowBackground } from '../GlowBackground';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

function fixture() { return { isMusicPlaying: true, isPlaying: true, coverImage: 'cover.jpg' as string | null, glowEnabled: true, dominantColor: [10, 20, 30] as [number, number, number] }; }
describe('GlowBackground', () => {
  it('applies album-derived glow during music playback', () => { const props = fixture(); const root = ((GlowBackground(props) as TreeElement)); const target = byClass(root, 'idle-glow'); expect(target.props.className).toContain('active'); expect(JSON.stringify(target.props.style)).toContain('10, 20, 30'); });
  it('marks paused playback', () => { const props = fixture(); props.isPlaying = false; expect(byClass(((GlowBackground(props) as TreeElement)), 'idle-glow').props.className).toContain('paused'); });
  it.each(['isMusicPlaying', 'glowEnabled', 'coverImage'] as const)('omits glow without %s', (field) => { const props = fixture(); if (field === 'coverImage') props.coverImage = null; else props[field] = false; const target = byClass(((GlowBackground(props) as TreeElement)), 'idle-glow'); expect(target.props.className).not.toContain('active'); expect(target.props.style).toBeUndefined(); });
});
