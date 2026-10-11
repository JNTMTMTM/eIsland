/* eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM, pyisland.com. GPL-3.0-or-later.
 */
/** @file cliEventDetails.ts
 * @description 将 CLI 正文移出常驻快照，并以固定大小分页读取。
 * @author 鸡哥
 */
import { createHash } from 'crypto';
import { mkdir, open, rename, writeFile, appendFile, unlink } from 'fs/promises';
import { dirname, join } from 'path';
import type { ClaudeCodeHookEvent } from '../types/system/ClaudeCodeHookEvent';

const PAGE_BYTES = 64 * 1024;
const QUEUE_BYTES = 32 * 1024 * 1024;
let queuedBytes = 0;
let queuedWrites = 0;
const pending = new Map<string, Promise<void>>();

/** 限制摘要字段；全文保留在原日志或详情文件，不在快照中重复编码。 */
export function summarizeCliEvent(event: ClaudeCodeHookEvent): ClaudeCodeHookEvent {
  const clip = (value: string | null, limit = 256): string | null => value && value.length > limit ? `${value.slice(0, limit)}…` : value;
  return {
    ...event, summary: clip(event.summary) ?? '', detail: null, raw: {},
    toolInputPreview: clip(event.toolInputPreview), toolName: clip(event.toolName, 128),
    detailItems: (event.detailItems ?? []).filter((item) => item.label !== 'rawEvent').slice(0, 12)
      .map((item) => ({ label: item.label.slice(0, 64), value: clip(item.value, 160) ?? '' })),
  };
}

/** 由事件 ID 生成固定目录内的文件名，不接受调用方提供文件路径。 */
export function cliDetailPath(directory: string, id: string): string {
  return join(directory, `${createHash('sha256').update(id).digest('hex')}.txt`);
}

/** 异步串行保存正文；队列也以字节限制，防止磁盘慢时积累整个事件流。 */
export function saveCliEventDetails(directory: string, event: ClaudeCodeHookEvent, append = false): void {
  const path = cliDetailPath(directory, event.id);
  const text = JSON.stringify({ details: (event.detailItems ?? []).filter((item) => item.label !== 'rawEvent'), raw: event.raw }, null, 2);
  const bytes = Buffer.byteLength(text);
  if (queuedBytes + bytes > QUEUE_BYTES || queuedWrites >= 128) throw new Error('CLI detail queue is full');
  queuedBytes += bytes; queuedWrites += 1;
  const previous = pending.get(path) ?? Promise.resolve();
  const request = previous.catch(() => {}).then(async () => {
    await mkdir(directory, { recursive: true });
    if (append) await appendFile(path, `\n${text}`, 'utf8');
    else {
      await writeFile(`${path}.tmp`, text, 'utf8');
      await rename(`${path}.tmp`, path);
    }
  }).finally(() => {
    queuedBytes -= bytes; queuedWrites -= 1;
    if (pending.get(path) === request) pending.delete(path);
  });
  pending.set(path, request);
  // 读者仍会收到写入失败；后台保存失败不产生未处理拒绝。
  void request.catch(() => {});
}

/** 分页只分配 64 KiB，UTF-8 多字节字符不会被拆开；offset 是上一页返回的 nextOffset。 */
export async function readCliDetailPage(path: string, offset = 0, source?: { offset: number; bytes: number }) {
  await pending.get(path);
  const file = await open(path, 'r');
  try {
    const size = source?.bytes ?? (await file.stat()).size;
    const start = Math.max(0, Math.min(size, Number.isFinite(offset) ? Math.floor(offset) : 0));
    const buffer = Buffer.alloc(Math.min(PAGE_BYTES + 4, Math.max(0, size - start)));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, (source?.offset ?? 0) + start);
    let length = Math.min(PAGE_BYTES, bytesRead);
    if (start + length < size) {
      while (length > 0 && length < bytesRead && (buffer[length] & 0xc0) === 0x80) length -= 1;
    }
    const next = start + length;
    return { text: buffer.toString('utf8', 0, length), nextOffset: next < size && length ? next : null, offset: start, totalBytes: size };
  } finally { await file.close(); }
}

/** 对小型摘要快照合并异步原子写入；任何时刻只保留最新待写版本。 */
export function createCliSnapshotWriter(path: string) {
  let latest: string | null = null;
  let writing: Promise<boolean> | null = null;
  return (value: unknown): Promise<boolean> => {
    latest = JSON.stringify(value);
    if (!writing) {
      // 在同一个 continuation 内耗尽 latest 并清空 writing，不能把清理推迟到 .finally 微任务。
      writing = Promise.resolve().then(async () => {
        let success = true;
        try {
          await mkdir(dirname(path), { recursive: true });
          while (latest !== null) {
            const text = latest; latest = null;
            try {
              await writeFile(`${path}.tmp`, text, 'utf8');
              await rename(`${path}.tmp`, path);
            } catch { success = false; }
          }
        } catch { latest = null; success = false; }
        finally { writing = null; }
        return success;
      });
    }
    return writing;
  };
}

/** 索引原子写入成功后回收不再引用的详情；只删除由事件 ID 派生的单个文件。 */
export async function removeCliEventDetails(directory: string, ids: string[]): Promise<void> {
  for (const id of ids) {
    const path = cliDetailPath(directory, id);
    await pending.get(path)?.catch(() => {});
    await unlink(path).catch(() => {});
  }
}
