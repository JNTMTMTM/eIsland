---
title: Release Commands
icon: rocket
---

# Release Commands

:::info
This document covers the release and changelog commands for publishing eIsland builds and generating release notes. For packaging the installer locally, see [Package Commands](package-commands.md).
:::

All commands are run from the `web/` directory:

```bash
cd web
npm run <script>
```

:::warning
All scripts that invoke `.ts` files use `node --experimental-strip-types` for native TypeScript execution. Use **Node.js 24.21.0 LTS** for this repository. See [Frontend Setup — Prerequisites](/developer/environment-setup/frontend-setup.md#prerequisites).
:::

## Changelog Generation

### `release:notes`

Generates incremental release notes from git history since the last tag.

```bash
npm run release:notes
```

**Under the hood:** `node --experimental-strip-types scripts/generate-incremental-release-notes.ts -o RELEASE_NOTES_SINCE_LAST_TAG.md`

**Output:** `RELEASE_NOTES_SINCE_LAST_TAG.md` in the project root.

**When to use:**
- After merging PRs, before creating a release
- To review what changes will be included in the next release

### `changelog:generate`

Generates a full changelog from the entire git history.

```bash
npm run changelog:generate
```

**Under the hood:** `node --experimental-strip-types scripts/generate-changelog.ts -o docs/CHANGE_LOG.md`

**Output:** `docs/CHANGE_LOG.md`

:::note
Unlike `release:notes` (incremental), this regenerates the complete changelog. Use it for periodic maintenance, not for every release.
:::

## Upload Commands

:::danger
Upload commands are for **maintainer use only**. Regular developers do not have permission to upload build artifacts to remote storage (COS / MinIO). Use `npm run package` locally to verify the installer build, but do not run `release:upload*` commands.
:::

### `release:upload`

Packages the application and uploads release artifacts to COS (Cloud Object Storage).

```bash
npm run release:upload
```

**Under the hood:** `npm run package && node --experimental-strip-types scripts/upload-release-to-cos-oss.ts && npm run esa:purge`

**When to use:**
- **Maintainer only** — publish a new release to CDN

:::note
After a successful upload, this command automatically purges the ESA CDN file cache for the URL configured in `ESA_PURGE_URL`. See [ESA Cache Commands](esa-commands.md) for details.
:::

### `release:upload-only`

Uploads existing build artifacts to COS without rebuilding.

```bash
npm run release:upload-only
```

**Under the hood:** `node --experimental-strip-types scripts/upload-release-to-cos-oss.ts && npm run esa:purge`

**When to use:**
- **Maintainer only** — re-upload a previously built package (e.g., after a CDN issue)

:::tip
Use this instead of `release:upload` when you have already built the package and just need to re-upload. It skips the build step, saving time.
:::

### `release:upload-minio`

Uploads artifacts to MinIO storage for internal/self-hosted distribution.

```bash
npm run release:upload-minio
```

**Under the hood:** `node --experimental-strip-types scripts/upload-release-to-cos-oss.ts --minio-only && npm run esa:purge`

**When to use:**
- **Maintainer only** — internal/self-hosted release distribution
