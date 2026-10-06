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
 * @file chatConstantsImport.test.ts
 * @description 对话配置门面及工具双向导入顺序、稳定导出与附件允许规则回归测试
 * @author 鸡哥
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const write = vi.fn();
beforeEach(() => { vi.resetModules(); write.mockClear(); vi.stubGlobal('localStorage', { getItem: () => 'edoc', setItem: write }); });
afterEach(() => vi.unstubAllGlobals());

it.each(['constants', 'helpers'] as const)('initializes real attachment rules when importing %s first', async (first) => {
  const initial = first === 'constants' ? await import('../chatConstants') : await import('../../utils/chatHelpers');
  const facade = await import('../chatConstants');
  const helpers = await import('../../utils/chatHelpers');
  const pure = await import('../chatRuntimeConstants');
  Object.entries(pure).forEach(([key, value]) => expect(Reflect.get(facade, key)).toBe(value));
  Object.entries(helpers).forEach(([key, value]) => expect(Reflect.get(facade, key)).toBe(value));
  expect(initial.isAcceptedAttachmentFile).toBe(helpers.isAcceptedAttachmentFile);
  expect(facade.AGENT_MODES.map((mode) => mode.id)).toEqual(['mihtnelis', 'r1pxc', 'edoc']);
  expect(facade.loadAgentMode()).toBe('edoc');
  facade.saveAgentMode('r1pxc');
  expect(write).toHaveBeenCalledWith('eIsland_agentMode', 'r1pxc');
  expect(facade.ATTACHMENT_MAX_COUNT).toBe(5);
  expect(facade.ATTACHMENT_MAX_SIZE_BYTES).toBe(102400);
  const extensions = '.txt,.md,.json,.log,.csv,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.env,.sh,.bat,.ps1,.py,.js,.ts,.jsx,.tsx,.html,.css,.scss,.less,.sql,.c,.cpp,.h,.hpp,.java,.kt,.swift,.go,.rs,.rb,.php,.lua,.diff,.patch';
  expect(facade.ATTACHMENT_ACCEPT_EXTENSIONS).toBe(extensions);
  extensions.split(',').forEach((ext) => expect(facade.isAcceptedAttachmentFile(`FILE${ext.toUpperCase()}`)).toBe(true));
  ['', 'file.exe', 'file.txt.exe', 'file.png'].forEach((name) => expect(facade.isAcceptedAttachmentFile(name)).toBe(false));
});
