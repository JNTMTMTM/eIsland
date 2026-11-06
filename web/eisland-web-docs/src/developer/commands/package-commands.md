---
title: Package Commands
icon: box
---

# Package Commands

Run `npm run package` from the repository root to build a local signed Tauri installer. This does not upload, install, deploy or publish anything.

The package wrapper first requires `TAURI_SIGNING_PRIVATE_KEY` and its matching `TAURI_UPDATER_PUBLIC_KEY`, optionally with `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. It verifies a Tauri CLI version supporting signed-version binding, builds native resources exactly once through the existing `build-native.mjs`, invokes official Tauri NSIS packaging/signing, verifies the resulting EXE and `.sig` using the public key in the matching application, and generates the official/hybrid update manifest.

Native preparation includes the existing C# volume, brightness, temperature and SMTC plugins plus bundled FFmpeg and ffprobe. No global FFmpeg/ffprobe installation is assumed. Keep `package.json`, Cargo and Tauri versions aligned.

The Cargo target contains:

- `release/eisland.exe`.
- `release/bundle/nsis/eIsland_<version>_x64-setup.exe`.
- `release/bundle/nsis/eIsland_<version>_x64-setup.exe.sig`.
- `release/bundle/tauri-latest.json`.

`CARGO_TARGET_DIR` and Cargo target configuration relocate these outputs. `npm run build` still builds the native executable without an installer; `npm run build:web` builds renderer assets. Direct `npx tauri build` consumes prepared resources, but normal release packaging should use the wrapper so required signing, version binding and manifest validation are not skipped.

`node scripts/native/create-update-manifest.mjs` verifies an existing signed installer and writes a new manifest. It does not create a signature or upload anything. Missing/mismatched signature, public key or matching verifier blocks it. The default public directory is the ESA `eisland-update/tauri` route; an explicit `EISLAND_TAURI_RELEASE_BASE_URL` must be a plain HTTPS directory.

Updater signing does not mean the installer has Windows Authenticode signing. Configure a separate Windows certificate when that publisher-trust requirement applies. Do not place private keys in the repository, shell arguments, logs, fixtures or uploaded artifacts.

The root postinstall still installs CLI dependencies. With lifecycle scripts disabled, install CLI dependencies explicitly before CLI tests. See [release commands](release-commands.md) and repository `docs/TAURI_RELEASE.md` for publication configuration and migration constraints.
