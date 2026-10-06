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
 * @file indexSettingsSearchInteractions.test.ts
 * @description 配置搜索使用真实索引执行本地化、空白输入与图标展示分支回归。
 * @author 鸡哥
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import IndexSettingsSearch from '../indexSettingsSearch';
import { elementProps, elements, findElement, invoke, textContent } from '../../../../../../../test/elementHarness';
import { renderWithHooks, resetLifecycle } from '../../app/components/test/themeHookHarness';
import type { ComponentProps, ReactElement } from 'react';
vi.mock('react', async (original) => ({ ...(await original<typeof import('react')>()), ...(await import('../../../../../../../test/elementHarness')).hookMocks, ...(await import('../../app/components/test/themeHookHarness')).lifecycleHooks }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
/**
 * 执行真实 memo 搜索组件。
 * @param props - 公开搜索导航回调。
 * @returns 实际元素树。
 */
function render(props: ComponentProps<typeof IndexSettingsSearch>) { const { type } = IndexSettingsSearch as unknown as { type: (input: ComponentProps<typeof IndexSettingsSearch>) => ReactElement }; return renderWithHooks(() => type(props)); }
beforeEach(()=>{resetLifecycle(); vi.clearAllMocks();});
describe('真实搜索索引与公开输入',()=>{
  it('空白输入不启动索引，真实本地化条目产生图标并能导航',()=>{
    const props = {setAppSettingsPage:vi.fn(),setMusicSettingsPage:vi.fn(),setActiveTab:vi.fn()};
    invoke(findElement(render(props),(node)=>node.type === 'input'),'onChange',{target:{value:'   '}}); expect(elements(render(props)).some((node)=>elementProps(node).className === 'settings-index-search-dropdown')).toBe(false);
    invoke(findElement(render(props),(node)=>node.type === 'input'),'onChange',{target:{value:'settings.app.layout.previewTitle'}});
    const result = findElement(render(props),(node)=>elementProps(node).className === 'settings-index-search-dropdown-item'); expect(textContent(result)).toContain('settings.app.layout.previewHint'); expect(elements(result).some((node)=>node.type === 'img')).toBe(true);
    invoke(result,'onClick'); expect(props.setAppSettingsPage).toHaveBeenCalledWith('layout-preview'); expect(elementProps(findElement(render(props),(node)=>node.type === 'input')).value).toBe('');
  });
});
