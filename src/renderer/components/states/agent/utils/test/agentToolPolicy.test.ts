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
 * @file agentToolPolicy.test.ts
 * @description Agent 工具分类与授权策略单元测试。
 * @author 鸡哥
 */

import { describe, it, expect } from 'vitest';
import { isClientLocalToolName, isHighRiskLocalToolName } from '../agentToolPolicy';

// ---------------------------------------------------------------------------
// isClientLocalToolName
// ---------------------------------------------------------------------------
describe('isClientLocalToolName', () => {
  describe('exact name match', () => {
    it('returns true for "web.search"', () => {
      expect(isClientLocalToolName('web.search')).toBe(true);
    });

    it('is case-insensitive for exact name', () => {
      expect(isClientLocalToolName('WEB.SEARCH')).toBe(true);
      expect(isClientLocalToolName('Web.Search')).toBe(true);
    });

    it('trims whitespace before matching exact name', () => {
      expect(isClientLocalToolName('  web.search  ')).toBe(true);
    });
  });

  describe('prefix match', () => {
    const prefixTools = [
      'file.read',
      'cmd.exec',
      'sys.info',
      'win.active',
      'clipboard.read',
      'notification.show',
      'net.http',
      'monitor.cpu',
      'volume.set',
      'brightness.set',
      'display.info',
      'power.sleep',
      'wifi.scan',
      'registry.read',
      'service.list',
      'schedule.list',
      'firewall.rule',
      'defender.status',
      'island.show',
      'alarm.create',
      'todolist.add',
    ];

    it.each(prefixTools)('returns true for "%s"', (tool) => {
      expect(isClientLocalToolName(tool)).toBe(true);
    });

    it('is case-insensitive for prefix match', () => {
      expect(isClientLocalToolName('FILE.READ')).toBe(true);
      expect(isClientLocalToolName('Cmd.Exec')).toBe(true);
    });

    it('trims whitespace before matching prefix', () => {
      expect(isClientLocalToolName('  file.read  ')).toBe(true);
    });
  });

  describe('returns false for non-local tools', () => {
    it('returns false for a completely unrelated tool name', () => {
      expect(isClientLocalToolName('random.tool')).toBe(false);
    });

    it('returns false for a similar but non-matching prefix', () => {
      expect(isClientLocalToolName('files.read')).toBe(false);
      expect(isClientLocalToolName('cmdd.exec')).toBe(false);
    });

    it('returns false for a substring that is not a prefix', () => {
      expect(isClientLocalToolName('some.file.read')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isClientLocalToolName('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isClientLocalToolName('   ')).toBe(false);
    });
  });

  describe('boundary: partial prefix not matched', () => {
    it('does not match "web.searching" (not in exact names, not a prefix)', () => {
      // "web.searching" starts with "web.search" but "web.search" is an exact name, not a prefix
      // No prefix starts with "web." so this should be false
      expect(isClientLocalToolName('web.searching')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// isHighRiskLocalToolName
// ---------------------------------------------------------------------------
describe('isHighRiskLocalToolName', () => {
  describe('matches high-risk prefix tools', () => {
    const highRiskTools = [
      'file.delete',
      'file.delete.confirm',
      'file.rename',
      'file.rename.batch',
      'file.trash',
      'cmd.exec',
      'cmd.exec.sudo',
      'cmd.powershell',
      'win.close',
      'win.close.all',
      'win.minimize',
      'win.maximize',
      'win.restore',
      'power.sleep',
      'power.shutdown',
      'registry.write',
      'registry.write.batch',
      'registry.delete',
      'service.start',
      'service.stop',
      'service.restart',
      'schedule.task.create',
      'net.proxy',
      'net.proxy.set',
      'net.hosts',
      'net.hosts.add',
      'defender.scan',
      'island.settings.write',
      'island.theme.set',
      'island.opacity.set',
      'island.restart',
      'alarm.delete',
      'todolist.delete',
    ];

    it.each(highRiskTools)('returns true for "%s"', (tool) => {
      expect(isHighRiskLocalToolName(tool)).toBe(true);
    });
  });

  describe('case-insensitive matching', () => {
    it('returns true for uppercase input', () => {
      expect(isHighRiskLocalToolName('FILE.DELETE')).toBe(true);
    });

    it('returns true for mixed-case input', () => {
      expect(isHighRiskLocalToolName('Cmd.Exec')).toBe(true);
    });
  });

  describe('trims whitespace', () => {
    it('returns true when tool has leading/trailing whitespace', () => {
      expect(isHighRiskLocalToolName('  cmd.exec  ')).toBe(true);
    });
  });

  describe('returns false for non-high-risk tools', () => {
    it('returns false for a client-local tool that is not high-risk', () => {
      expect(isHighRiskLocalToolName('file.read')).toBe(false);
      expect(isHighRiskLocalToolName('clipboard.read')).toBe(false);
      expect(isHighRiskLocalToolName('volume.set')).toBe(false);
      expect(isHighRiskLocalToolName('island.show')).toBe(false);
      expect(isHighRiskLocalToolName('todolist.add')).toBe(false);
      expect(isHighRiskLocalToolName('alarm.create')).toBe(false);
    });

    it('returns false for an unrelated tool', () => {
      expect(isHighRiskLocalToolName('random.tool')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isHighRiskLocalToolName('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isHighRiskLocalToolName('   ')).toBe(false);
    });

    it('returns false for a non-prefix substring match', () => {
      expect(isHighRiskLocalToolName('some.cmd.exec')).toBe(false);
    });
  });

  describe('prefix specificity', () => {
    it('"file.delete" matches but "file.del" does not', () => {
      expect(isHighRiskLocalToolName('file.delete')).toBe(true);
      expect(isHighRiskLocalToolName('file.del')).toBe(false);
    });

    it('"power." matches power-related tools', () => {
      expect(isHighRiskLocalToolName('power.sleep')).toBe(true);
      expect(isHighRiskLocalToolName('power.shutdown')).toBe(true);
    });

    it('"service.restart" matches extended names', () => {
      expect(isHighRiskLocalToolName('service.restart.force')).toBe(true);
    });
  });
});
