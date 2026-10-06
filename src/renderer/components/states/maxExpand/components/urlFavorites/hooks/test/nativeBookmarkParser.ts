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
 * @file nativeBookmarkParser.ts
 * @description 收藏集成测试的原生 DOMParser 叶夹具，提供固定锚点而保留真实收藏解析业务
 * @author 鸡哥
 */

/** 固定书签 HTML 对应的原生 DOM 读取叶边界。 */
export default class NativeBookmarkParser {
  /** 返回浏览器解析固定书签后提供的锚点。
   * @returns 供真实业务查询锚点和属性的原生文档边界
   */
  parseFromString(): { querySelectorAll: () => { getAttribute: (key: string) => string | null; textContent: string; closest: () => null }[] } {
    return { querySelectorAll: () => [{ getAttribute: (key: string) => key === 'href' ? 'https://new.example' : null, textContent: 'New', closest: () => null }] };
  }
}
