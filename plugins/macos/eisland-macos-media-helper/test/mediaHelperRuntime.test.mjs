/*
 * eIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 JNTMTMTM / pyisland.com
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
/**
 * @file mediaHelperRuntime.test.mjs
 * @description 通过真实 Swift 与 Node-API 验证无副作用的 IPC、时间线和资源生命周期。
 * @author 鸡哥
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { test } from 'vitest';

const require = createRequire(import.meta.url);
const directoryPath = fileURLToPath(new URL('.', import.meta.url));
const nativeTest = test.skipIf(process.platform !== 'darwin');
// eslint-disable-next-line import-x/no-commonjs, import-x/extensions -- 使用 Node 原生加载器验证 CommonJS 插件及 .node，避免 Vite 转换改变加载行为。
const { MediaClient, MediaMonitor, SmtcMonitor } = require('../index');

/**
 * 构造测试媒体快照。
 * @param overrides - 覆盖默认测试媒体的字段。
 * @returns 带可推算时间戳的测试曲目。
 */
function track(overrides = {}) {
  return {
    bundleIdentifier: 'com.eisland.fixture', title: 'Track', artist: 'Artist', album: 'Album',
    playing: true, playbackRate: 1, durationMicros: 100_000_000, elapsedTimeMicros: 5_000_000,
    timestampEpochMicros: Date.now() * 1000, uniqueIdentifier: 'one',
    artworkMimeType: 'image/png', artworkData: 'aW1hZ2U=', ...overrides,
  };
}

/**
 * 创建隔离的原生 IPC 测试环境。
 * @param t - 测试上下文。
 * @param state - 初始桥接状态。
 * @param timeoutMs - 测试请求超时毫秒数。
 * @returns 隔离的真实原生客户端与可变 Perl 桥接状态。
 */
function fixture(t, state = { payload: track() }, timeoutMs = 4000) {
  const directory = mkdtempSync(join(tmpdir(), 'eisland media test '));
  const framework = join(directory, 'MediaRemoteAdapter.framework');
  mkdirSync(framework);
  copyFileSync(join(directoryPath, 'fixtures', 'mediaremote-adapter.pl'), join(directory, 'mediaremote-adapter.pl'));
  const statePath = join(framework, 'state.json');
  const update = (next) => {
    writeFileSync(`${statePath}.tmp`, JSON.stringify(next));
    renameSync(`${statePath}.tmp`, statePath);
  };
  update(state);
  const client = new MediaClient({ timeoutMs, resourceDirectory: directory });
  t.onTestFinished(async () => { client.close(); await delay(350); rmSync(directory, { recursive: true, force: true }); });
  const commands = () => existsSync(join(framework, 'commands.log'))
    ? readFileSync(join(framework, 'commands.log'), 'utf8').trim().split('\n')
      .filter(Boolean)
      .map(JSON.parse)
    : [];
  return { client, directory, update, commands };
}

/**
 * 等待原生状态满足测试条件。
 * @param predicate - 成功条件。
 * @param timeoutMs - 最大等待时间，单位为毫秒。
 * @returns 在有界时间内完成等待。
 */
async function until(predicate, timeoutMs = 2500) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for native fixture.');
    // eslint-disable-next-line no-await-in-loop -- 原生状态只能顺序采样，不能并行等待尚未满足的条件。
    await delay(20);
  }
}

/**
 * 检查桥接子进程是否仍存在。
 * @param pid - 子进程 PID。
 * @returns 进程是否仍存在。
 */
function alive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

nativeTest('query maps metadata, Bundle ID, artwork and lightweight timestamps', async (t) => {
  const { client } = fixture(t, { payload: track({ parentApplicationBundleIdentifier: 'com.eisland.host', repeatMode: 3, shuffleMode: 3 }) });
  assert.equal(client.getStatus().isAvailable, false);
  const status = await client.refresh();
  assert.equal(status.sourceAppUserModelId, 'com.eisland.host');
  assert.equal(status.title, 'Track');
  assert.equal(status.albumTitle, 'Album');
  assert.equal(status.thumbnail, 'data:image/png;base64,aW1hZ2U=');
  assert.equal(status.repeatMode, 2);
  assert.equal(status.isShuffleActive, true);
  assert.equal(status.controls, null);
  const timestamp = client.getTimestamp();
  assert.equal('thumbnail' in timestamp, false);
  assert.ok(timestamp.timeline.position >= 5 && timestamp.timeline.position < 7);
  assert.equal(client.getMediaSessions().length, 1);
});

