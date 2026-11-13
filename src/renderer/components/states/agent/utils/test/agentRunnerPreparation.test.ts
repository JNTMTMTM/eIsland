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
 * @file agentRunnerPreparation.test.ts
 * @description agentRunnerPreparation.ts 单元测试
 * @author 鸡哥
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- vi.hoisted mocks ---------- */

const {
  getRoleFromTokenMock,
  loadLocationFromStorageMock,
  buildMihtnelisContextMock,
  loadAgentModeMock,
  useIslandStoreGetStateMock,
  readTextFileMock,
} = vi.hoisted(() => ({
  getRoleFromTokenMock: vi.fn(),
  loadLocationFromStorageMock: vi.fn(),
  buildMihtnelisContextMock: vi.fn(),
  loadAgentModeMock: vi.fn(),
  useIslandStoreGetStateMock: vi.fn(),
  readTextFileMock: vi.fn(),
}));

vi.mock('../../../../../utils/userAccount', () => ({
  getRoleFromToken: getRoleFromTokenMock,
}));

vi.mock('../../../../../store/utils/storage', () => ({
  loadLocationFromStorage: loadLocationFromStorageMock,
}));

vi.mock('../../../../states/maxExpand/components/agent/utils/chatUtils', () => ({
  buildMihtnelisContext: buildMihtnelisContextMock,
}));

vi.mock('../agentMode', () => ({
  loadAgentMode: loadAgentModeMock,
}));

vi.mock('../../../../../store/isLandStore', () => ({
  default: { getState: useIslandStoreGetStateMock },
}));

/* ---------- stub window for Node test environment ---------- */

vi.stubGlobal('window', { api: {} });

/* ---------- import after mocks ---------- */

import {
  resolveAgentRouting,
  resolveAgentContextAndSkills,
  buildCurrentTimestamp,
  buildCurrentLocation,
} from '../agentRunnerPreparation';

/* ---------- helpers ---------- */

function makeAiConfig(overrides: Record<string, unknown> = {}) {
  return {
    model: 'deepseek-v4-flash',
    apiKey: '',
    endpoint: '',
    customApiModel: '',
    skills: [],
    ...overrides,
  } as ReturnType<typeof import('../../../../store/isLandStore').default.getState>['aiConfig'];
}

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    activeAiChatSessionId: 'session-1',
    aiChatSessions: [
      { id: 'session-1', messages: [{ role: 'user', content: 'hello' }] },
    ],
    ...overrides,
  } as ReturnType<typeof import('../../../../store/isLandStore').default.getState>;
}

/* ---------- tests ---------- */

