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
 * @file agentVoiceInputContent.test.tsx
 * @description AgentVoiceInputContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AgentVoiceInputContent } from '../AgentVoiceInputContent';

import { AgentVoiceInputView } from '../components/AgentVoiceInputView';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ runtime: vi.fn(), scroll: vi.fn() }));
vi.mock('../hooks/useAgentVoiceInputRuntime', () => ({ useAgentVoiceInputRuntime: model.runtime }));
vi.mock('../hooks/useAgentVoiceInputAutoScroll', () => ({ useAgentVoiceInputAutoScroll: model.scroll }));
vi.mock('../../../../store/slices', () => ({ default: vi.fn() }));
describe('AgentVoiceInputContent', () => {
  it('forwards initial status and transcript with runtime setters', () => { const root = (AgentVoiceInputContent() as TreeElement); expect(root.type).toBe(AgentVoiceInputView); expect(root.props.transcript).toBe(''); expect(root.props.statusText).toBeTypeOf('string'); const [runtimeArgs] = model.runtime.mock.calls[0] as [{ setStatusText: unknown; setTranscript: unknown }]; expect(runtimeArgs.setStatusText).toBeTypeOf('function'); expect(runtimeArgs.setTranscript).toBeTypeOf('function'); });
  it('forwards updated transcript and status to auto-scroll and view', () => { slots.values = ['Recognized words', 'Listening']; const root = (AgentVoiceInputContent() as TreeElement); expect(root.props).toMatchObject({ transcript: 'Recognized words', statusText: 'Listening' }); expect(model.scroll).toHaveBeenCalledWith(expect.objectContaining({ transcript: 'Recognized words' })); });
});
