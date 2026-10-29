---
title: ESA Cache Commands
icon: bolt
---

# ESA Cache Commands

:::info
This document covers the ESA (Edge Security Acceleration) CDN cache purge commands for clearing cached content on Alibaba Cloud ESA. These commands use the official `@alicloud/esa20240910` SDK.
:::

All commands are run from the project root:

```bash
npm run <script>
```

:::warning
All scripts use `node --experimental-strip-types` for native TypeScript execution. Use **Node.js 24.22.1 LTS** for this repository. See [Frontend Setup — Prerequisites](/developer/environment-setup/frontend-setup.md#prerequisites).
:::

## Environment Variables

All ESA commands read credentials from environment variables. In local development, these are loaded from `.env`. In CI, they are injected via GitHub Secrets.

| Variable | Description | Example |
|----------|-------------|---------|
| `ESA_ACCESS_KEY_ID` | Alibaba Cloud AccessKey ID | `LTAI5t...` |
| `ESA_ACCESS_KEY_SECRET` | Alibaba Cloud AccessKey Secret | `JLbY0d...` |
| `ESA_ZONE_ID` | ESA site ID (numeric) | `15050...` |
| `ESA_PURGE_URL` | Full URL to purge (file-level) | `https://cdn.example.com/path/file.yml` |
| `ESA_HOSTNAME` | Hostname to purge (site-level) | `eisland-dev.pyisland.com` |

:::important
Never commit `.env` to version control. The `.gitignore` already excludes it. For CI, configure the values as GitHub repository secrets under **Settings → Secrets and variables → Actions**.
:::

## `esa:purge`

Purges the cache for a **specific file URL** on ESA CDN.

```bash
npm run esa:purge
```

**Under the hood:** `node --experimental-strip-types scripts/esa/purge-esa-cache.ts`

**Reads:** `ESA_PURGE_URL`

**When to use:**
- After uploading a new release artifact that has a stable CDN URL (e.g., `latest.yml`)
- When a specific cached file is stale and needs immediate refresh

:::tip
This command is automatically chained after `release:upload`, `release:upload-only`, and `release:upload-minio`. You rarely need to run it manually.
:::

## `esa:purge-hostname`

Purges **all cached content** under a specific hostname on ESA CDN.

```bash
npm run esa:purge-hostname
```

**Under the hood:** `node --experimental-strip-types scripts/esa/purge-esa-hostname.ts`

**Reads:** `ESA_HOSTNAME`

**When to use:**
- After deploying a new version of the docs site
- When an entire hostname's cache needs to be refreshed

:::note
This command is used in the `deploy-docs.yml` GitHub Actions workflow to clear the docs site cache after deployment.
:::

## `esa:purge-all`

Purges **all cached content** for the entire ESA site (all hostnames, all files).

```bash
npm run esa:purge-all
```

**Under the hood:** `node --experimental-strip-types scripts/esa/purge-esa-hostname.ts --purge-all`

**Reads:** `ESA_ZONE_ID`, `ESA_ACCESS_KEY_ID`, `ESA_ACCESS_KEY_SECRET`

:::danger
This clears the cache for every hostname and file under the ESA site. Use only when a full cache reset is required. This operation is subject to daily quota limits — repeated calls may fail with `QuotaExceeded`.
:::

## Automatic Purge in Release Workflow

The upload commands automatically purge the file-level cache after a successful upload:

| Command | Uploads To | Auto Purge |
|---------|-----------|------------|
| `release:upload` | COS + OSS | `esa:purge` |
| `release:upload-only` | COS + OSS | `esa:purge` |
| `release:upload-minio` | MinIO | `esa:purge` |

:::note
The automatic purge only clears the file URL specified in `ESA_PURGE_URL`. To clear the entire hostname or site cache, run `esa:purge-hostname` or `esa:purge-all` manually.
:::

## Source Files

| File | Responsibility |
|------|---------------|
| `scripts/esa/esa-env.ts` | Shared ESA utilities (env loading, client creation) |
| `scripts/esa/purge-esa-cache.ts` | File-level cache purge via ESA SDK |
| `scripts/esa/purge-esa-hostname.ts` | Hostname/site-level cache purge via ESA SDK |

## Troubleshooting

### QuotaExceeded Error

```
QuotaExceeded: You attempts have exceeded the daily limit.
```

ESA enforces a daily limit on purge requests. If you hit this limit, wait until the next day or contact Alibaba Cloud support to increase the quota.

:::tip
Batch your cache purge operations. Avoid running `esa:purge` or `esa:purge-hostname` repeatedly in quick succession — each call counts against the daily quota.
:::

### SignatureDoesNotMatch Error

This usually means the credentials are incorrect or expired. Verify that `ESA_ACCESS_KEY_ID` and `ESA_ACCESS_KEY_SECRET` in `.env` (or GitHub Secrets) are valid.

### InvalidParameters Error

The target URL or hostname does not belong to the ESA site specified by `ESA_ZONE_ID`. Verify that the domain is configured in the ESA console under the correct site.
