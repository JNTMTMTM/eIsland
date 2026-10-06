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
 * @file translationTabIntegration.test.tsx
 * @description 翻译页面真实 Hook 与接口、私有菜单公开渲染边界、定位和原生外部点击集成测试。
 * @author 鸡哥
 */

import {
  isValidElement, type ReactElement, type ReactNode
} from 'react';
import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest';
import {
  TranslationTab
} from '../TranslationTab';
import {
  byClass, elements, invoke
} from '../../../test/tree';
import {
  renderWithHooks, resetLifecycle, runEffects, unmountHooks
} from '../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness';

const translate = vi.hoisted(() => {
  vi.stubGlobal('window', {
    location: {
      hostname: 'app'
    }
  });
  return vi.fn<(key: string) => string>((key) => key);
});
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate
  })
}));
vi.mock('react-dom', () => ({
  createPortal: (children: ReactNode) => children
}));
vi.mock('react', async (original) => ({
  ...(await original<typeof import('react')>()),
  ...(await import('../../../../test/elementHarness')).hookMocks,
  ...(await import('../../../maxExpand/components/setting/hooks/test/settingsCoverageHarness')).lifecycleHooks
}));

const netFetch = vi.fn<Window['api']['netFetch']>();
const getItem = vi.fn<Storage['getItem']>();
const writeText = vi.fn<(text: string) => Promise<void>>();
let surface: EventTarget;
let wrapperInside: boolean;
let menuInside: boolean;
let hasContainer: boolean;
interface LanguageProps {
  options: readonly {
    code: string;
    labelKey: string
  }[];
  value: string;
  onChange: (code: string) => void;
}
/**
 * 执行真实父页与两个实际子菜单，每轮维持同一 Hook 调用顺序。
 * @returns 页面和两个真实菜单元素树。
 */
function view() {
  return renderWithHooks(() => {
    const root = TranslationTab();
    const blocks = elements(root).filter((node) => node.props.className === 'translation-language-block');
    const menus = blocks.map((block) => {
      const child = block.props.children;
      if (!isValidElement<LanguageProps>(child) || typeof child.type !== 'function') throw new Error('Missing real menu');
      const menu = (child.type as (props: LanguageProps) => ReactElement)(child.props);
      const ref = byClass(menu, 'translation-lang-dropdown').props.ref as {
        current: unknown
      };
      ref.current = {
        contains: () => wrapperInside, getBoundingClientRect: () => ({
          bottom: 100, left: 12, width: 90
        }), closest: () => hasContainer ? {
          getBoundingClientRect: () => ({
            bottom: 150
          })
        } : null
      };
      const portal = elements(menu).find((node) => node.props.className === 'translation-lang-dropdown-menu');
      if (portal) {(portal.props.ref as {
        current: unknown
      }).current = {
        contains: () => menuInside
      };}
      return menu;
    });
    return {
      root, menus
    };
  });
}
/**
 * 执行真实定位和监听 effect，并消费翻译 Promise。
 * @returns 更新后的页面。
 */
async function commit() {
  view();
  runEffects();
  await Array.from({
    length: 12
  }).reduce<Promise<void>>((previous) => previous.then(() => undefined), Promise.resolve());
  return view();
}
beforeEach(() => {
  resetLifecycle();
  vi.clearAllMocks();
  wrapperInside = false;
  menuInside = false;
  hasContainer = true;
  netFetch.mockResolvedValue({
    ok: true, status: 200, body: '{"code":200,"data":{"targetText":"Hello"}}'
  });
  getItem.mockReturnValue('token');
  writeText.mockResolvedValue(undefined);
  surface = new EventTarget();
  vi.stubGlobal('document', Object.assign(surface, {
    body: {
    }
  }));
  vi.stubGlobal('window', {
    innerHeight: 200, location: {
      hostname: 'app'
    }, api: {
      netFetch
    }
  });
  vi.stubGlobal('localStorage', {
    getItem
  });
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText
    }
  });
});
afterEach(() => {
  unmountHooks();
  vi.unstubAllGlobals();
});
describe('TranslationTab 真实 Hook 集成', () => {
  it('真实文本输入经过翻译接口并展示等待状态支持复制和清空', async () => {
    const {
      root
    } = view();
    expect(byClass(root, 'translation-primary-btn').props.disabled).toBe(true);
    invoke(byClass(root, 'translation-editor-textarea'), 'onChange', {
      target: {
        value: '你好'
      }
    });
    invoke(byClass(view().root, 'translation-primary-btn'), 'onClick');
    expect(byClass(view().root, 'translation-primary-btn').props.title).toBe('maxExpand.toolbox.translate.translating');
    const translated = (await commit()).root;
    expect(byClass(translated, 'translation-editor-textarea-result').props.value).toBe('Hello');
    expect(netFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      body: '{"text":"你好","source":"auto","target":"en"}'
    }));
    invoke(byClass(translated, 'translation-copy-btn'), 'onClick');
    expect(writeText).toHaveBeenCalledWith('Hello');
    invoke(byClass(translated, 'translation-secondary-btn'), 'onClick');
    expect(byClass(view().root, 'translation-editor-textarea').props.value).toBe('');
    expect(byClass(view().root, 'translation-editor-textarea-result').props.value).toBe('');
  });
  it.each([true, false])('容器 %s 定位菜单并保留内部点击且关闭外部点击', async (container) => {
    hasContainer = container;
    await commit();
    invoke(byClass(view().menus[0], 'translation-lang-dropdown-trigger'), 'onClick');
    let [menu] = (await commit()).menus;
    expect(byClass(menu, 'translation-lang-dropdown-menu').props.style).toMatchObject({
      top: 104, left: 12, maxHeight: container ? 80 : 92
    });
    wrapperInside = true;
    surface.dispatchEvent(new Event('mousedown'));
    expect(byClass(view().menus[0], 'translation-lang-dropdown-trigger').props['aria-expanded']).toBe(true);
    wrapperInside = false;
    menuInside = true;
    surface.dispatchEvent(new Event('mousedown'));
    expect(byClass(view().menus[0], 'translation-lang-dropdown-trigger').props['aria-expanded']).toBe(true);
    menuInside = false;
    surface.dispatchEvent(new Event('mousedown'));
    expect(byClass(view().menus[0], 'translation-lang-dropdown-trigger').props['aria-expanded']).toBe(false);
    invoke(byClass(view().menus[0], 'translation-lang-dropdown-trigger'), 'onClick');
    [menu] = (await commit()).menus;
    const choices = elements(menu).filter((node) => String(node.props.className).includes('translation-lang-dropdown-item'));
    invoke(choices[1], 'onClick');
    expect(byClass(view().root, 'translation-swap-btn').props.disabled).toBe(false);
    expect(byClass(view().menus[0], 'translation-lang-dropdown-trigger').props['aria-expanded']).toBe(false);
  });
});
