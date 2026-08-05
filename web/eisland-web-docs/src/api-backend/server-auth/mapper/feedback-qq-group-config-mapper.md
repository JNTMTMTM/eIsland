# FeedbackQqGroupConfigMapper

:::info
MyBatis mapper interface for QQ group invitation configuration CRUD operations.
:::

## Overview

`FeedbackQqGroupConfigMapper` provides the data access layer for the singleton QQ group config row (ID = 1). Follows the same pattern as `AnnouncementConfigMapper`.

## Methods

| Method | Description | Returns |
|---|---|---|
| `selectCurrent()` | Fetch the singleton row (ID = 1) | `FeedbackQqGroupConfig` or `null` |
| `insert(config)` | Insert a new config row | `int` (affected rows) |
| `update(id, qqInviteUrl, enabled, updatedBy, updatedAt)` | Update existing config | `int` (affected rows) |

## Update Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `Long` | Config ID (always `1`) |
| `qqInviteUrl` | `String` | QQ group invitation link |
| `enabled` | `Boolean` | Enable/disable flag |
| `updatedBy` | `String` | Admin username |
| `updatedAt` | `LocalDateTime` | Update timestamp |