describe('resolveAgentRouting', () => {
  beforeEach(() => {
    loadAgentModeMock.mockReturnValue('mihtnelis');
  });

  // --- Ollama model ---

  it('returns ollama provider when model is "ollama"', () => {
    getRoleFromTokenMock.mockReturnValue('user');
    const result = resolveAgentRouting(makeAiConfig({ model: 'ollama' }), 'token');
    expect(result.isOllama).toBe(true);
    expect(result.selectedModel).toBe('ollama');
    expect(result.selectedProvider).toBe('ollama');
    expect(result.useCustomApi).toBe(false);
  });

  // --- Custom API (pro user) ---

  it('returns custom provider when model is "custom-api", user is pro, and apiKey+endpoint are set', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: 'key', endpoint: 'https://api.example.com' }),
      'token',
    );
    expect(result.useCustomApi).toBe(true);
    expect(result.selectedProvider).toBe('custom');
    expect(result.selectedModel).toBe('gpt-4o-mini'); // default when customApiModel is empty
  });

  it('uses customApiModel when provided for custom-api', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: 'key', endpoint: 'https://api.example.com', customApiModel: 'gpt-4o' }),
      'token',
    );
    expect(result.selectedModel).toBe('gpt-4o');
  });

  it('falls back to non-custom when user is not pro even with custom-api model', () => {
    getRoleFromTokenMock.mockReturnValue('user');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: 'key', endpoint: 'https://api.example.com' }),
      'token',
    );
    expect(result.useCustomApi).toBe(false);
    expect(result.selectedProvider).toBe('deepseek');
  });

  it('falls back to non-custom when apiKey is missing', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: '', endpoint: 'https://api.example.com' }),
      'token',
    );
    expect(result.useCustomApi).toBe(false);
  });

  it('falls back to non-custom when endpoint is missing', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: 'key', endpoint: '' }),
      'token',
    );
    expect(result.useCustomApi).toBe(false);
  });

  it('falls back to non-custom when apiKey is whitespace only', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: '   ', endpoint: 'https://api.example.com' }),
      'token',
    );
    expect(result.useCustomApi).toBe(false);
  });

  it('treats admin role as pro for custom-api', () => {
    getRoleFromTokenMock.mockReturnValue('admin');
    const result = resolveAgentRouting(
      makeAiConfig({ model: 'custom-api', apiKey: 'key', endpoint: 'https://api.example.com' }),
      'token',
    );
    expect(result.useCustomApi).toBe(true);
  });

  // --- Standard model selection ---

  it('selects known model directly', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(makeAiConfig({ model: 'deepseek-v4-pro' }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-pro');
    expect(result.selectedProvider).toBe('deepseek');
  });

  it('falls back to deepseek-v4-flash for unknown model', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(makeAiConfig({ model: 'unknown-model' }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-flash');
    expect(result.selectedProvider).toBe('deepseek');
  });

  // --- Non-pro downgrade of pro-tier models ---

  it('downgrades deepseek-v4-pro to deepseek-v4-flash for non-pro user', () => {
    getRoleFromTokenMock.mockReturnValue('user');
    const result = resolveAgentRouting(makeAiConfig({ model: 'deepseek-v4-pro' }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-flash');
  });

  it('does not downgrade pro-tier model for pro user', () => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(makeAiConfig({ model: 'deepseek-v4-pro' }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-pro');
  });

  // --- Retired MiMo / MiniMax models ---

  it.each(['mimo-v2.5', 'mimo-v2.5-pro', 'MiniMax-M2.7', 'MiniMax-M2.5-highspeed'])('falls back to deepseek-v4-flash for retired model %s', (model) => {
    getRoleFromTokenMock.mockReturnValue('pro');
    const result = resolveAgentRouting(makeAiConfig({ model }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-flash');
    expect(result.selectedProvider).toBe('deepseek');
  });

  // --- agentMode passthrough ---

  it('includes agentMode from loadAgentMode()', () => {
    getRoleFromTokenMock.mockReturnValue('user');
    loadAgentModeMock.mockReturnValue('explorer');
    const result = resolveAgentRouting(makeAiConfig(), 'token');
    expect(result.agentMode).toBe('explorer');
  });

  // --- edge: null token role ---

  it('treats null role as non-pro', () => {
    getRoleFromTokenMock.mockReturnValue(null);
    const result = resolveAgentRouting(makeAiConfig({ model: 'deepseek-v4-pro' }), 'token');
    expect(result.selectedModel).toBe('deepseek-v4-flash');
    expect(result.useCustomApi).toBe(false);
  });
});

describe('resolveAgentContextAndSkills', () => {
  beforeEach(() => {
    // Mock window.api.readTextFile
    Object.defineProperty(window, 'api', {
      value: { readTextFile: readTextFileMock },
      writable: true,
      configurable: true,
    });
  });

  it('returns session context and no skills when skills array is empty', async () => {
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('context-text');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills: [] }));

    expect(result.activeSessionId).toBe('session-1');
    expect(result.context).toBe('context-text');
    expect(result.resolvedSkills).toBeUndefined();
  });

  it('uses "island-agent-inline" fallback when activeAiChatSessionId is empty', async () => {
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState({ activeAiChatSessionId: '' }));
    buildMihtnelisContextMock.mockReturnValue('');

    const result = await resolveAgentContextAndSkills(makeAiConfig());

    expect(result.activeSessionId).toBe('island-agent-inline');
  });

  it('builds context from session messages', async () => {
    const messages = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];
    useIslandStoreGetStateMock.mockReturnValue(
      makeStoreState({ aiChatSessions: [{ id: 'session-1', messages }] }),
    );
    buildMihtnelisContextMock.mockReturnValue('built-context');

    await resolveAgentContextAndSkills(makeAiConfig());

    expect(buildMihtnelisContextMock).toHaveBeenCalledWith(messages);
  });

  it('passes empty array to buildMihtnelisContext when no active session found', async () => {
    useIslandStoreGetStateMock.mockReturnValue(
      makeStoreState({ activeAiChatSessionId: 'non-existent', aiChatSessions: [] }),
    );
    buildMihtnelisContextMock.mockReturnValue('');

    await resolveAgentContextAndSkills(makeAiConfig());

    expect(buildMihtnelisContextMock).toHaveBeenCalledWith([]);
  });

  // --- Skills resolution ---

  it('resolves enabled skills with valid file content', async () => {
    const skills = [
      { name: 'skill-a', filePath: '/path/a.md', enabled: true },
      { name: 'skill-b', filePath: '/path/b.md', enabled: true },
    ];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValueOnce('content-a').mockResolvedValueOnce('content-b');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(result.resolvedSkills).toEqual([
      { name: 'skill-a', content: 'content-a' },
      { name: 'skill-b', content: 'content-b' },
    ]);
  });

  it('skips disabled skills', async () => {
    const skills = [
      { name: 'skill-a', filePath: '/path/a.md', enabled: true },
      { name: 'skill-b', filePath: '/path/b.md', enabled: false },
    ];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValue('content');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(readTextFileMock).toHaveBeenCalledTimes(1);
    expect(readTextFileMock).toHaveBeenCalledWith('/path/a.md');
    expect(result.resolvedSkills).toEqual([{ name: 'skill-a', content: 'content' }]);
  });

  it('skips skills without filePath', async () => {
    const skills = [
      { name: 'skill-a', filePath: '', enabled: true },
      { name: 'skill-b', filePath: '/path/b.md', enabled: true },
    ];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValue('content');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(readTextFileMock).toHaveBeenCalledTimes(1);
    expect(readTextFileMock).toHaveBeenCalledWith('/path/b.md');
    expect(result.resolvedSkills).toEqual([{ name: 'skill-b', content: 'content' }]);
  });

  it('returns undefined resolvedSkills when all file reads return null', async () => {
    const skills = [{ name: 'skill-a', filePath: '/path/a.md', enabled: true }];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValue(null);

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(result.resolvedSkills).toBeUndefined();
  });

  it('returns undefined resolvedSkills when file content is empty/whitespace', async () => {
    const skills = [{ name: 'skill-a', filePath: '/path/a.md', enabled: true }];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValue('   ');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(result.resolvedSkills).toBeUndefined();
  });

  it('returns undefined resolvedSkills when skills is not an array', async () => {
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills: undefined }));

    expect(result.resolvedSkills).toBeUndefined();
  });

  it('mixes valid and null file reads, returning only valid skills', async () => {
    const skills = [
      { name: 'skill-a', filePath: '/path/a.md', enabled: true },
      { name: 'skill-b', filePath: '/path/b.md', enabled: true },
    ];
    useIslandStoreGetStateMock.mockReturnValue(makeStoreState());
    buildMihtnelisContextMock.mockReturnValue('');
    readTextFileMock.mockResolvedValueOnce(null).mockResolvedValueOnce('content-b');

    const result = await resolveAgentContextAndSkills(makeAiConfig({ skills }));

    expect(result.resolvedSkills).toEqual([{ name: 'skill-b', content: 'content-b' }]);
  });
});