nativeTest('timeline advances while playing, freezes while paused, and clamps to duration', async (t) => {
  const { client, update } = fixture(t);
  await client.refresh();
  const before = client.getTimestamp().timeline.position;
  await delay(160);
  assert.ok(client.getTimestamp().timeline.position - before >= 0.1);
  update({ payload: track({ playing: false, elapsedTimeMicros: 9_000_000 }) });
  await client.refresh();
  const paused = client.getTimestamp().timeline.position;
  await delay(100);
  assert.equal(client.getTimestamp().timeline.position, paused);
  update({ payload: track({ elapsedTimeMicros: 101_000_000 }) });
  await client.refresh();
  assert.equal(client.getTimestamp().timeline.position, 100);
});

nativeTest('commands map units and modes; transport rejection is returned', async (t) => {
  const { client, commands, update } = fixture(t);
  const operations = [
    ['play', [], 'send', '0'], ['pause', [], 'send', '1'], ['next', [], 'send', '4'],
    ['previous', [], 'send', '5'], ['stop', [], 'send', '3'], ['seek', [42.25], 'seek', '42250000'],
    ['setShuffle', [true], 'shuffle', '3'], ['setShuffle', [false], 'shuffle', '1'],
    ['setRepeatMode', [0], 'repeat', '1'], ['setRepeatMode', [1], 'repeat', '2'],
    ['setRepeatMode', [2], 'repeat', '3'], ['setPlaybackRate', [2], 'speed', '2'],
  ];
  await operations.reduce(async (pending, [method, args, operation, value]) => {
    await pending;
    assert.deepEqual(await client[method](...args), { success: true, error: null });
    assert.deepEqual(commands().at(-1).arguments, [value]);
    assert.equal(commands().at(-1).command, operation);
  }, Promise.resolve());
  update({ payload: track(), commandError: true });
  assert.deepEqual(await client.pause(), { success: false, error: 'fixture command rejected' });
  update({ payload: null });
  const count = commands().length;
  assert.equal((await client.play()).success, false);
  assert.equal(commands().length, count + 1);
  assert.equal(client.getMediaSessions().length, 0);
});

nativeTest('invalid command arguments reject without invoking a bridge', async (t) => {
  const { client } = fixture(t);
  await assert.rejects(client.seek(-1), RangeError);
  await assert.rejects(client.seek(Infinity), RangeError);
  await assert.rejects(client.setShuffle(1), TypeError);
  await assert.rejects(client.setRepeatMode(3), RangeError);
  await assert.rejects(client.setPlaybackRate(1.25), RangeError);
  assert.throws(() => new MediaClient({ timeoutMs: NaN }), RangeError);
});

nativeTest('async native requests keep the JS event loop responsive', async (t) => {
  const { client } = fixture(t, { payload: track(), delayGet: 0.3 });
  let finished = false;
  const pending = (async () => { await client.refresh(); finished = true; })();
  await delay(40);
  assert.equal(finished, false);
  await pending;
});

nativeTest('timeouts kill unresponsive helpers and bounded output rejects oversized responses', async (t) => {
  const { client, commands, update } = fixture(t, { payload: track(), delayGet: 10, ignoreTerm: true }, 100);
  await assert.rejects(client.refresh(), /timed out/);
  await until(() => commands().every((entry) => !alive(entry.pid)));
  update({ payload: track(), oversized: true });
  await assert.rejects(client.refresh(), /size limit/);
});

nativeTest('bridge failures and malformed JSON are not treated as valid empty media', async (t) => {
  const { client, update } = fixture(t, { payload: track(), queryError: true });
  await assert.rejects(client.refresh(), /fixture query failure/);
  update({ payload: track(), getRaw: '{bad' });
  await assert.rejects(client.refresh(), /response JSON/);
});

