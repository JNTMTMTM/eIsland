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
 * @file silkyWave.test.tsx
 * @description SilkyWave 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { SilkyWave } from '../SilkyWave';
import type { TreeElement } from '../../../../../test/tree';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }), initReactI18next: { type: '3rdParty', init: vi.fn() } }));

const model = vi.hoisted(() => ({ canvasRef: { current: null }, useSilkyWave: vi.fn() }));
vi.mock('../../hooks/useSilkyWave', () => ({ useSilkyWave: model.useSilkyWave }));
describe('SilkyWave', () => {
  it.each([true, false])('passes color and playing=%s to canvas animation hook', (playing) => { model.useSilkyWave.mockReturnValue(model.canvasRef); const color: [number, number, number] = [12, 34, 56]; const root = ((SilkyWave({ color, playing }) as TreeElement)); expect(root.type).toBe('canvas'); expect(root.props.ref).toBe(model.canvasRef); expect(root.props.className).toBe('lrc-wave-canvas'); expect(model.useSilkyWave).toHaveBeenCalledWith(color, playing); });
});
