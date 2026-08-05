# FeedbackQqGroupConfig

:::info
Singleton entity representing the QQ group invitation configuration for the issue feedback page, stored as a single row (ID = 1).
:::

## Overview

Represents the QQ group chat invitation URL displayed to users on the feedback page. Admins can update this configuration via the admin API. The entity follows the same singleton pattern as `AnnouncementConfig`.

## Fields

| Field | Type | Description |
|---|---|---|
| `id` | `Long` | Primary key (always `1`) |
| `qqInviteUrl` | `String` | QQ group invitation link |
| `enabled` | `Boolean` | Whether the QQ group banner is displayed to users |
| `updatedBy` | `String` | Username of last editor |
| `updatedAt` | `LocalDateTime` | Last modification timestamp |
