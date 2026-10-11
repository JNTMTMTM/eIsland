---
watermark: true
title: macOS Media Helper
icon: music
---

# macOS Media Helper

`eisland-macos-media-helper` · v26.1.3

Current Now Playing metadata, artwork, timeline, events, and asynchronous controls through Swift + Node-API.

:::info
This independent plugin lives in `plugins/macos/eisland-macos-media-helper`. It observes the system current media source, not every running player. The eIsland main application still imports Windows helpers; creating this plugin does not complete application-wide macOS support.
:::

## Build / Usage

| Requirement | Details |
|------------|---------|
| Platform | macOS, with a macOS 13 deployment target; compatibility with every older OS release has not been verified |
| Architecture | Separate `darwin-arm64` and `darwin-x64` prebuilds |
| Runtime | Node.js 18+ and Node-API 8; no Xcode or Swift compiler required for prebuilt package consumers |
| Development | Xcode Command Line Tools; Node.js 22.12+ recommended for Vitest 4.1 and the locked toolchain |
| Backend | Vendored MediaRemote Adapter framework loaded by system Perl |

Run development commands from the repository checkout:

```bash
cd plugins/macos/eisland-macos-media-helper
npm ci
npm run build
npm test
npm run smoke
npm run build:all
npm pack
```

`build` compiles the host architecture; `build:all` compiles both architectures. `npm pack` runs `build:all` through `prepack`. Set `NODE_INCLUDE_DIR` to a directory containing `node_api.h` to use existing headers; otherwise the build script can download headers with node-gyp.

```javascript
const media = require('eisland-macos-media-helper');

async function readCurrentTrack() {
  try {
    const status = await media.refresh();
    console.log(status.title, status.artist, status.albumTitle);
    console.log(status.timeline?.position, status.timeline?.endTime);
  } finally {
    media.shutdown();
  }
}

readCurrentTrack().catch(console.error);
```

:::important
`getStatus()`, `getTimestamp()`, and `getMediaSessions()` synchronously read cached state. Before the first `refresh()` or listener update, the cache is unavailable. Keep a monitor running for ongoing updates, or call `refresh()` before a one-time query.
:::

## Query and Control API

| API | Return / parameters | Behavior |
|-----|---------------------|----------|
| `refresh()` | `Promise<MediaStatus>` | Query the bridge and update the cache; rejects on bridge failure |
| `getStatus()` | `MediaStatus` | Cached full snapshot, including artwork |
| `getTimestamp()` | `TimestampInfo` | Cached playback state and interpolated timeline, without metadata or artwork |
| `getMediaSessions()` | `SessionSnapshot[]` | Zero or one current source |
| `play()`, `pause()`, `next()`, `previous()`, `stop()` | `Promise<CommandResult>` | Send a command to the system current source |
| `seek(seconds)` | `Promise<CommandResult>` | Finite, non-negative seconds below `9.22e12` |
| `setShuffle(active)` | `Promise<CommandResult>` | Boolean; enables or disables track shuffle |
| `setRepeatMode(mode)` | `Promise<CommandResult>` | `0` off, `1` track, `2` list |
| `setPlaybackRate(rate)` | `Promise<CommandResult>` | Positive integers only; fractional speeds are rejected |
| `shutdown()` | `void` | Close the default client and cancel its bridge work |

`CommandResult` is `{ success: boolean, error: string | null }`. Invalid arguments reject the Promise. A valid request that fails in the bridge returns `success: false`. No command is sent when the preliminary query finds no current media source.

```javascript
const result = await media.seek(30);
if (!result.success) console.error(result.error);
```

:::note
`success: true` confirms bridge command delivery, not execution by the player. Observe subsequent state to verify the intended effect. All commands target the system current source; no public command accepts a source ID. Technical error strings should be translated into localized feedback when used in application UI.
:::

## Metadata, Artwork, and Timeline

| Field | Meaning |
|-------|---------|
| `isAvailable` | Whether the cache contains an observable current source |
| `title`, `artist`, `albumTitle` | Player-provided strings, or `null` when absent |
| `albumArtist` | Currently unmapped; always `null` in `MediaStatus` |
| `trackNumber`, `genres` | Returned when reported by the bridge; otherwise `null` |
| `sourceAppUserModelId` | Compatibility field containing a macOS Bundle ID, preferring the parent application ID |
| `thumbnail` | Base64 image Data URL, or `null` when artwork is absent |
| `playbackStatus` | Primarily `playing`, `paused`, or `unknown` |
| `playbackRate`, `isShuffleActive`, `repeatMode` | Player-reported values, or `null` when absent |
| `timeline` | Seconds: `startTime`, `endTime`, `position`, `minSeekTime`, `maxSeekTime`; `null` when unavailable |
| `controls` | Currently always `null`; supported transport buttons are unknown |

