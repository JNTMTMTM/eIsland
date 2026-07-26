---
watermark: true
title: BrightnessMonitor
icon: fa6-solid:cubes
---

# BrightnessMonitor

:::info
BrightnessMonitor is a real-time screen brightness change detector built on top of Windows WMI (`WmiMonitorBrightnessEvent`). It extends Node.js `EventEmitter` and pushes brightness change events without polling, making it lightweight and responsive. Use it when your application needs to react to brightness adjustments made by the user or the system (e.g., adaptive brightness, function keys, or Settings app changes).
:::

## Constructor

```typescript
new BrightnessMonitor(): BrightnessMonitor
```

Creates a new BrightnessMonitor instance. The monitor does not start automatically — you must call [`start()`](#methods) to begin listening for brightness changes.

## Usage

BrightnessMonitor follows a simple lifecycle: **create → listen → start → stop**.

1. Create a `BrightnessMonitor` instance.
2. Register event listeners for `brightness-changed` and `error` **before** calling `start()`, so you never miss early events.
3. Call `start()` to subscribe to WMI brightness events.
4. Call `stop()` when you no longer need monitoring to release WMI resources.

:::tip
Both `start()` and `stop()` are idempotent — calling `start()` on an already-running monitor or `stop()` on a stopped monitor is a safe no-op. This makes cleanup code simpler since you can always call `stop()` unconditionally.
:::

:::tip
If you need to restart monitoring after stopping, it is recommended to create a fresh `BrightnessMonitor` instance rather than calling `start()` again on the same instance. This avoids stale listener state and ensures a clean WMI subscription.
:::

## Methods

| Method | Return | Description |
|--------|--------|-------------|
| `start()` | `void` | Start monitoring for brightness changes. Idempotent — safe to call multiple times. |
| `stop()` | `void` | Stop monitoring and release the WMI subscription. Idempotent — safe to call multiple times. |
| `isRunning()` | `boolean` | Returns `true` if the monitor is currently active. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `brightness-changed` | `brightness: number, timestamp: number` | Fired when the screen brightness changes. `brightness` is a percentage (0-100). `timestamp` is the WMI event timestamp. |
| `error` | `err: Error` | Fired when an internal error occurs during monitoring (e.g., WMI subscription failure). |

:::warning
If you do not register an `error` listener, errors will be thrown as unhandled exceptions and may crash your process. Always attach an `error` handler before calling `start()`.
:::

## Example

::: code-tabs

@tab TypeScript

```ts
import { BrightnessMonitor } from '@eisland/windows-brightness-helper';

// Create a new monitor instance
const monitor = new BrightnessMonitor();

// Listen for brightness changes — register before start() to avoid missing events
monitor.on('brightness-changed', (brightness: number, timestamp: number) => {
  // Brightness is a percentage from 0 to 100; timestamp comes from the WMI event
  console.log(`Brightness changed to ${brightness}% at ${new Date(timestamp)}`);
});

// Handle monitoring errors (e.g., WMI subscription failure)
monitor.on('error', (err: Error) => {
  console.error('Brightness monitor error:', err);
});

// Start the monitor — begins listening for WMI brightness events
monitor.start();

// Check if the monitor is running
console.log(`Monitoring active: ${monitor.isRunning()}`);

// Stop the monitor when done — releases the WMI subscription
monitor.stop();
```

@tab JavaScript

```js
const { BrightnessMonitor } = require('@eisland/windows-brightness-helper');

// Create a new monitor instance
const monitor = new BrightnessMonitor();

// Listen for brightness changes — register before start() to avoid missing events
monitor.on('brightness-changed', (brightness, timestamp) => {
  // Brightness is a percentage from 0 to 100; timestamp comes from the WMI event
  console.log(`Brightness changed to ${brightness}% at ${new Date(timestamp)}`);
});

// Handle monitoring errors (e.g., WMI subscription failure)
monitor.on('error', (err) => {
  console.error('Brightness monitor error:', err);
});

// Start the monitor — begins listening for WMI brightness events
monitor.start();

// Check if the monitor is running
console.log(`Monitoring active: ${monitor.isRunning()}`);

// Stop the monitor when done — releases the WMI subscription
monitor.stop();
```

:::

## Notes

:::note
The monitor uses Windows WMI `WmiMonitorBrightnessEvent` internally. This means it only detects brightness changes on WMI-compatible displays (typically built-in laptop screens and all-in-one PCs). Brightness changes on external monitors controlled via DDC/CI will not trigger events. For external monitors, consider polling [getBrightness](get-brightness.md) periodically instead.
:::

:::note
Register your event listeners before calling `start()`. While `start()` is idempotent, the `brightness-changed` event could fire almost immediately after the WMI subscription is established, so late listeners may miss the first event.
:::

:::note
The `timestamp` parameter in the `brightness-changed` event comes from the WMI event itself, not from `Date.now()`. Use `new Date(timestamp)` to convert it to a JavaScript `Date` object.
:::

## Danger Avoidance

:::danger
Always call `stop()` when you are done with the monitor. Failing to stop the monitor keeps the WMI subscription active, which consumes system resources. In long-running applications (e.g., Electron tray apps), forgetting to stop can lead to resource leaks over time.
:::

:::danger
Do not create multiple `BrightnessMonitor` instances simultaneously. Each instance opens its own WMI subscription. Multiple concurrent subscriptions can cause duplicate events and unnecessary system overhead. Use a single instance and share it across your application.
:::

:::danger
Do not call `start()` on a monitor that has already been stopped and expect it to behave identically to a fresh instance. If you need to restart monitoring after stopping, create a new `BrightnessMonitor` instance to ensure a clean WMI subscription.
:::