describe('buildCurrentTimestamp', () => {
  it('returns a timestamp string in ISO-like format with timezone offset', () => {
    const result = buildCurrentTimestamp();
    // Pattern: YYYY-MM-DDThh:mm:ss+HH:MM or -HH:MM
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('returns current year in the timestamp', () => {
    const now = new Date();
    const result = buildCurrentTimestamp();
    expect(result).toContain(String(now.getFullYear()));
  });

  it('returns consistent result when called multiple times in quick succession', () => {
    const a = buildCurrentTimestamp();
    const b = buildCurrentTimestamp();
    // Both should have the same date portion (within the same second)
    expect(a.slice(0, 10)).toBe(b.slice(0, 10));
  });
});

describe('buildCurrentLocation', () => {
  beforeEach(() => {
    loadLocationFromStorageMock.mockReset();
  });

  it('returns undefined when location is null', () => {
    loadLocationFromStorageMock.mockReturnValue(null);
    expect(buildCurrentLocation()).toBeUndefined();
  });

  it('returns city, regionName, country joined by comma', () => {
    loadLocationFromStorageMock.mockReturnValue({
      city: 'Shanghai',
      regionName: 'SH',
      country: 'CN',
    });
    expect(buildCurrentLocation()).toBe('Shanghai, SH, CN');
  });

  it('filters out falsy parts', () => {
    loadLocationFromStorageMock.mockReturnValue({
      city: 'Shanghai',
      regionName: '',
      country: 'CN',
    });
    expect(buildCurrentLocation()).toBe('Shanghai, CN');
  });

  it('returns undefined when all parts are empty', () => {
    loadLocationFromStorageMock.mockReturnValue({
      city: '',
      regionName: '',
      country: '',
    });
    expect(buildCurrentLocation()).toBeUndefined();
  });

  it('returns undefined when location has only undefined fields', () => {
    loadLocationFromStorageMock.mockReturnValue({
      city: undefined,
      regionName: undefined,
      country: undefined,
    });
    expect(buildCurrentLocation()).toBeUndefined();
  });

  it('returns single part when only one field is set', () => {
    loadLocationFromStorageMock.mockReturnValue({
      city: 'Tokyo',
      regionName: undefined,
      country: undefined,
    });
    expect(buildCurrentLocation()).toBe('Tokyo');
  });
});