nativeTest('monitor emits changes, replaces current sources, and restarts without losing listeners', async (t) => {
  const { client, update } = fixture(t);
  const monitor = new MediaMonitor(client);
  const events = [];
  monitor.on('session-added', (id) => events.push(['added', id]));
  monitor.on('session-removed', (id) => events.push(['removed', id]));
  monitor.on('session-media-changed', (id, media) => events.push(['media', media.title]));
  monitor.on('session-playback-changed', (id, playback) => events.push(['playback', playback.playbackStatus]));
  monitor.on('error', (error) => assert.fail(error.message));
  t.onTestFinished(() => monitor.stop());
  assert.equal(SmtcMonitor, MediaMonitor);
  monitor.start(); monitor.start();
  await until(() => events.length > 0);
  update({ payload: track({ title: 'Second', playing: false }) });
  await until(() => events.some(([type]) => type === 'playback'));
  assert.ok(events.some(([type, value]) => type === 'media' && value === 'Second'));
  update({ payload: track({ bundleIdentifier: 'com.eisland.other' }) });
  await until(() => events.some(([type, id]) => type === 'added' && id === 'com.eisland.other'));
  assert.deepEqual(events.slice(-2), [['removed', 'com.eisland.fixture'], ['added', 'com.eisland.other']]);
  monitor.stop(); monitor.stop();
  assert.equal(client.getMediaSessions().length, 0);
  monitor.start();
  await until(() => events.filter(([type]) => type === 'added').length === 3);
});

nativeTest('multiple monitors share one listener and stopping inside an event leaves no timer', async (t) => {
  const { client, commands } = fixture(t);
  const first = new MediaMonitor(client);
  const second = new MediaMonitor(client);
  t.onTestFinished(() => { first.stop(); second.stop(); });
  first.on('error', (error) => assert.fail(error.message));
  second.on('error', (error) => assert.fail(error.message));
  first.on('session-added', () => first.stop());
  first.start(); second.start();
  await until(() => !first.running && second.cache.size > 0);
  assert.equal(first.timer, null);
  assert.equal(commands().filter((entry) => entry.command === 'stream').length, 1);
  assert.equal(client.getMonitorState().running, true);
});

nativeTest('unexpected bridge exit clears stale data and reports an error', async (t) => {
  const { client, update, commands } = fixture(t);
  const monitor = new MediaMonitor(client);
  let failure;
  monitor.on('error', (error) => { failure = error; });
  t.onTestFinished(() => monitor.stop());
  monitor.start();
  await until(() => client.getStatus().isAvailable);
  update({ payload: track(), exitStream: true });
  await until(() => failure !== undefined);
  assert.match(failure.message, /fixture stream failure/);
  assert.equal(client.getStatus().isAvailable, false);
  assert.equal(monitor.running, false);
  await until(() => commands().every((entry) => !alive(entry.pid)));
});

nativeTest('a late query cannot overwrite a newer streamed track', async (t) => {
  const { client, update, commands } = fixture(t, { payload: track(), delayGet: 0.3 });
  const monitor = new MediaMonitor(client);
  monitor.on('error', (error) => assert.fail(error.message));
  t.onTestFinished(() => monitor.stop());
  monitor.start();
  await until(() => client.getStatus().isAvailable);
  const pending = client.refresh();
  await until(() => commands().some((entry) => entry.command === 'get'));
  update({ payload: track({ title: 'Newer', uniqueIdentifier: 'two' }) });
  await until(() => client.getStatus().title === 'Newer');
  assert.equal((await pending).title, 'Newer');
});

nativeTest('malformed stream data clears the current source and recovers on a valid update', async (t) => {
  const { client, update } = fixture(t);
  const monitor = new MediaMonitor(client);
  let errors = 0;
  monitor.on('error', () => { errors += 1; });
  t.onTestFinished(() => monitor.stop());
  monitor.start();
  await until(() => client.getStatus().isAvailable);
  update({ payload: track(), invalidStream: true });
  await until(() => errors === 1);
  assert.equal(client.getStatus().isAvailable, false);
  update({ payload: track({ title: 'Recovered' }) });
  await until(() => client.getStatus().title === 'Recovered');
  assert.equal(monitor.running, true);
});

nativeTest('playing monitors publish interpolated timeline updates without metadata traffic', async (t) => {
  const { client } = fixture(t);
  const monitor = new MediaMonitor(client);
  let timeline;
  monitor.on('error', (error) => assert.fail(error.message));
  monitor.on('session-timeline-changed', (id, value) => { timeline = value; });
  t.onTestFinished(() => monitor.stop());
  monitor.start();
  await until(() => timeline !== undefined);
  assert.ok(timeline.position >= 5.5);
});

