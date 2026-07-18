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
 * @file memoUtils.ts
 * @description 备忘录模块纯工具函数
 * @author 鸡哥
 */

import { createElement } from 'react';
import type { MemoItem } from '../types/memoTypes';
import { STORE_KEY, MARKDOWN_HIGHLIGHT_PATTERNS } from '../config/memoConfig';

/**
 * 规范化单个标签：去首尾空格、去除前导 #、截断到 24 字符
 * @param value - 原始标签文本
 * @returns 规范化后的标签
 */
export function normalizeTag(value: string): string {
  return value.trim().replace(/^#+/, '').slice(0, 24);
}

/**
 * 规范化标签列表：去重、过滤空值
 * @param tags - 原始标签数组
 * @returns 去重后的有效标签数组
 */
export function normalizeTagList(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(new Set(
    tags
      .filter((tag): tag is string => typeof tag === 'string')
      .map(normalizeTag)
      .filter(Boolean),
  ));
}

/**
 * 规范化旧数据，补全缺失字段
 * @param items - 原始备忘录数组
 * @returns 补全字段后的备忘录数组
 */
export function normalizeMemos(items: MemoItem[]): MemoItem[] {
  return items.map((m) => ({
    ...m,
    title: m.title ?? '',
    content: m.content ?? '',
    tags: normalizeTagList((m as Partial<MemoItem>).tags),
    createdAt: m.createdAt ?? Date.now(),
    updatedAt: m.updatedAt ?? m.createdAt ?? Date.now(),
    pinned: m.pinned ?? false,
    bookmarked: m.bookmarked ?? false,
  }));
}

/**
 * 通过 IPC 写入文件持久化备忘录
 * @param items - 要持久化的备忘录数组
 */
export function persistMemos(items: MemoItem[]): void {
  window.api.storeWrite(STORE_KEY, items).catch(() => {});
}

/**
 * 格式化时间戳为可读字符串
 * @param ts - Unix 时间戳（毫秒）
 * @returns 格式化的时间字符串 YYYY-MM-DD HH:mm
 */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

/**
 * 从内容中提取摘要（首行非空文本，截断到 60 字符）
 * @param content - Markdown 内容
 * @returns 摘要文本
 */
export function extractSummary(content: string): string {
  const plainContent = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[#>*_~\-[\]()]/g, ' ');
  const line = plainContent.split('\n').find((l) => l.trim().length > 0)?.trim() ?? '';
  return line.length > 60 ? line.slice(0, 60) + '…' : line;
}

/**
 * 提取备忘录中的所有标签（包括内联 # 标签）
 * @param memo - 包含 title、content、tags 的备忘录
 * @returns 去重后的标签数组
 */
export function extractMemoTags(memo: Pick<MemoItem, 'title' | 'content' | 'tags'>): string[] {
  const text = `${memo.title}\n${memo.content}`;
  const inlineTags = Array.from(text.matchAll(/(^|\s)#([\p{L}\p{N}_-]{1,24})/gu))
    .map((match) => match[2]?.trim())
    .filter((tag): tag is string => Boolean(tag));
  return Array.from(new Set([...normalizeTagList(memo.tags), ...inlineTags.map(normalizeTag)].filter(Boolean)));
}

/**
 * 获取备忘录的全文搜索文本
 * @param memo - 备忘录对象
 * @returns 用于搜索的合并文本（小写）
 */
export function getMemoSearchText(memo: MemoItem): string {
  return [memo.title, memo.content, ...extractMemoTags(memo)].join('\n').toLowerCase();
}

/**
 * 渲染与 textarea 同排版的 Markdown 高亮镜像
 * @param content - 编辑器中的原始文本
 * @returns React 节点数组
 */
export function renderMarkdownEditorMirror(content: string): React.ReactNode[] {
  const source = content.length > 0 ? content : ' ';
  const ranges = MARKDOWN_HIGHLIGHT_PATTERNS.flatMap(({ className, pattern }) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return Array.from(source.matchAll(regex)).map((match) => {
      const value = match[2] ?? match[1] ?? match[0];
      const index = match.index ?? 0;
      const start = source.indexOf(value, index);
      return { className, start, end: start + value.length };
    });
  })
    .filter((range) => range.start >= 0 && range.end > range.start)
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<Array<{ className: string; start: number; end: number }>>((acc, range) => {
      const last = acc[acc.length - 1];
      if (!last || range.start >= last.end) acc.push(range);
      return acc;
    }, []);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) nodes.push(source.slice(cursor, range.start));
    nodes.push(
      createElement('span', { key: `${range.start}-${range.end}-${index}`, className: `memo-tab-markdown-token ${range.className}` }, source.slice(range.start, range.end)),
    );
    cursor = range.end;
  });
  if (cursor < source.length) nodes.push(source.slice(cursor));
  if (source.endsWith('\n')) nodes.push(' ');
  return nodes;
}

/**
 * 获取 Markdown 预览内容（空内容时显示占位符）
 * @param content - 原始内容
 * @param placeholder - 占位符文本
 * @returns 预览用的文本
 */
export function getMarkdownPreviewContent(content: string, placeholder: string): string {
  return content.trim().length > 0 ? content : placeholder;
}
