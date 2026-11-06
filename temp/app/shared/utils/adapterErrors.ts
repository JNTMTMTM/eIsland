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
 * @file adapterErrors.ts
 * @description 将内部错误映射为四语言错误码，避免向 renderer 泄漏日志与凭据。
 * @author 鸡哥
 */
export class AdapterError extends Error {
  /** 创建可公开的业务错误。
   * @param code - renderer 翻译键。
   */
  constructor(readonly code: string) { super(code); }
}
/** 失败时抛出确定的业务错误。
 * @param code - 公开错误码。
 * @returns 不返回。
 */
export function fail(code: string): never { throw new AdapterError(code); }