nativeTest('closing a client cancels active requests and does not leak helpers', async (t) => {
  const { client, commands } = fixture(t, { payload: track(), delayGet: 10 });
  const pending = assert.rejects(client.refresh(), /closed/);
  await until(() => commands().length > 0);
  client.close(); client.close();
  await pending;
  assert.equal((await client.pause()).success, false);
  await until(() => commands().every((entry) => !alive(entry.pid)));
});

nativeTest('Worker termination cleans up a native listener and pending request', async (t) => {
  const { directory, commands } = fixture(t, { payload: track(), delayGet: 10 });
  const worker = new Worker(join(directoryPath, 'fixtures', 'worker.cjs'), { workerData: directory });
  t.onTestFinished(() => worker.terminate());
  worker.on('error', (error) => assert.fail(error.message));
  await until(() => {
    try { return commands().length >= 2; } catch { return false; }
  });
  const started = Date.now();
  await worker.terminate();
  assert.ok(Date.now() - started < 2500, 'Worker should cancel requests without waiting for their timeout');
  await until(() => commands().every((entry) => !alive(entry.pid)));
});

nativeTest('native methods validate arguments and reject borrowed receivers', (t) => {
  const { client } = fixture(t);
  [-1, 4, '1', undefined].forEach((kind) => assert.throws(() => client.native.snapshot(kind), /snapshot kind/));
  assert.throws(() => client.native.snapshot(), /snapshot kind/);
  assert.throws(() => client.native.request(), /operation and numeric value/);
  assert.throws(() => client.native.request('refresh', '0'), /operation and numeric value/);
  [null, 1, 'x'.repeat(33)].forEach((operation) => assert.throws(() => client.native.request(operation, 0), /Invalid media operation/));
  ['start', 'stop', 'close', 'snapshot', 'request'].forEach((method) => {
    assert.throws(() => client.native[method].call({}, 0, 0), /Invalid media client receiver/);
  });

  const native = require(`../prebuilds/darwin-${process.arch}/media.node`);
  assert.throws(() => native.create(), /timeout/);
  [NaN, Infinity, 0, 31, '1'].forEach((timeout) => assert.throws(() => native.create('/script', '/framework', timeout), /timeout/));
  [[null, '/framework'], ['/script', null], ['x'.repeat(4097), '/framework']].forEach(([script, framework]) => {
    assert.throws(() => native.create(script, framework, 1), /resource paths/);
  });
});

nativeTest('Swift command validation prevents IPC even when JS helpers are bypassed', async (t) => {
  const { client, commands } = fixture(t);
  const invalid = [['seek', -1], ['seek', Infinity], ['seek', 1e13], ['shuffle', 2], ['repeat', 3],
    ['rate', 0], ['rate', 1.5], ['rate', Infinity], ['rate', 2147483648], ['unsupported', 0]];
  const results = await Promise.all(invalid.map(async ([operation, value]) => JSON.parse(await client.native.request(operation, value))));
  results.forEach((result) => { assert.equal(result.success, false); assert.ok(result.error); });
  assert.deepEqual(commands(), []);
});

nativeTest('missing resources and closed native clients fail before starting helpers', async (t) => {
  const { client, directory, commands } = fixture(t);

  const native = require(`../prebuilds/darwin-${process.arch}/media.node`);
  const relative = native.create('script', 'framework', 1);
  const missing = new MediaClient({ resourceDirectory: join(directory, 'missing') });
  t.onTestFinished(() => { relative.close(); missing.close(); });
  assert.match(JSON.parse(relative.start()).error, /must be absolute/);
  assert.match(JSON.parse(await relative.request('refresh', 0)).error, /must be absolute/);
  assert.match(JSON.parse(missing.native.start()).error, /resources are missing/);
  await assert.rejects(missing.refresh(), /resources are missing/);
  client.close();
  assert.match(JSON.parse(client.native.start()).error, /closed/);
  assert.match(JSON.parse(await client.native.request('refresh', 0)).error, /closed/);
  assert.deepEqual(commands(), []);
});

