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
 * @file agentToolCallGuard.ts
 * @description 单次用户请求的工具结果复用和无进展循环检测，供本地编排器共用。
 * @author 鸡哥
 */

/**
 * 稳定序列化工具参数，忽略对象属性插入顺序，保留数组顺序。
 * @param value - JSON 参数。
 * @returns 按属性名称排序的 JSON 值。
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalValue(item)]));
  }
  return value;
}

/**
 * 生成工具调用的稳定标识。
 * @param tool - 工具名称。
 * @param args - JSON 参数。
 * @returns 可比较的标识。
 */
export function toolCallSignature(tool: string, args: unknown): string {
  return `${tool.trim().toLowerCase()}:${JSON.stringify(canonicalValue(args))}`;
}

/**
 * 同一轮有副作用的操作不能因重复模型输出再次执行。
 * @param tool - 规范化工具名称。
 * @returns 是否为本轮仅执行一次的操作。
 */
function isOneShot(tool: string): boolean {
  return tool.startsWith('cmd.') || /\.(create|delete|trash|toggle|rename|restart|shutdown|sleep|send|close|append|add|move|copy|install|uninstall|start|stop|write)$/.test(tool);
}

/**
 * 在一次用户请求内复用结果；写入后允许重新读取，连续两次复用表示模型没有进展。
 * @template T - 工具执行结果类型。
 */
export class AgentToolCallGuard<T extends { success: boolean }> {
  private readonly entries = new Map<string, { result: Promise<T>; revision: number; pending: boolean; failed: boolean }>();

  private revision = 0;

  private repeats = 0;

  stopped = false;

  /**
   * 执行或复用工具；失败也保留结果，避免盲目重做可能已部分完成的操作。
   * @param tool - 工具名。
   * @param args - 工具参数。
   * @param execute - 首次调用时执行的操作。
   * @returns 工具结果。
   */
  async run(tool: string, args: unknown, execute: () => Promise<T>): Promise<T> {
    const name = tool.trim().toLowerCase();
    const signature = toolCallSignature(name, args);
    const previous = this.entries.get(signature);
    if (previous && (previous.pending || previous.failed || previous.revision === this.revision || isOneShot(name))) {
      this.repeats += 1;
      this.stopped ||= this.repeats >= 2;
      return previous.result;
    }
    this.repeats = 0;
    // 下一微任务才执行，先登记 Promise 才能合并同步发起的并发请求。
    // eslint-disable-next-line promise/prefer-await-to-then -- 先登记待执行的 Promise，合并并发请求
    const entry = { result: Promise.resolve().then(execute), revision: this.revision, pending: true, failed: false };
    this.entries.set(signature, entry);
    const result = await entry.result;
    entry.pending = false;
    entry.failed = !result.success;
    const readOnly = /(^|\.)(get|read|list|stat|exists|search|query|status|lookup|tree|grep|hash|now|cpu|memory|disk|gpu|ping|dns|ports)(\.|$)/.test(name);
    if (result.success && !readOnly) this.revision += 1;
    entry.revision = this.revision;
    return result;
  }
}
