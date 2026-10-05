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
 * @file agentContentView.test.tsx
 * @description AgentContentView 的真实渲染分支、关键交互与边界状态测试。
 * @author 鸡哥
 */

import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { byClass, invoke, text } from '../../../test/tree';

import { AgentContentView } from '../AgentContentView';
import type { TreeElement } from '../../../test/tree';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }) }));

function fixture() { return { phase: 'connecting' as Parameters<typeof AgentContentView>[0]['phase'], overlayLabel: null as string | null, renderedDisplay: createElement('strong', {}, 'Answer'), textRef: { current: null }, overlayText: '', isThinkOnly: false, authPending: null as Parameters<typeof AgentContentView>[0]['authPending'], onClose: vi.fn(), onAllow: vi.fn(), onDeny: vi.fn() }; }
describe('AgentContentView', () => {
  it.each(['connecting', 'thinking', 'toolCalling', 'answering', 'done', 'error'] as const)('renders phase %s icon and close action', (phase) => { const props = fixture(); props.phase = phase; const root = (AgentContentView(props) as TreeElement); expect(byClass(root, 'agent-icon').props.src).toContain('AGENT_'); expect(text(root)).toContain('Answer'); invoke(byClass(root, 'agent-action-btn'), 'onClick'); expect(props.onClose).toHaveBeenCalledOnce(); expect(byClass(root, 'agent-text-body').props.className?.includes('agent-text-error')).toBe(phase === 'error'); });
  it('replaces close with allow/deny when authorization is pending', () => { const props = fixture(); props.authPending = { type: 'tool', requestId: 'req', description: 'Permission' }; props.overlayText = 'Permission'; props.overlayLabel = 'Authorize'; const root = (AgentContentView(props) as TreeElement); expect(text(root)).toContain('Authorize'); expect(byClass(root, 'agent-text-body').props.className).toContain('agent-text-auth'); invoke(byClass(root, 'agent-action-allow'), 'onClick'); invoke(byClass(root, 'agent-action-deny'), 'onClick'); expect(props.onAllow).toHaveBeenCalledOnce(); expect(props.onDeny).toHaveBeenCalledOnce(); expect(props.onClose).not.toHaveBeenCalled(); });
  it('marks thinking-only text when no overlay is present', () => { const props = fixture(); props.isThinkOnly = true; expect(byClass((AgentContentView(props) as TreeElement), 'agent-text-body').props.className).toContain('agent-text-thinking'); });
});