Artwork can be supplied directly to an image element as its `src`, for example `data:image/jpeg;base64,...` or `data:image/png;base64,...`. The full image is returned by `refresh()` and `getStatus()`, and in monitor media payloads; `getTimestamp()` omits it.

Position advances from the last player timestamp using a monotonic clock. It freezes while paused and is clamped to duration. Seek bounds are inferred as `0` through duration; they are not independent player-reported limits. Missing duration is represented as `0`.

:::tip
The read-only smoke script prints `hasArtwork`, `thumbnailPreview`, and `thumbnailLength`. The preview contains the first 120 characters of the full Data URL and appends `...` when truncated. The length counts the complete Data URL, including its MIME prefix; it is not the decoded image byte count. Missing artwork produces `false`, `null`, and `0` respectively.
:::

Illustrative smoke output excerpt:

```json
{
  "isAvailable": true,
  "sourceAppId": "com.soda.music",
  "title": "Example track",
  "artist": "Example artist",
  "albumTitle": "Example album",
  "hasArtwork": true,
  "thumbnailPreview": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "thumbnailLength": 6047,
  "playbackStatus": "playing",
  "durationSeconds": 261.85,
  "positionSeconds": 56.65
}
```

## Clients and Monitoring Events

`MediaClient(options)` creates an independent cache. `MediaMonitor(client?)` defaults to the shared client used by top-level functions. `SmtcMonitor` is an alias of `MediaMonitor`. Each monitor exposes `start()`, `stop()`, and `getMediaSessions()`.

| Option | Default | Meaning |
|--------|---------|---------|
| `timeoutMs` | `4000` | Request deadline, from 100 to 30000 milliseconds |
| `resourceDirectory` | Bundled architecture directory | Bridge directory containing `mediaremote-adapter.pl` and `MediaRemoteAdapter.framework`; does not change the `.node` location |

| Event | Arguments |
|-------|-----------|
| `session-added` | `(sourceAppId, media)` |
| `session-removed` | `(sourceAppId)` |
| `session-media-changed` | `(sourceAppId, media)` |
| `session-playback-changed` | `(sourceAppId, playback)` |
| `session-timeline-changed` | `(sourceAppId, timeline)` |
| `error` | `(error)` |

Media payloads use the Windows-compatible shape: `title`, `artist`, `albumTitle`, `albumArtist`, `genres`, `albumTrackCount`, `trackNumber`, and `thumbnail`. Missing string and numeric session fields use empty strings or zero; `albumArtist` is currently empty. Playback payloads use `4` for playing, `5` for paused, and `0` for unknown `playbackType`. Timeline event payloads contain second-based `position` and `duration`.

```javascript
const { MediaClient, MediaMonitor } = require('eisland-macos-media-helper');
const client = new MediaClient({ timeoutMs: 4000 });
const monitor = new MediaMonitor(client);

monitor.on('error', (error) => console.error(error));
monitor.on('session-added', (id, media) => console.log(id, media?.title));
monitor.on('session-media-changed', (id, media) => console.log(id, media?.title));
monitor.on('session-timeline-changed', (id, timeline) => console.log(id, timeline.position));
monitor.start();

process.once('SIGINT', () => {
  monitor.stop();
  client.close();
});
```

Monitors sharing a client share one native listener. Starting and stopping are idempotent; stopping retains JS listeners so the monitor can restart. Stopping the final monitor releases the listener and clears its cache. A removed event means the source is no longer the system current source, not that its application exited.

JS checks the native revision every 100 ms and reads a full snapshot only after a change. Lightweight position sampling runs every 500 ms and publishes timeline changes after at least 0.5 seconds of movement. Unexpected bridge exit clears stale state and emits an error; the monitor does not restart automatically. Close independent clients with `client.close()` and the default client with `shutdown()`.

## Windows Compatibility

| Capability | Windows SMTC Helper | macOS Media Helper |
|------------|---------------------|--------------------|
| Metadata and Base64 artwork | Supported when reported by the player | Supported when reported by the player |
| Session enumeration | All observable SMTC sessions | At most the system current source |
| Playback commands | Synchronous `CommandResult` | Asynchronous `Promise<CommandResult>` |
| Status queries | Query native SMTC state | Read cache; `refresh()` explicitly queries the bridge |
| Control availability | Player-reported `controls` | `null` |
| Playback state | Includes stopped, closed, opened, and changing | Primarily playing, paused, and unknown |
| Media type | System-reported playback type | Unknown (`0`) |
| Album artist | Returned when reported | Currently unmapped |
| Playback speed | Fractional values can be requested | Positive integers only |
| Seek limits | System-reported bounds | Inferred from duration |
| Source identifier | Windows AUMID | macOS Bundle ID |
| Control by explicit source ID | No public command parameter | No public command parameter |

