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
 * @file agentContent.test.tsx
 * @description AgentContent 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { invoke } from '../../test/tree';

import { AgentContent } from '../AgentContent';

import { AgentContentView } from '../components/AgentContentView';
import type { TreeElement } from '../../test/tree';
const slots = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => unknown> }));
vi.mock('react', async (importOriginal) => { const actual = await importOriginal<typeof import('react')>(); const { mockHooks } = await import('../../test/hooks'); return mockHooks(actual, slots); });
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));
beforeEach(() => { slots.cursor = 0; slots.values = []; slots.effects = []; });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const model = vi.hoisted(() => ({ store: { agentPrompt: 'Prompt', setIdle: vi.fn(), aiConfig: { workspaces: ['workspace'] } }, display: { overlayText: '', overlayLabel: 'Thinking', isThinkOnly: true, renderedDisplay: 'Result' }, auth: vi.fn(), run: vi.fn(), scroll: vi.fn() }));
vi.mock('../../../../store/isLandStore', () => ({ default: (selector: (state: typeof model.store) => unknown) => selector(model.store) }));
vi.mock('../hooks/useAgentDisplayState', () => ({ useAgentDisplayState: () => model.display }));
vi.mock('../hooks/useAgentAuthDecision', () => ({ useAgentAuthDecision: () => model.auth }));
vi.mock('../hooks/useAgentRunner', () => ({ useAgentRunner: model.run }));
vi.mock('../hooks/useAgentAutoScroll', () => ({ useAgentAutoScroll: model.scroll }));
describe('AgentContent', () => {
  it('wires runner state, derived display and close action', () => { const root = (AgentContent() as TreeElement); expect(root.type).toBe(AgentContentView); expect(root.props).toMatchObject({ phase: 'connecting', ...model.display, authPending: null }); expect(model.run).toHaveBeenCalledWith(expect.objectContaining({ agentPrompt: 'Prompt', aiConfig: model.store.aiConfig })); invoke(root, 'onClose'); expect(model.store.setIdle).toHaveBeenCalledWith(true); });
  it('delegates authorization decisions to the auth hook', () => { const root = (AgentContent() as TreeElement); invoke(root, 'onAllow'); invoke(root, 'onDeny'); expect(model.auth.mock.calls).toEqual([[true], [false]]); });
  it('forwards retained error and authorization state to view', () => { slots.values = ['error', '', '', 'Failure', { type: 'tool', requestId: 'request', description: 'Allow' }]; const root = (AgentContent() as TreeElement); expect(root.props.phase).toBe('error'); expect(root.props.authPending).toMatchObject({ requestId: 'request' }); });
});
