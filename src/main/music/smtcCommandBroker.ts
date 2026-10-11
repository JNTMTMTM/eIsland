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
 * @file smtcCommandBroker.ts
 * @description SMTC 命令进程的有界队列、硬截止时间和空闲回收。
 * @author 鸡哥
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { failedSmtcCommand, type SmtcCommandRequest, type SmtcCommandResponse } from './smtcCommandProtocol';

interface PendingCommand { request: SmtcCommandRequest; reply: (response: SmtcCommandResponse) => void }

/**
 * 创建按需命令进程；原生挂起时真正终止进程，下次请求重新创建。
 * @param entryPath - 打包后的命令进程入口
 * @returns 提交、取消及退出清理接口
 */
export function createSmtcCommandBroker(entryPath: string) {
  let child: ChildProcess | null = null;
  let active: PendingCommand | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const queue: PendingCommand[] = [];

  const retire = (): void => {
    const old = child;
    child = null;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    if (old) { old.removeAllListeners(); old.on('error', () => {}); old.kill(); }
  };
  const fail = (pending: PendingCommand, reason: string): void => {
    pending.reply({ type: 'command-result', requestId: pending.request.requestId, result: failedSmtcCommand(pending.request.command, reason) });
  };
  const drain = (): void => {
    if (disposed || active) return;
    const pending = queue.shift();
    if (!pending) {
      if (child && !idleTimer) idleTimer = setTimeout(retire, 5000);
      return;
    }
    if (pending.request.deadline <= Date.now()) { fail(pending, 'Command expired'); drain(); return; }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
    active = pending;
    const finish = (response?: SmtcCommandResponse): void => {
      if (active !== pending) return;
      if (timer) clearTimeout(timer);
      timer = null;
      active = null;
      if (response) pending.reply(response); else fail(pending, 'Command process unavailable');
      drain();
    };
    try {
      if (!child) {
        const spawned = spawn(process.execPath, [entryPath], {
          windowsHide: true,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        });
        child = spawned;
        spawned.on('message', (response: SmtcCommandResponse) => {
          if (child !== spawned || response.type !== 'command-result' || active?.request.requestId !== response.requestId) return;
          const current = active;
          if (timer) clearTimeout(timer);
          timer = null;
          active = null;
          // 失败可能来自超时的 STA；不把后续请求交给已经失效的原生调度线程。
          if (('success' in response.result && !response.result.success)
            || ('isAvailable' in response.result && !response.result.isAvailable)) retire();
          current.reply(response);
          drain();
        });
        const onExit = (): void => {
          if (child !== spawned) return;
          retire();
          if (active) {
            const current = active;
            active = null;
            if (timer) clearTimeout(timer);
            timer = null;
            fail(current, 'Command process exited');
          }
          drain();
        };
        spawned.on('error', onExit);
        spawned.on('exit', onExit);
      }
      timer = setTimeout(() => { retire(); finish(); }, Math.max(1, pending.request.deadline - Date.now()));
      child.send(pending.request, (error) => { if (error && active === pending) { retire(); finish(); } });
    } catch { retire(); finish(); }
  };
  return {
    /** 提交命令，连续排队的 seek 只保留最新位置。 */
    execute(request: SmtcCommandRequest, reply: PendingCommand['reply']): void {
      const pending = { request, reply };
      if (disposed) { fail(pending, 'Broker disposed'); return; }
      const previous = queue.at(-1);
      if (request.command === 'seek' && previous?.request.command === 'seek') {
        queue.pop(); fail(previous, 'Seek superseded');
      }
      if (queue.length >= 32) { fail(pending, 'Command queue full'); return; }
      queue.push(pending);
      drain();
    },
    /** 取消过期请求；正在执行的调用通过杀进程停止。 */
    cancel(requestId: number): void {
      const index = queue.findIndex((item) => item.request.requestId === requestId);
      if (index >= 0) { const [pending] = queue.splice(index, 1); fail(pending, 'Command cancelled'); }
      if (active?.request.requestId === requestId) {
        const pending = active; active = null;
        if (timer) clearTimeout(timer);
        timer = null; retire(); fail(pending, 'Command cancelled'); drain();
      }
    },
    /** 退出时终止辅助进程并结算所有请求。 */
    dispose(): void {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null; retire();
      if (active) { fail(active, 'Broker disposed'); active = null; }
      queue.splice(0).forEach((pending) => fail(pending, 'Broker disposed'));
    },
  };
}
