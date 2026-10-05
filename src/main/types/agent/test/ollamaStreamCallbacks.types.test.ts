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
 * @file ollamaStreamCallbacks.types.test.ts
 * @description OllamaStreamCallbacks.ts 的完整公开形状、合法样例、必需可选字段及非法状态契约测试。
 * @author 鸡哥
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import type { OllamaStreamCallbacks } from "../OllamaStreamCallbacks";
import type { OllamaStreamChunk } from '.././OllamaStreamChunk';

/** 固定 OllamaStreamCallbacks 的完整公开形状，独立于源类型展开。 */
interface ExpectedOllamaStreamCallbacks {
  onChunk?: (text: string) => void;
  onDone?: (fullText: string, usage?: OllamaStreamChunk['usage']) => void;
  onError?: (error: Error) => void;
}

describe("OllamaStreamCallbacks.ts 完整类型契约", () => {
  it("OllamaStreamCallbacks 完整字段、合法样例与非法状态", () => {
    expectTypeOf<OllamaStreamCallbacks>().toEqualTypeOf<ExpectedOllamaStreamCallbacks>();
    const legal: OllamaStreamCallbacks = { onChunk: () => {}, onDone: () => {}, onError: () => {} };
    expectTypeOf(legal).toMatchTypeOf<ExpectedOllamaStreamCallbacks>();
    expect(legal).toBeDefined();
    const minimal: OllamaStreamCallbacks = {  };
    expectTypeOf(minimal).toMatchTypeOf<ExpectedOllamaStreamCallbacks>();
    expect(minimal).toBeDefined();
    // @ts-expect-error OllamaStreamCallbacks.onChunk 拒绝契约外字段类型或状态。
    const invalid: OllamaStreamCallbacks["onChunk"] = 'invalid';
    expect(invalid).toBeDefined();
    expectTypeOf<null>().not.toMatchTypeOf<OllamaStreamCallbacks>();
  });
});
