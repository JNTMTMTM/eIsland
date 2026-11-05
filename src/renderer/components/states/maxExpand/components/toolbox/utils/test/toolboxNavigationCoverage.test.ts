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
 * @file toolboxNavigationCoverage.test.ts
 * @description 工具箱跨窗口编辑重放、损坏持久化数据与本地化搜索边界回归。
 * @author 鸡哥
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TOOLBOX_NAV_ORDER, TOOLBOX_NAV_CARDS, TOOLBOX_NAV_CONFIG_STORE_KEY } from '../../../tools/config/commonToolboxConfig';
import { applyToolboxNavEdits, getHiddenToolboxCards, getVisibleToolboxCards, parseToolboxNavConfig, readToolboxNavConfig, searchToolboxCards } from '../toolboxNavigation';
import type { TFunction } from 'i18next';
import type { ToolboxIndexCardId } from '../../types';

const missing = 'removed-tool' as ToolboxIndexCardId;
afterEach(() => vi.unstubAllGlobals());

describe('toolbox persisted navigation boundaries', () => {
  it('ignores invalid and duplicate visible IDs without duplicating rendered cards', () => {
    expect(getVisibleToolboxCards(['software', 'software', missing, 'translate']).map((card) => card.id)).toEqual(['software', 'translate']);
  });

  it('respects hidden ordering while filtering stale IDs, duplicates and visible cards', () => {
    const visible = getVisibleToolboxCards(['software']);
    const hidden = getHiddenToolboxCards(['translate', 'translate', 'software', missing], visible);
    expect(hidden[0].id).toBe('translate');
    expect(hidden.map((card) => card.id)).toEqual(['translate', ...DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => !['software', 'translate'].includes(id))]);
    expect(new Set(hidden.map((card) => card.id)).size).toBe(hidden.length);
  });

  it('replays duplicate additions and removals idempotently without mutating the remote snapshot', () => {
    const initial = { visibleOrder: ['software'] as ToolboxIndexCardId[], hiddenOrder: ['translate'] as ToolboxIndexCardId[] };
    const snapshot = structuredClone(initial);
    const next = applyToolboxNavEdits(initial, [
      { type: 'add', id: 'software' }, { type: 'remove', id: 'translate' },
      { type: 'add', id: 'translate' }, { type: 'remove', id: 'software' },
    ]);
    expect(next).toEqual({ visibleOrder: ['translate'], hiddenOrder: ['software'] });
    expect(initial).toEqual(snapshot);
  });

  it.each([null, missing])('moves a visible card to the end when its insertion anchor is absent: %s', (before) => {
    const initial = { visibleOrder: ['software', 'translate', 'networkService'] as ToolboxIndexCardId[], hiddenOrder: [] };
    expect(applyToolboxNavEdits(initial, [{ before, type: 'move', id: 'software' }]).visibleOrder).toEqual(['translate', 'networkService', 'software']);
  });

  it('ignores moves for remotely removed cards and applies reset before later edits', () => {
    const initial = { visibleOrder: ['software'] as ToolboxIndexCardId[], hiddenOrder: ['translate'] as ToolboxIndexCardId[] };
    expect(applyToolboxNavEdits(initial, [{ type: 'move', id: 'translate', before: 'software' }])).toEqual(initial);
    const reset = applyToolboxNavEdits(initial, [{ type: 'remove', id: 'software' }, { type: 'reset' }, { type: 'remove', id: 'translate' }]);
    expect(reset.visibleOrder).toEqual(DEFAULT_TOOLBOX_NAV_ORDER.filter((id) => id !== 'translate'));
    expect(reset.hiddenOrder).toEqual(['translate']);
  });

  it('loads the atomic object without reading legacy keys and keeps an explicit empty list', async () => {
    const raw = { visibleOrder: [], hiddenOrder: ['translate'] };
    const read = vi.fn<Window['api']['storeRead']>().mockResolvedValue(raw);
    vi.stubGlobal('window', { api: { storeRead: read } });
    expect(await readToolboxNavConfig()).toEqual({ raw, config: parseToolboxNavConfig([], ['translate']) });
    expect(read).toHaveBeenCalledExactlyOnceWith(TOOLBOX_NAV_CONFIG_STORE_KEY, true);
  });

  it.each([null, [], 'corrupt', 17])('falls back to both legacy keys for a non-object atomic value: %j', async (raw) => {
    const read = vi.fn<Window['api']['storeRead']>()
      .mockResolvedValueOnce(raw)
      .mockResolvedValueOnce(['software'])
      .mockResolvedValueOnce(['translate']);
    vi.stubGlobal('window', { api: { storeRead: read } });
    expect(await readToolboxNavConfig()).toEqual({ raw, config: parseToolboxNavConfig(['software'], ['translate']) });
    expect(read.mock.calls.map(([key]) => key)).toEqual([TOOLBOX_NAV_CONFIG_STORE_KEY, 'toolbox-nav-order', 'toolbox-hidden-nav-order']);
  });

  it('matches translated descriptions independently of labels, trims case and rejects blank queries', () => {
    const chosen = TOOLBOX_NAV_CARDS.find((card) => card.id === 'software')!;
    const t = ((key: string) => {
      if (key === chosen.descKey) return 'Unique DESCRIPTION';
      if (key === chosen.labelKey) return 'Localized software';
      return 'Other';
    }) as unknown as TFunction;
    expect(searchToolboxCards('  description ', t)?.map((card) => card.id)).toEqual(['software']);
    expect(searchToolboxCards('localized', t)?.[0].localizedLabel).toBe('Localized software');
    expect(searchToolboxCards('not present', t)).toEqual([]);
    expect(searchToolboxCards('\t \n', t)).toBeNull();
  });
});
