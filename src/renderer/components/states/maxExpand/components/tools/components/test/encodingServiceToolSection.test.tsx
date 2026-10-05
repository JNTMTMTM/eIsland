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
 * @file encodingServiceToolSection.test.tsx
 * @description 验证 JSON 和 UTF-8 Base64 编解码、错误恢复与空输入。
 * @author 鸡哥
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { nodes, render, text, value } from '../../../../test/componentHarness';
import { EncodingServiceToolSection } from '../EncodingServiceToolSection';
import { fire } from './toolTestEvents';

describe('EncodingServiceToolSection', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('初始输出只读，JSON编码保留引号转义与空字符串', () => {
    let tree = render(EncodingServiceToolSection);
    expect(nodes(tree, 'textarea')).toHaveLength(4);
    expect(value(tree, 'textarea', 'readOnly', 1)).toBe(true);
    fire(tree, 'button', 'onClick');
    expect(value(render(EncodingServiceToolSection), 'textarea', 'value', 1)).toBe('""');
    fire(tree, 'textarea', 'onChange', 0, { target: { value: '中"文' } });
    tree = render(EncodingServiceToolSection);
    fire(tree, 'button', 'onClick');
    expect(value(render(EncodingServiceToolSection), 'textarea', 'value', 1)).toBe(JSON.stringify('中"文'));
  });

  it.each([
    { input: '"hello"', output: 'hello' },
    { input: '{"x":1}', output: '{\n  "x": 1\n}' },
    { input: 'null', output: 'null' },
    { input: '[1,2]', output: '[\n  1,\n  2\n]' },
  ])('JSON解码 $input', ({ input, output }) => {
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 0, { target: { value: input } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 1);
    expect(value(render(EncodingServiceToolSection), 'textarea', 'value', 1)).toBe(output);
  });

  it('JSON解码错误在下次有效操作时清除', () => {
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 0, { target: { value: '{' } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 1);
    expect(text(render(EncodingServiceToolSection))).toContain('json.decodeError');
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 0);
    expect(nodes(render(EncodingServiceToolSection), '.download-status-text')).toHaveLength(0);
  });

  it('UTF-8中文与emoji可以往返Base64，解码会修剪外围空白', () => {
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 2, { target: { value: '中文🌴' } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 2);
    const encoded = value(render(EncodingServiceToolSection), 'textarea', 'value', 3) as string;
    expect(encoded).toBe('5Lit5paH8J+MtA==');
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 2, { target: { value: '  5Lit5paH8J+MtA==  ' } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 3);
    expect(value(render(EncodingServiceToolSection), 'textarea', 'value', 3)).toBe('中文🌴');
  });

  it('非法Base64显示错误，空输入恢复为空输出', () => {
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 2, { target: { value: '!!' } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 3);
    expect(text(render(EncodingServiceToolSection))).toContain('base64.decodeError');
    fire(render(EncodingServiceToolSection), 'textarea', 'onChange', 2, { target: { value: '' } });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 3);
    expect(value(render(EncodingServiceToolSection), 'textarea', 'value', 3)).toBe('');
    expect(nodes(render(EncodingServiceToolSection), '.download-status-text')).toHaveLength(0);
  });

  it('底层编码异常显示对应错误', () => {
    vi.stubGlobal('btoa', () => { throw new Error('encoding unavailable'); });
    fire(render(EncodingServiceToolSection), 'button', 'onClick', 2);
    expect(text(render(EncodingServiceToolSection))).toContain('base64.encodeError');
  });
});
