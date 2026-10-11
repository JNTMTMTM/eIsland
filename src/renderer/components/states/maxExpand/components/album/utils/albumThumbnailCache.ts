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
 * @file albumThumbnailCache.ts
 * @description 缩略图 LRU 预算，只记录字节计数，不额外保留媒体载荷。
 * @author 鸡哥
 */
/** 缩略图最多保留 128 张，并限制 UTF-16 字符串占用至 8 MiB。 */
export class AlbumThumbnailCache {
  private entries = new Map<number, number>();
  private bytes = 0;
  /** 更新访问顺序。
   * @param ids - 可视区项目标识。
   * @returns 无返回值。
   */
  touch(ids: Iterable<number>): void {
    for (const id of ids) {
      const size = this.entries.get(id);
      if (size === undefined) continue;
      this.entries.delete(id);
      this.entries.set(id, size);
    }
  }
  /** 登记缩略图并返回应释放的项目，优先回收离屏项。
   * @param id - 项目标识。
   * @param url - 缩略图字符串。
   * @param visible - 优先保留的可视区项目。
   * @returns 超预算时需要释放的缩略图标识。
   */
  put(id: number, url: string, visible: ReadonlySet<number>): number[] {
    this.remove(id);
    this.entries.set(id, url.length * 2);
    this.bytes += url.length * 2;
    const candidates = [...this.entries.keys()];
    const order = [...candidates.filter((key) => !visible.has(key)), ...candidates.filter((key) => visible.has(key))];
    const evicted: number[] = [];
    for (const key of order) {
      if (this.entries.size <= 128 && this.bytes <= 8 * 1024 * 1024) break;
      this.remove(key);
      evicted.push(key);
    }
    return evicted;
  }
  /** 移除已删除或已回收的缩略图。
   * @param id - 项目标识。
   * @returns 无返回值。
   */
  remove(id: number): void {
    this.bytes -= this.entries.get(id) ?? 0;
    this.entries.delete(id);
  }
}
