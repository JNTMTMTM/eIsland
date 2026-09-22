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
 * @file bluetooth.resources.smoke.ts
 * @description 反复启动/停止实际原生监控，检查停止状态并记录资源是否持续增长
 * @author 鸡哥
 */

const assert = require('node:assert/strict');
const koffi = require('koffi');
const { bt, callJson } = require('../ffi-loader');
const kernel32 = koffi.load('kernel32.dll');
const currentProcess = kernel32.func('void *GetCurrentProcess()');
const getHandleCount = kernel32.func('bool GetProcessHandleCount(void *, _Out_ uint32_t *)');

/**
 * 读取当前测试进程的系统句柄数。
 * @returns 当前持有的句柄数
 */
function handleCount(): number {
  const count = [0];
  assert.ok(getHandleCount(currentProcess(), count));
  return count[0];
}

/**
 * 反复重启监控并确认旧缓存没有在停止后重新写入。
 * @param count - 重启次数
 * @returns 全部重启完成时兑现
 */
async function restart(count: number): Promise<void> {
  for (let index = 0; index < count; index++) {
    assert.equal(bt.bt_start_monitoring(), 0, `Start failed at cycle ${index}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(bt.bt_stop_monitoring(), 0);
    assert.equal(bt.bt_get_changes_count(), -1);
    assert.deepEqual(callJson('bt_get_monitored_devices'), []);
    assert.equal(bt.bt_wait_for_changes(0), -1);
  }
}

/**
 * 产生常规托管分配，让原生运行时有机会回收已结束线程的包装对象。
 * @description V8 GC 不会触发 Native AOT 的托管 GC，因此不能只用 global.gc() 量句柄。
 * @returns 分配与后台清理完成时兑现
 */
async function settle(): Promise<void> {
  // 停止状态的全量查询复用空字符串；使用入参转换产生正常托管分配。
  for (let index = 0; index < 300000; index++) bt.bt_get_monitored_device(`resource-smoke-${index}`);
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * 在预热后记录两轮重启的资源变化，便于实际蓝牙设备环境中比对。
 * @returns 测试完成时兑现
 */
async function main(): Promise<void> {
  await restart(10);
  await settle();
  const handles = [handleCount()];
  for (let batch = 0; batch < 2; batch++) {
    await restart(100);
    await settle();
    handles.push(handleCount());
  }
  console.log(JSON.stringify({ restartCycles: 200, handles, finalDelta: handles[2] - handles[0] }));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => bt.bt_stop_monitoring());