nativeTest('native listener start is idempotent', async (t) => {
  const { client, commands } = fixture(t);
  assert.equal(JSON.parse(client.native.start()).success, true);
  assert.equal(JSON.parse(client.native.start()).success, true);
  await until(() => client.getStatus().isAvailable);
  assert.equal(commands().filter((entry) => entry.command === 'stream').length, 1);
});

nativeTest('metadata defaults clamp invalid timelines and preserve valid optional fields', async (t) => {
  const { client, update } = fixture(t, { payload: track({ parentApplicationBundleIdentifier: '', genre: 'Jazz',
    trackNumber: 3, totalTrackCount: 12, playbackRate: -1, elapsedTimeMicros: -100, durationMicros: -100 }) });
  const status = await client.refresh();
  assert.equal(status.sourceAppUserModelId, 'com.eisland.fixture');
  assert.equal(status.playbackStatus, 'paused');
  assert.equal(status.timeline.position, 0);
  assert.equal(status.timeline.endTime, 0);
  assert.deepEqual(status.genres, ['Jazz']);
  assert.equal(status.trackNumber, 3);
  assert.equal(client.getMediaSessions()[0].media.albumTrackCount, 12);
  update({ payload: track({ playbackRate: undefined, durationMicros: 0, timestampEpochMicros: 0 }) });
  await client.refresh();
  const before = client.getTimestamp().timeline.position;
  await delay(100);
  assert.ok(client.getTimestamp().timeline.position > before);
  update({ payload: track({ playing: undefined, timestampEpochMicros: (Date.now() + 60000) * 1000 }) });
  await client.refresh();
  assert.equal(client.getTimestamp().timeline.position, 5);
  update({ payload: {} });
  const empty = await client.refresh();
  assert.equal(empty.playbackStatus, 'unknown');
  assert.equal(empty.timeline, null);
  assert.equal(client.getTimestamp().timeline, null);
  assert.deepEqual(client.getMediaSessions(), []);
});

nativeTest('invalid artwork is discarded and command queries retain only the same track artwork', async (t) => {
  const { client, update, commands } = fixture(t);
  await client.refresh();
  assert.equal((await client.pause()).success, true);
  assert.ok(commands().some((entry) => entry.arguments.includes('--no-artwork')));
  assert.equal(client.getStatus().thumbnail, 'data:image/png;base64,aW1hZ2U=');
  update({ payload: track({ title: 'Changed', uniqueIdentifier: 'two' }) });
  await client.pause();
  assert.equal(client.getStatus().thumbnail, null);
  const invalidArtwork = [{ artworkData: 'invalid!' }, { artworkData: '' }, { artworkMimeType: 'text/html' },
    { artworkData: null }, { artworkData: Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64') }];
  await invalidArtwork.reduce(async (pending, artwork) => {
    await pending;
    update({ payload: track(artwork) });
    assert.equal((await client.refresh()).thumbnail, null);
  }, Promise.resolve());
});

nativeTest('non-object JSON, oversized stderr and timeout warnings are rejected', async (t) => {
  const { client, update } = fixture(t, { getRaw: '[1,2]' });
  await assert.rejects(client.refresh(), /Invalid media bridge response/);
  update({ payload: track(), oversizedError: true });
  await assert.rejects(client.refresh(), /size limit/);
  update({ payload: track(), timeoutWarning: true });
  await assert.rejects(client.refresh(), /timed out/);
  update({ payload: track(), silentQueryExit: true });
  await assert.rejects(client.refresh(), /Media bridge exited \(2\)/);
});

nativeTest.for([
  ['oversizedStream', /12 MiB/], ['silentExitStream', /Media bridge exited \(2\)/],
])('stream failure %s clears caches and stops polling', { timeout: 20000 }, async ([flag, message], t) => {
  const { client, commands } = fixture(t, { payload: track(), [flag]: true });
  const monitor = new MediaMonitor(client);
  let failure;
  monitor.on('error', (error) => { failure = error; });
  t.onTestFinished(() => monitor.stop());
  monitor.start();
  // 大块流通过管道分批进入 Swift 队列，保留有界但足够的等待时间。
  await until(() => failure !== undefined, 15000);
  assert.match(failure.message, message);
  await until(() => !monitor.running);
  assert.equal(client.getStatus().isAvailable, false);
  assert.equal(monitor.cache.size, 0);
  await until(() => commands().every((entry) => !alive(entry.pid)));
});
