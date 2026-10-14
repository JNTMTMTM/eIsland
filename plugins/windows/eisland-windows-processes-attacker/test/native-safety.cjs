/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */
/**
 * @file native-safety.cjs
 * @description 执行原生身份校验回归，并只用测试子进程验证参数校验与批量关闭。
 * @author 鸡哥
 */
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const api = require(path.join(__dirname, '..', 'index.js'));
const fixture = spawnSync(path.join(__dirname, 'build/Release/native_safety.exe'), [], { encoding: 'utf8', windowsHide: true });
assert.equal(fixture.status, 0, fixture.error?.message ?? fixture.stderr);
process.stdout.write(fixture.stdout);

/**
 * 启动本测试拥有的进程，等待其就绪并记录退出事件。
 * @returns 子进程及退出 Promise。
 */
async function startChild() {
  const child = spawn(process.execPath, ['-e', "setInterval(()=>{},1000);console.log('READY')"], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test child startup timeout')), 5000);
      child.once('error', reject);
      child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
    });
    return { child, exited };
  } catch (error) { child.kill(); throw error; }
}

/**
 * 等待已终止的测试进程退出，避免挂起 CI。
 * @param exited - 子进程退出 Promise。
 * @returns 子进程退出后兑现的 Promise。
 */
async function waitForExit(exited) {
  let timer;
  try {
    await Promise.race([exited, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Test child did not exit')), 5000); })]);
  } finally { clearTimeout(timer); }
}

/** 执行参数拒绝、无批量副作用以及有效单个/批量关闭的真实 N-API 测试。 */
async function run() {
  const owned = [];
  try {
    const first = await startChild(); owned.push(first);
    const invalidNumbers = [0, -1, first.child.pid + 0.5, 2 ** 32 + first.child.pid, NaN, Infinity, -Infinity];
    const uniqueName = `eisland-safety-${randomUUID()}.exe`;
    const invalidNames = ['', uniqueName.padEnd(260, 'x'), `${uniqueName}\0suffix`];
    invalidNumbers.forEach((target) => assert.throws(() => api.closeProcess(target), /Process id must/));
    invalidNames.forEach((target) => assert.throws(() => api.closeProcess(target), /Process name must/));
    [...invalidNumbers, ...invalidNames, true, undefined].forEach((target) => assert.throws(() => api.closeProcesses([first.child.pid, target])));
    const getterFailure = new Error('Fixture getter failure');
    const withGetter = [first.child.pid];
    Object.defineProperty(withGetter, 1, { get: () => { throw getterFailure; } });
    assert.throws(() => api.closeProcesses(withGetter), (error) => error === getterFailure);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(first.child.exitCode, null, 'Invalid batches must preserve the earlier valid process');
    assert.equal(process.kill(first.child.pid, 0), true);
    assert.deepEqual(api.closeProcesses([]), []);
    const single = api.closeProcess(first.child.pid);
    assert.equal(single.terminatedCount, 1); assert.equal(single.failedCount, 0);
    await waitForExit(first.exited);
    const second = await startChild(); owned.push(second);
    const third = await startChild(); owned.push(third);
    const batch = api.closeProcesses([second.child.pid, third.child.pid]);
    assert.deepEqual(batch.map((result) => result.target), [second.child.pid, third.child.pid]);
    batch.forEach((result) => { assert.equal(result.terminatedCount, 1); assert.equal(result.failedCount, 0); });
    await Promise.all([waitForExit(second.exited), waitForExit(third.exited)]);
    console.log('PASS real native numeric/name validation, batch atomic validation, single/batch owned-child termination');
  } finally { owned.forEach(({ child }) => { if (child.exitCode === null && child.signalCode === null) child.kill(); }); }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
