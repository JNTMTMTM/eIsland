---
title: Release Commands
icon: rocket
---

# Release Commands

The three existing operations remain unchanged:

| Command | Local build | Remote publication |
| --- | --- | --- |
| `npm run package` | Native plugins/resources, NSIS, official updater signature, verified hybrid JSON | None |
| `npm run release:upload-only` | None; verifies an existing signed installer with its matching application | COS/OSS, optional R2/MinIO/GitHub, then ESA cache refresh |
| `npm run release` | Runs package, then upload-only | Same publication behavior as upload-only |

`release:upload` remains an alias for `release`; `release:upload-minio` selects the existing MinIO-only route without ESA purge. Upload commands must only run when publication is intended. This refactor runs local boundary tests and does not publish.

Configure the stable updater signing identity through `TAURI_SIGNING_PRIVATE_KEY` and matching `TAURI_UPDATER_PUBLIC_KEY`; the optional password is `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Missing identity values fail packaging before building. Tauri CLI 2.12.4+ signs version-bound artifacts. Updater signatures and Windows Authenticode certificates serve different purposes.

The default Cargo target contains `release/eisland.exe`, `release/bundle/nsis/eIsland_<version>_x64-setup.exe`, its `.sig`, and `release/bundle/tauri-latest.json`. Upload-only reuses those outputs without rebuilding plugins. All selected mirrors must receive the EXE and signature before any feed is updated; failures stop later publication and cache purge.

Default object keys now use `eisland-update/tauri/`, matching the default ESA feed path. Selected storage mirrors also receive a transitional `tauri/latest.json` hybrid alias for old custom Tauri clients; the first bridge must include the existing R2 bucket used by those clients. COS/OSS are required for normal uploads; R2 is fully opt-in with its endpoint, bucket, credentials and public base configured. GitHub upload requires an explicit opt-in and an already published exact-version Release; the release workflow itself only saves Actions artifacts with read-only repository permissions. Actions artifacts are not public Release assets.

```powershell
npm run package
# Only when remote publication is intended:
npm run release:upload-only
```

For local plan validation, use `node scripts/native/upload-release.mjs --dry-run`. It verifies the existing installer/signature and configuration, then prints a plan without AWS upload or ESA purge. `--target-dir` and `--dist` remain supported and mutually exclusive.

The official feed includes absolute HTTPS URLs and Minisign signatures, retaining NSIS/size/SHA-512 metadata solely for custom Tauri 27.0.1 clients. Electron installations use a different application identity and require a documented manual migration; no Electron feed is repointed to Tauri. See the repository's `docs/TAURI_RELEASE.md` for exact environment names, mirror behavior, compatibility matrix, secure key handling, manual migration and external verification still required.
