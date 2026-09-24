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
 * @file cliContentMounting.test.ts
 * @description CLI 首次渲染不创建隐藏全年热力图和工具输出 DOM 的回归测试。
 * @author 鸡哥
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ActivityHeatmap } from './ActivityHeatmap';
import { EventRow } from './EventRow';
import type { CliHookEvent } from '../types/types';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CLI initial render workload', () => {
  it('omits the hidden heatmap entirely while keeping the full grid available when opened', () => {
    const heatmap = { '2026-09-23': { session: 1, tool: 2, prompt: 3 } };
    expect(renderToStaticMarkup(createElement(ActivityHeatmap, { heatmap, visible: false }))).toBe('');
    const visible = renderToStaticMarkup(createElement(ActivityHeatmap, { heatmap, visible: true }));
    expect(visible.match(/class="cli-tab-heatmap-cell(?: |")/g)?.length).toBeGreaterThanOrEqual(365);
    expect(visible).toContain('maxExpand.cli.heatmap.tool');
  });

  it('renders summaries and permission controls without creating collapsed tool output nodes', () => {
    const detail = 'large tool output '.repeat(64 * 1024);
    const event: CliHookEvent = {
      detail,
      id: 'permission-1', eventName: 'PermissionRequest', kind: 'permission', sessionId: 'session-1',
      cwd: null, transcriptPath: null, summary: '**Needs approval**',
      detailItems: [{ label: 'toolResult', value: detail }], toolName: 'Read',
      toolInputPreview: 'large.log', createdAt: 1, raw: {},
    };
    const markup = renderToStaticMarkup(createElement(EventRow, { event, t: (key) => key, showPermission: true }));
    expect(markup).toContain('<strong>Needs approval</strong>');
    expect(markup).toContain('cli.permission.allow');
    expect(markup).toContain('maxExpand.cli.expand');
    expect(markup).not.toContain('large tool output');
    expect(markup).not.toContain('<pre>');
    expect(event.detailItems[0].value).toBe(detail);
  });
});
