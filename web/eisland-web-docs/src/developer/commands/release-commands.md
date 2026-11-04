---
title: Release Commands
icon: rocket
---

# Release Commands

Run these commands from the **repository root**. The release chain builds or uploads a native Tauri NSIS installer and its matching JSON update feed through `scripts/native/upload-release.mjs`.

## Command behavior

| Command | Builds native resources and installer | Uploads |
| --- | --- | --- |
| `npm run package` | Yes | No |
| `npm run release` | Yes | Native release artifacts, then ESA cache refresh |
| `npm run release:upload` | Yes; alias of `release` | Same as `release` |
| `npm run release:upload-only` | No | Existing native release artifacts, then ESA cache refresh |
| `npm run release:upload-minio` | No | Existing native release artifacts to MinIO only |

Upload commands write to the configured remote storage. Use them when publishing is intended and the storage credentials and public installer URL are configured. To build and review an installer locally, use `npm run package`.

## Review before uploading

```powershell
npm run release:notes
npm run package
```

Review the generated notes and installer. The default installer path is `src-tauri/target/release/bundle/nsis/eIsland_<version>_x64-setup.exe`; `CARGO_TARGET_DIR` relocates the Cargo target directory. The native uploader consumes an existing build and its version, validates the installer, and publishes a matching native update manifest. It does not rebuild application code.

After reviewing an existing package, use:

```powershell
npm run release:upload-only
```

This avoids repeating the plugin and application builds. For one command that builds and uploads, use `npm run release` or its alias `npm run release:upload`.

```powershell
npm run release:upload-minio
```

The MinIO command selects only the native MinIO upload path. It does not run a build or refresh the public ESA cache.

## Configuration and dry run

The uploader reads the repository root `.env` without replacing variables already supplied by the terminal or CI. Existing COS, OSS and ESA variable names remain in use:

| Destination | Variables |
| --- | --- |
| COS, required for normal uploads | `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_REGION`, `COS_BUCKET_NAME` |
| OSS, required for normal uploads | `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `OSS_REGION`, `OSS_BUCKET_NAME` |
| Optional MinIO, required with `--minio-only` | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`; optional `MINIO_REGION` |
| ESA, required for normal uploads | `ESA_ACCESS_KEY_ID`, `ESA_ACCESS_KEY_SECRET`, `ESA_ZONE_ID` |

Real uploads require AWS CLI v2 in `PATH`, or `AWS_CLI_PATH`. MinIO configuration must be complete when any MinIO variable is supplied. Native ESA URLs use `EISLAND_TAURI_UPDATE_ESA_URL` or derive from the existing `ESA_PURGE_URL`; the release tool refreshes the exact native manifest and installer URLs.

```powershell
node scripts/native/upload-release.mjs --dry-run
node scripts/native/upload-release.mjs --dry-run --minio-only
node scripts/native/upload-release.mjs --dry-run --target-dir C:/build/eisland
node scripts/native/upload-release.mjs --dry-run --dist C:/build/eisland/release/bundle/nsis
```

`--dry-run` validates the existing installer and configuration and prints the plan without calling AWS, uploading or refreshing a CDN. It still requires the selected destination variables. Missing configuration fails explicitly; a successful package build does not verify upload credentials. No remote publication has been performed as part of this migration.

`--target-dir` selects a Cargo target directory. `--dist` (`-d`) selects an NSIS directory directly; use one option at a time. Otherwise the tools respect `CARGO_TARGET_DIR` or Cargo's configured target directory.

The default object keys are `tauri/<installer-name>` and `tauri/latest.json`; `EISLAND_TAURI_UPLOAD_PREFIX` changes this prefix. The uploader reads `RELEASE_NOTES.md`, falling back to `RELEASE_NOTES_SINCE_LAST_TAG.md`, and computes the size and SHA-512 automatically. All selected destinations receive the installer before any manifest is updated. ESA refresh follows successful uploads. Failures are reported without promising a rollback across providers.

The uploader targets COS, OSS and optional MinIO. It does not upload to Cloudflare R2 or GitHub Releases directly. If R2 is supplied by a MinIO mirror or another replication job, that external process must synchronize the new `tauri/` prefix and both release objects. ESA origin path rewrites, including `/eisland-update`, are infrastructure settings outside this repository and must match the deployed feed URL. The default R2 and ESA online update paths have not been verified by this local build.

## Native update feed

The updater expects this shape:

```json
{
  "runtime": "tauri",
  "version": "27.0.1",
  "notes": "Release notes",
  "platforms": {
    "windows-x86_64": {
      "format": "nsis",
      "url": "https://downloads.example.com/eIsland_27.0.1_x64-setup.exe",
      "size": 123456,
      "sha512": "base64-or-hex-sha512-of-the-installer"
    }
  }
}
```

The example size and digest are placeholders. Release tooling computes both from the installer. Cloud manifests default to a relative installer filename, resolved against each mirror's feed URL. `EISLAND_TAURI_RELEASE_BASE_URL` can instead specify an explicit HTTPS installer directory. Publish the installer and matching feed together.

`EISLAND_TAURI_UPDATE_R2_URL`, `EISLAND_TAURI_UPDATE_ESA_URL` and `EISLAND_TAURI_UPDATE_GITHUB_URL` override the application's native feed endpoints. `EISLAND_TAURI_RELEASE_BASE_URL` controls the installer URL prefix used by the standalone manifest generator. These URL settings do not supply storage credentials or publish files.

Until a native feed is published at the selected endpoint, the application reports `NATIVE_UPDATE_MANIFEST_UNAVAILABLE`.

## GitHub Actions

The release build workflow prepares native resources, runs native tests, builds the NSIS installer with `npx tauri build`, generates release notes and `tauri-latest.json`, and uploads them as **Actions artifacts**. It does not invoke `release`, `release:upload-only` or the native storage uploader.

A generated manifest may contain a GitHub Releases download URL. That URL is a proposed distribution location; an Actions artifact does not create the corresponding GitHub Release asset or publish the native feed. Review and publish the matching installer and feed through an explicitly requested release operation.

## Changelog commands

```powershell
npm run release:notes
npm run changelog:generate
```

`release:notes` writes incremental notes since the previous tag to `RELEASE_NOTES_SINCE_LAST_TAG.md`. `changelog:generate` writes the full history to `docs/CHANGE_LOG.md`. These commands use Node's native TypeScript execution; the repository uses Node.js 24.22.1.
