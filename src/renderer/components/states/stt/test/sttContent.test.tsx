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
 * @file sttContent.test.tsx
 * @description SttContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { byClass, elements, find, invoke, text } from '../../test/tree';

import { SttContent } from '../SttContent';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

const model = vi.hoisted(() => ({ store: { sttText: 'Recognized words', setIdle: vi.fn(), setStt: vi.fn(), setAgent: vi.fn() }, sync: vi.fn(), writeText: vi.fn().mockResolvedValue(undefined), storeRead: vi.fn().mockResolvedValue([]), storeWrite: vi.fn().mockResolvedValue(true) }));
vi.mock('../../../../store/isLandStore', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
vi.mock('../hooks/useSttTextSync', () => ({ useSttTextSync: model.sync }));
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('window', { api: { storeRead: model.storeRead, storeWrite: model.storeWrite } }); vi.stubGlobal('navigator', { clipboard: { writeText: model.writeText } }); model.store.sttText = 'Recognized words'; });
describe('SttContent', () => {
  it('renders editable recognition and forwards send-to-agent and ignore', () => { const root = ((SttContent() as TreeElement)); expect(byClass(root, 'stt-text-body').props.contentEditable).toBe(true); const buttons = elements(root).filter((node) => node.type === 'button'); invoke(buttons[0], 'onClick'); invoke(buttons[4], 'onClick'); expect(model.store.setAgent).toHaveBeenCalledWith('Recognized words'); expect(model.store.setIdle).toHaveBeenCalledWith(true); });
  it('copies text and resets copied feedback after delay', async () => { const root = ((SttContent() as TreeElement)); invoke(find(root, (node) => node.type === 'button' && text(node) === 'stt.actions.copy'), 'onClick'); await Promise.resolve(); expect(model.writeText).toHaveBeenCalledWith('Recognized words'); expect(slots.values[1]).toBe(true); vi.advanceTimersByTime(1500); expect(slots.values[1]).toBe(false); });
  it('does not copy or create records for empty text', () => { model.store.sttText = ''; const root = ((SttContent() as TreeElement)); ['stt.actions.copy', 'stt.actions.addTodo', 'stt.actions.addToMemo'].forEach((key) => { invoke(find(root, (node) => node.type === 'button' && text(node) === key), 'onClick'); }); expect(model.writeText).not.toHaveBeenCalled(); expect(model.storeRead).not.toHaveBeenCalled(); });
  it('persists recognized todo content', async () => { const root = ((SttContent() as TreeElement)); invoke(find(root, (node) => node.type === 'button' && text(node) === 'stt.actions.addTodo'), 'onClick'); await Promise.resolve(); await Promise.resolve(); expect(model.storeWrite).toHaveBeenCalledWith('todos', [expect.objectContaining({ text: 'Recognized words', done: false })]); });
  it('commits edited text on blur only when content changes', () => { const root = ((SttContent() as TreeElement)); const body = byClass(root, 'stt-text-body'); const ref = body.props.ref as { current: { textContent: string } | null }; ref.current = { textContent: ' New words ' }; invoke(body, 'onBlur'); expect(model.store.setStt).toHaveBeenCalledWith('New words'); });
});
