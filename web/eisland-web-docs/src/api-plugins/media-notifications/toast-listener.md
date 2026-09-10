---
watermark: true
title: Windows Toast Listener
icon: bell
---

# Windows Toast Listener

`@eisland/windows-toast-listener` · v26.0.0

Toast notification listening and suppression via C++ N-API native addon.

:::important
Call `requestAccess` before `startListening`. If access is denied, the listener will not receive any notifications. Check `getAccessStatus` to verify the current permission state.
:::

## Types

| Type | Description |
|------|-------------|
| [ToastAccessStatus](toast-listener/toast-access-status.md) | Notification access status |
| [ToastNotificationChangeKind](toast-listener/toast-notification-change-kind.md) | Notification change type |

## Interfaces

| Interface | Description |
|-----------|-------------|
| [ToastNotificationChangedEvent](toast-listener/toast-notification-changed-event.md) | Notification change event |
| [ToastNotificationSnapshot](toast-listener/toast-notification-snapshot.md) | Notification data snapshot |

## Functions

| Function | Description |
|----------|-------------|
| [requestAccess](toast-listener/request-access.md) | Request notification access |
| [getAccessStatus](toast-listener/get-access-status.md) | Check access status |
| [getNotifications](toast-listener/get-notifications.md) | Get all current notifications |
| [startListening](toast-listener/start-listening.md) | Start event-driven listening |
| [stopListening](toast-listener/stop-listening.md) | Stop listening |
| [isListening](toast-listener/is-listening.md) | Check listening state |
| [enableSuppression](toast-listener/enable-suppression.md) | Enable toast suppression |
| [disableSuppression](toast-listener/disable-suppression.md) | Disable toast suppression |
| [isSuppressionEnabled](toast-listener/is-suppression-enabled.md) | Check suppression state |