Before application integration, add platform-specific loading, await control results, use Bundle IDs in player whitelists, and adjust source-selection UI to the single-current-source behavior. Shared data shapes do not make the macOS plugin a drop-in replacement for every Windows behavior.

## Electron Packaging and Backend Limits

Unpack all native resources together:

```json
{
  "asarUnpack": [
    "node_modules/eisland-macos-media-helper/prebuilds/**/*"
  ]
}
```

The `.node`, Swift `.dylib`, framework, and Perl script need filesystem paths. The loader translates `app.asar` paths to `app.asar.unpacked`. The bridge invokes system Perl with an explicit matching architecture; Rosetta execution still requires runtime verification. Artwork is bounded to 8 MiB and bridge standard output to 12 MiB.

:::warning
Cross-application reading uses private MediaRemote through [MediaRemote Adapter](https://github.com/ungive/mediaremote-adapter), pinned at commit `29718252613a5b0e210bdc64de0bd944ab379706`. The system Perl bridge addresses the upstream-reported restriction beginning with macOS 15.4; future OS changes may break access. This backend is intended for distribution outside the Mac App Store. A query returning no media does not prove access works; play media manually and rerun the smoke script.
:::

Builds apply ad-hoc signatures. A distributed Electron application must re-sign the native code and framework with its Developer ID, sign and notarize the application, and validate loading and cleanup in the final installed package. Vendored source retains its BSD-3-Clause license; eIsland-owned source uses GPL-3.0-or-later.

## Test

The 57 Vitest cases include 33 cross-platform JS/API/loader checks and 24 real compiled Swift / Node-API checks against isolated Perl fixtures. Coverage includes metadata and artwork mapping, advancing and paused timelines, command units and modes, invalid input, nonblocking requests, timeouts and output limits, malformed data, source changes, shared monitoring, stale-query races, cancellation, and Worker termination. Native tests skip on non-macOS hosts; the JS checks still run. Added cases cover default clients and public wrappers, error deduplication, stopping inside callbacks, architecture/ASAR loading, missing resources, native argument validation, invalid artwork and track-specific preservation, and oversized or unexpectedly terminated streams.

The suite has passed under Node, Electron in Node mode, and the repository Vitest plugins project. Real smoke checks have read track metadata and JPEG artwork from Soda Music. Actual player execution of transport commands, Rosetta, older supported OS releases, and signed distribution remain unverified.

Run `npm run test:coverage` for V8 runtime JS coverage, or `npm run test:coverage:native` for LLVM coverage of owned Swift / C sources on macOS. On the development arm64 Mac, runtime JS statement, function, and line coverage reached 100%, with 99.11% branch coverage. The remaining JS branch is a defensive missing-cache check during timeline updates. Owned Swift / C line coverage reached 92.21%, including 97.31% for the Swift media core. Native gaps include process-launch, allocation, and low-level Node-API failures. The tests also reproduce and verify the fix for a stream-exit race that could discard stderr diagnostics before reading completed. Reports are `coverage/js/index.html` and `coverage/native/html/index.html`. The native command requires `npm run build` and Node headers, creates isolated instrumented binaries under `build/native-coverage/`, and leaves production prebuilds unchanged. Reports and instrumented binaries are ignored by Git. Build scripts, vendor code, and OS frameworks are outside coverage scope.

Repository test commands are listed in [Plugin Commands](../../developer/commands/plugin-commands.md#macos-media-helper). Development tests and the smoke script are not included in the published npm archive.

## Source Files

| File | Responsibility |
|------|---------------|
| `index.js` / `index.d.ts` | Default-client API, exports, and public types |
| `client.js` / `client.d.ts` | Independent clients, request validation, and cleanup |
| `media-monitor.js` / `media-monitor.d.ts` | EventEmitter monitoring and shared-listener lifecycle |
| `types.d.ts` | Status, session, timeline, event, and option types |
| `native-loader.js` | Architecture selection, native loading, and ASAR path resolution |
| `src/MediaCore.swift` | Media cache, source mapping, timeline, and bridge requests |
| `src/ProcessRunner.swift` | Bounded process output and cancellation |
| `src/addon.c` / `src/bridge.h` | Node-API binding and Swift C ABI |
| `scripts/build.mjs` | Native builds, export checks, and ad-hoc signing |
| `vendor/VENDORED.md` | Backend provenance and pinned revision |
| `scripts/native-coverage.mjs` | Isolated LLVM instrumentation and coverage reports |
| `test/mediaJsRuntime.test.mjs` / `test/nativeLoaderRuntime.test.mjs` | Cross-platform public API, monitor, and loader tests |
| `test/mediaHelperRuntime.test.mjs` | Vitest integration and resource lifecycle tests |
| `test/smoke.cjs` | Read-only real-system metadata and artwork preview |
