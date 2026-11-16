---
title: Plugins Tech Stack
icon: toolbox
---

# Plugins Tech Stack

:::warning
This document provides an overview of the native Node.js addon plugins used in the eIsland application. Windows plugins use C/C++ + Node-API or C# .NET with koffi FFI / child processes. The independent [macOS Media Helper](../../api-plugins/media-notifications/macos-media-helper.md) uses Swift + C / Node-API; its current-source backend is not equivalent to Windows SMTC multi-session enumeration.

The desktop performance monitor reads CPU, memory, and disk usage in Rust. Windows reads CPU clocks through PowrProf, GPU inventory and usage through DXGI and PDH, and available temperatures through ACPI, WDDM, and storage drivers. macOS uses available system temperature sensors. Unavailable readings remain empty.

The desktop app handles hardware brightness in Rust. Windows uses WMI and DXVA2. macOS uses DisplayServices, IOKit, and DDC/CI where the display supports it.
:::

## Overview

The plugin system includes Windows native helpers and an independent macOS media helper.

| Plugin | Package | Purpose |
|--------|---------|---------|
| **Processes Attacker** | `@eisland/windows-processes-attacker` | Terminate processes by name or PID |
| **SMTC Helper** | `@eisland/windows-smtc-helper` | System Media Transport Controls (play, pause, next, previous, status) |
| **macOS Media Helper** | `eisland-macos-media-helper` | Current-source metadata, artwork, timeline, events, and asynchronous playback commands |
| **Bluetooth Helper** | `@eisland/windows-bluetooth-helper` | Bluetooth device enumeration and real-time connection monitoring |
| **Power Helper** | `@eisland/windows-power-helper` | Battery status and power event monitoring |
| **WiFi Helper** | `@eisland/windows-wifi-helper` | WiFi connection status and event monitoring |
| **Toast Listener** | `@eisland/windows-toast-listener` | Windows toast notification listening and suppression |

**Architecture Categories:**

| Category | Plugins | Build System | Runtime |
|----------|---------|-------------|---------|
| **C + N-API** | Processes Attacker | `node-gyp` | Native `.node` addon loaded by Node.js |
| **C# NativeAOT + koffi FFI** | SMTC, Bluetooth, Power, WiFi | `dotnet publish` (NativeAOT) | Self-contained DLL loaded via koffi |
| **C++ + N-API** | Toast Listener | `node-gyp` | Native `.node` addon loaded by Node.js |
| **Swift + C / Node-API** | macOS Media Helper | `xcrun clang` + `swiftc` via `scripts/build.mjs` | `.node` + Swift `.dylib` + framework loaded through system Perl |

**Common Characteristics:**

- **Platform**: Windows helpers use `"os": ["win32"]`; macOS helpers use `"os": ["darwin"]` with separate arm64 and x64 prebuilds.
- **License**: GPL-3.0
- **TypeScript**: `.d.ts` type declarations provided

## Build System

### Node-Gyp Configuration

Each plugin uses a `binding.gyp` file to define compilation targets:

```json
{
  "targets": [
    {
      "target_name": "eisland_windows_processes_attacker",
      "sources": ["src/processes_attacker.c", "src/string_utils.c", "src/process_ops.c", "src/napi_helpers.c", "src/napi_binding.c"],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "libraries": ["kernel32.lib"]
    }
  ]
}
```

**Build Commands:**

```bash
node-gyp rebuild    # Clean + configure + compile
node-gyp clean      # Remove build artifacts
```

**Output**: `build/Release/{module_name}.node` — a native DLL loaded by Node.js at runtime.

### N-API Version

All plugins target **NAPI_VERSION=8**, providing:

- Stable ABI across Node.js versions (no recompilation needed on Node upgrades)
- `napi_create_int32`, `napi_create_double`, `napi_create_string_utf16` — typed value creation
- `napi_define_properties` — module export registration
- `NAPI_MODULE` macro — automatic module initialization

### Win32 Libraries Used

| Plugin | Libraries | Purpose |
|--------|-----------|---------|
| **Processes Attacker** | `kernel32.lib` | Process enumeration (`CreateToolhelp32Snapshot`), termination (`TerminateProcess`) |

## Plugin: Windows Processes Attacker

### Package

```
@eisland/windows-processes-attacker
```

### Purpose

:::danger
Provides the ability to terminate Windows processes by name or process ID. Used by the eIsland AI agent's `win.close` tool and the `hide-process` IPC domain. This plugin has high-risk operation permissions — use with caution.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer                                           │
│  closeProcess(target) / closeProcesses(targets[])           │
└──────────────────────────┬──────────────────────────────────┘
                           │ N-API
┌──────────────────────────▼──────────────────────────────────┐
│  napi_binding.c                                             │
│  Argument parsing: string → name target, number → PID target│
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  process_ops.c                                              │
│  CreateToolhelp32Snapshot → Process32FirstW/NextW           │
│  → OpenProcess → TerminateProcess                           │
└─────────────────────────────────────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `closeProcess` | `(target: string \| number) → ProcessCloseResult` | Terminate all processes matching a single target |
| `closeProcesses` | `(targets: (string \| number)[]) → ProcessCloseResult[]` | Terminate processes for each target in an array |

### Target Types

| Input Type | Matching Strategy | Example |
|------------|-------------------|---------|
| `string` | Process name (case-insensitive, auto-appends `.exe`) | `"notepad"`, `"chrome.exe"` |
| `number` | Process ID (exact match) | `12345` |

### Result Structure

```ts
interface ProcessCloseResult {
  target: string | number;       // Original target
  matchedCount: number;          // Processes found matching target
  terminatedCount: number;       // Successfully terminated
  failedCount: number;           // Failed to terminate
  failures: ProcessFailure[];    // Details of failures
}

interface ProcessFailure {
  pid: number;                   // Process ID
  name: string;                  // Process name
  errorCode: number;             // Win32 error code
}
```

### Key Implementation Details

**Process Enumeration:**

```c
bool close_matching_processes(const ProcessTarget* target, ProcessCloseResult* result) {
  HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
  PROCESSENTRY32W entry;
  entry.dwSize = sizeof(PROCESSENTRY32W);

  Process32FirstW(snapshot, &entry);
  do {
    if (entry_matches_target(&entry, target)) {
      close_process_by_entry(&entry, result);
    }
  } while (Process32NextW(snapshot, &entry));

  CloseHandle(snapshot);
}
```

**Name Normalization:**

- Automatically appends `.exe` if not present
- Case-insensitive comparison via `_wcsicmp`
- Supports both `"notepad"` and `"notepad.exe"` as input

**Termination:**

- Uses `OpenProcess(PROCESS_TERMINATE, ...)` + `TerminateProcess(handle, 1)`
- Exit code `1` signals termination by eIsland
- Records Win32 error codes for failed terminations

### Source Files

| File | Responsibility |
|------|---------------|
| `processes_attacker.c` | Module entry point, N-API export registration |
| `napi_binding.c` | Argument parsing, JS-to-C type conversion |
| `napi_helpers.c` | JS value creation helpers (objects, arrays, strings) |
| `process_ops.c` | Process enumeration and termination logic |
| `string_utils.c` | Wide-string normalization and matching |
| `types.h` | Shared type definitions (`ProcessTarget`, `ProcessCloseResult`) |

## Native Fullscreen Detection

Fullscreen auto-hide runs directly in Rust: `features/windowing/auto_hide.rs` calls `infrastructure/platform/fullscreen`. Windows uses Win32/DWM with a 2-pixel edge tolerance. macOS compares CoreGraphics onscreen window and display bounds in logical coordinates. Neither platform needs the retired Node.js addon.

## Plugin: Windows Bluetooth Helper

### Package

```
@eisland/windows-bluetooth-helper
```

### Purpose

Provides Bluetooth device enumeration and real-time connection state monitoring. Used by eIsland to detect paired/connected Bluetooth devices (headphones, speakers, etc.) and respond to connection/disconnection events.

:::info
Like the SMTC Helper, this plugin uses the **koffi FFI + .NET Native AOT DLL** architecture. It wraps the `Windows.Devices.Bluetooth` and `Windows.Devices.Enumeration` WinRT APIs.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + bluetooth-monitor.js + ffi)   │
│  Queries: getPairedDevices / getConnectedDevices / ...      │
│  Monitor: BluetoothMonitor (EventEmitter) via koffi FFI     │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandBluetoothCtypes.dll (NativeAOT)                     │
│  .NET 10 + Windows.Devices.Bluetooth                        │
├─────────────────────────────────────────────────────────────┤
│  BtExports.cs            — C-style exported functions       │
│  BluetoothController.cs  — Device enumeration & queries     │
│  BluetoothDeviceMonitor.cs — DeviceWatcher + ConnectionStatus│
│  BtJsonContext.cs        — Source-generated JSON serialization│
│  Snapshots.cs            — Data models                      │
└─────────────────────────────────────────────────────────────┘
```

:::tip
The plugin uses **two DeviceWatchers** (classic Bluetooth + BLE) to cover all device types. Connection state changes are tracked via `BluetoothDevice.ConnectionStatusChanged` events, not just DeviceWatcher enumeration events.
:::

### Exported Functions

#### Queries

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPairedDevices` | `() → BluetoothDeviceInfo[]` | All paired Bluetooth devices |
| `getConnectedDevices` | `() → BluetoothDeviceInfo[]` | Currently connected devices |
| `getAllDevices` | `() → BluetoothDeviceInfo[]` | All visible devices (paired + nearby BLE) |
| `getDevice` | `(deviceId: string) → BluetoothDeviceInfo \| null` | Single device snapshot by ID |

#### BluetoothMonitor

| Export | Type | Description |
|--------|------|-------------|
| `BluetoothMonitor` | `class extends EventEmitter` | Real-time Bluetooth device monitor |

**Events:**

| Event | Callback | Description |
|-------|----------|-------------|
| `device-added` | `(device: BluetoothDeviceInfo) => void` | New device discovered |
| `device-removed` | `(deviceId: string) => void` | Device no longer visible |
| `device-connected` | `(device: BluetoothDeviceInfo) => void` | Device connected |
| `device-disconnected` | `(deviceId: string) => void` | Device disconnected |
| `device-updated` | `(device: BluetoothDeviceInfo) => void` | Device properties changed |

### Result Structure

```ts
interface BluetoothDeviceInfo {
  deviceId: string;              // Windows DeviceInformation ID
  name: string | null;           // Device friendly name
  bluetoothAddress: string | null; // MAC address as hex string
  isConnected: boolean;          // Currently connected
  isPaired: boolean;             // Paired with this PC
  signalStrength: number | null; // RSSI in dBm
  deviceClass: number | null;    // Class of Device (CoD)
  appearance: number | null;     // BLE appearance category
  serviceUuids: string[];        // GATT service UUIDs
}
```

### Key Implementation Details

**Device Discovery:**

The plugin uses `BluetoothDevice.GetDeviceSelector()` and `BluetoothLEDevice.GetDeviceSelector()` to get the correct AQS filter strings, then creates two `DeviceWatcher` instances to cover both classic and BLE devices:

```csharp
// Classic Bluetooth watcher
_classicWatcher = DeviceInformation.CreateWatcher(BluetoothController.GetClassicSelector());

// BLE watcher
_bleWatcher = DeviceInformation.CreateWatcher(BluetoothController.GetBleSelector());
```

:::warning
Hardcoded AQS filters like `System.Devices.Aep.ProtocolId:="{e0cbf06c-...}"` do **not** work reliably. Always use the WinRT selector methods.
:::

**Connection Status Monitoring:**

`DeviceWatcher` only reports enumeration changes (device appeared/disappeared). Connection state changes require subscribing to `BluetoothDevice.ConnectionStatusChanged`:

```csharp
var bt = BluetoothDevice.FromIdAsync(deviceId).GetAwaiter().GetResult();
bt.ConnectionStatusChanged += (_, _) =>
{
    RefreshDeviceJson(deviceId);
    SignalChange();
};
```

**NativeAOT Property Limitation:**

In NativeAOT, `string[]` and `List<string>` cannot be converted to WinRT `IIterable<string>`. The plugin works around this by not passing `additionalProperties` to `FindAllAsync`, and instead enriching device data via `BluetoothDevice.FromIdAsync()`.

### Source Files

| File | Responsibility |
|------|---------------|
| `src/Snapshots.cs` | `BluetoothDeviceInfo` data model |
| `src/BluetoothController.cs` | Device enumeration, `GetDeviceSelector()`, `BuildDeviceInfo()` |
| `src/BluetoothDeviceMonitor.cs` | Dual `DeviceWatcher` engine + `ConnectionStatusChanged` subscriptions |
| `bt-ctypes/BtExports.cs` | C-style exported functions for koffi FFI |
| `bt-ctypes/BtJsonContext.cs` | JSON source generator for NativeAOT serialization |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `bluetooth-monitor.js` | `BluetoothMonitor` EventEmitter — wraps DLL monitoring into Node.js events |
| `index.js` | Public API — exports queries + `BluetoothMonitor` |

### Build

```bash
cd plugins/windows/eisland-windows-bluetooth-helper
npm run build          # dotnet build src/eIslandBluetoothHelper.csproj
npm run build:ctypes   # dotnet publish bt-ctypes/... (NativeAOT DLL)
npm run build:all      # Both
```

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL — no runtime needed on client) |
| **Windows 10 SDK** | 10.0.19041.0+ | WinRT API projections for `Windows.Devices.Bluetooth` |
| **koffi** | ^2.9.1 | FFI library for calling DLL from Node.js |

:::tip Self-Contained Deployment
All .NET Native AOT DLLs (Bluetooth, Power, WiFi, SMTC) are built with `<SelfContained>true</SelfContained>` and `<StaticICU>true</StaticICU>`. Client machines do **not** need the .NET runtime installed.
:::

### Performance

| Metric | Value |
|--------|-------|
| Query latency | ~10–50ms (WinRT `FindAllAsync` + `FromIdAsync`) |
| Monitor startup | ~100ms (two `DeviceWatcher.Start()` calls) |
| Event detection | Event-driven (zero polling) |
| Memory | Single DLL loaded once; ~5MB resident |

### Exported C Functions (ctypes DLL)

| Function | Signature | Description |
|----------|-----------|-------------|
| `bt_free_string` | `(void*) → void` | Free a CoTaskMem-allocated string |
| `bt_get_last_error` | `() → char*` | Get last error message |
| `bt_get_paired_devices` | `() → char*` | JSON array of paired devices |
| `bt_get_connected_devices` | `() → char*` | JSON array of connected devices |
| `bt_get_all_devices` | `() → char*` | JSON array of all visible devices |
| `bt_get_device` | `(char* id) → char*` | JSON object of single device |
| `bt_start_monitoring` | `() → int` | Start device watcher. 0=success |
| `bt_stop_monitoring` | `() → int` | Stop watcher. 0=success |
| `bt_wait_for_changes` | `(int timeoutMs) → int` | Block until change. 0=changed, 1=timeout |
| `bt_get_changes_count` | `() → int` | Read change counter (atomic) |
| `bt_get_monitored_devices` | `() → char*` | JSON array from watcher cache |
| `bt_get_monitored_device` | `(char* id) → char*` | JSON object from watcher cache |

:::danger
You **must** call `bt_free_string()` on any pointer returned by `bt_get_*` functions to avoid memory leaks. The koffi FFI layer in Node.js handles this automatically.
:::

## Plugin: Windows Power Helper

### Package

```
@eisland/windows-power-helper
```

### Purpose

Provides real-time battery status and power event monitoring. Used by eIsland to display battery level, detect AC power connection/disconnection, and respond to low battery conditions. Works on both laptops (with battery) and desktops (no battery).

:::info
This plugin follows the same **koffi FFI + .NET Native AOT DLL** architecture as the Bluetooth Helper. It wraps the `Windows.System.Power.PowerManager` WinRT API.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + power-monitor.js + ffi)       │
│  Query: getPowerInfo()                                      │
│  Monitor: PowerMonitor (EventEmitter) via koffi FFI         │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandPowerCtypes.dll (NativeAOT)                         │
│  .NET 10 + Windows.System.Power.PowerManager                │
├─────────────────────────────────────────────────────────────┤
│  PwExports.cs          — C-style exported functions         │
│  PowerController.cs    — Power status queries               │
│  PowerMonitor.cs       — PowerManager event subscriptions   │
│  PwJsonContext.cs      — Source-generated JSON serialization│
│  PowerInfo.cs          — Data model                         |
└─────────────────────────────────────────────────────────────┘
```

:::tip
The `PowerManager` class is entirely static — no instance creation needed. All properties and events are accessed directly via `PowerManager.RemainingChargePercent`, `PowerManager.BatteryStatusChanged`, etc.
:::

### Exported Functions

#### Queries

| Function | Signature | Description |
|----------|-----------|-------------|
| `getPowerInfo` | `() → PowerInfo \| null` | Current power status snapshot |

#### PowerMonitor

| Export | Type | Description |
|--------|------|-------------|
| `PowerMonitor` | `class extends EventEmitter` | Real-time power status monitor |

**Events:**

| Event | Callback | Description |
|-------|----------|-------------|
| `ac-connected` | `(info: PowerInfo) => void` | AC power connected |
| `ac-disconnected` | `(info: PowerInfo) => void` | AC power disconnected (running on battery) |
| `battery-low` | `(info: PowerInfo) => void` | Battery level dropped to 15% or below |
| `charging` | `(info: PowerInfo) => void` | Started charging |
| `discharging` | `(info: PowerInfo) => void` | Stopped charging (unplugged or fully charged) |
| `power-changed` | `(info: PowerInfo) => void` | Any power status change (generic event) |

### Result Structure

```ts
interface PowerInfo {
  remainingChargePercent: number;  // 0-100, or 100 on desktops with no battery
  batteryStatus: number;           // 0=NotPresent, 1=Discharging, 2=Idle, 3=Charging
  powerSupplyStatus: number;       // 0=NotPresent, 1=Adequate, 2=Inadequate, 3=Unknown
  energySaverStatus: number;       // 0=Disabled, 1=Off, 2=On
  hasBattery: boolean;             // false on desktops
  isCharging: boolean;             // true when batteryStatus is Charging
  isOnAcPower: boolean;            // true when batteryStatus is not Discharging
}
```

:::important
On desktops without a battery, `hasBattery` is `false`, `batteryStatus` is `0` (NotPresent), and `remainingChargePercent` is `100`. The `isOnAcPower` field uses `batteryStatus != Discharging` rather than `powerSupplyStatus` to correctly handle cases where the power supply is "Inadequate" (e.g., a low-wattage charger still provides AC power).
:::

### Key Implementation Details

**PowerManager API:**

The plugin uses the WinRT `Windows.System.Power.PowerManager` static class. All properties are read-only and event-driven:

```csharp
var batteryStatus = (int)PowerManager.BatteryStatus;
var remainingChargePercent = PowerManager.RemainingChargePercent;
var energySaverStatus = (int)PowerManager.EnergySaverStatus;
```

**Event Subscriptions:**

The monitor subscribes to four `PowerManager` events. Event handler references are stored to prevent GC collection and enable clean unsubscription:

```csharp
PowerManager.RemainingChargePercentChanged += _chargePercentHandler;
PowerManager.BatteryStatusChanged += _batteryStatusHandler;
PowerManager.PowerSupplyStatusChanged += _powerSupplyHandler;
PowerManager.EnergySaverStatusChanged += _energySaverHandler;
```

:::note
Unlike the Bluetooth Helper which requires STA threads for WinRT COM, the `PowerManager` API works directly on any thread. No `RunOnSTAThread` wrapper is needed.
:::

**Low Battery Detection:**

The JavaScript layer implements low battery detection by comparing current and previous states. The threshold is 15% — the `battery-low` event fires only when the percentage crosses below this threshold while on battery power (not charging).

### Source Files

| File | Responsibility |
|------|---------------|
| `src/PowerInfo.cs` | `PowerInfo` data model |
| `src/PowerController.cs` | Power status queries via `PowerManager` |
| `src/PowerMonitor.cs` | `PowerManager` event subscriptions + Win32 event signaling |
| `pw-ctypes/PwExports.cs` | C-style exported functions for koffi FFI |
| `pw-ctypes/PwJsonContext.cs` | JSON source generator for NativeAOT serialization |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `power-monitor.js` | `PowerMonitor` EventEmitter — wraps DLL monitoring into Node.js events |
| `index.js` | Public API — exports `getPowerInfo()` + `PowerMonitor` |

### Build

```bash
cd plugins/windows/eisland-windows-power-helper
npm run build          # dotnet build src/eIslandPowerHelper.csproj
npm run build:ctypes   # dotnet publish pw-ctypes/... (NativeAOT DLL)
npm run build:all      # Both
```

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL — no runtime needed on client) |
| **Windows 10 SDK** | 10.0.19041.0+ | WinRT API projections for `Windows.System.Power` |
| **koffi** | ^2.9.1 | FFI library for calling DLL from Node.js |

### Performance

| Metric | Value |
|--------|-------|
| Query latency | ~1ms (in-memory `PowerManager` property reads) |
| Monitor startup | ~5ms (event subscription only, no watcher) |
| Event detection | Event-driven (zero polling) |
| Memory | Single DLL loaded once; ~4MB resident |

### Exported C Functions (ctypes DLL)

| Function | Signature | Description |
|----------|-----------|-------------|
| `pw_free_string` | `(void*) → void` | Free a CoTaskMem-allocated string |
| `pw_get_last_error` | `() → char*` | Get last error message |
| `pw_get_power_info` | `() → char*` | JSON object of current power status |
| `pw_start_monitoring` | `() → int` | Start power monitoring. 0=success |
| `pw_stop_monitoring` | `() → int` | Stop monitoring. 0=success |
| `pw_wait_for_changes` | `(int timeoutMs) → int` | Block until change. 0=changed, 1=timeout |
| `pw_get_changes_count` | `() → int` | Read change counter (atomic) |
| `pw_get_monitored_power_info` | `() → char*` | JSON object of latest monitored power status |

:::danger
You **must** call `pw_free_string()` on any pointer returned by `pw_get_*` functions to avoid memory leaks. The koffi FFI layer in Node.js handles this automatically.
:::

## Plugin: Windows WiFi Helper

### Package

```
@eisland/windows-wifi-helper
```

### Purpose

Provides real-time WiFi connection status monitoring. Used by eIsland to detect WiFi connect/disconnect events, track SSID changes, and monitor signal strength. Works on both WiFi-connected laptops and desktops using Ethernet (reports non-WiFi connections with `isWifiAdapter: false`).

:::info
This plugin follows the same **koffi FFI + .NET Native AOT DLL** architecture as the Bluetooth and Power Helpers. It wraps the `Windows.Networking.Connectivity.NetworkInformation` WinRT API.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + wifi-monitor.js + ffi)        │
│  Query: getWifiInfo()                                       │
│  Monitor: WifiMonitor (EventEmitter) via koffi FFI          │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandWifiCtypes.dll (NativeAOT)                          │
│  .NET 10 + Windows.Networking.Connectivity                  │
├─────────────────────────────────────────────────────────────┤
│  WfExports.cs          — C-style exported functions         │
│  WifiController.cs     — Connection profile queries         │
│  WifiMonitor.cs        — NetworkStatusChanged subscriptions │
│  WfJsonContext.cs      — Source-generated JSON serialization│
│  WifiInfo.cs           — Data model                         │
└─────────────────────────────────────────────────────────────┘
```

:::tip
The plugin uses `NetworkInformation.NetworkStatusChanged` — a single event subscription that covers all network changes. WiFi-specific filtering is done by checking `NetworkAdapter.IanaInterfaceType == 71` (WiFi).
:::

### Exported Functions

#### Queries

| Function | Signature | Description |
|----------|-----------|-------------|
| `getWifiInfo` | `() → WifiInfo \| null` | Current WiFi connection status snapshot |

#### WifiMonitor

| Export | Type | Description |
|--------|------|-------------|
| `WifiMonitor` | `class extends EventEmitter` | Real-time WiFi status monitor |

**Events:**

| Event | Callback | Description |
|-------|----------|-------------|
| `wifi-connected` | `(info: WifiInfo) => void` | WiFi connected |
| `wifi-disconnected` | `(info: WifiInfo) => void` | WiFi disconnected |
| `ssid-changed` | `(info: WifiInfo) => void` | SSID changed (network switch) |
| `signal-changed` | `(info: WifiInfo) => void` | Signal strength changed |
| `wifi-changed` | `(info: WifiInfo) => void` | Any WiFi status change (generic event) |

### Result Structure

```ts
interface WifiInfo {
  isConnected: boolean;          // Whether connected to a network
  ssid: string | null;           // WiFi network name, null if not connected or not WiFi
  signalBars: number;            // 0-5 bars, -1 if unavailable
  connectivityLevel: number;     // 0=None, 1=LocalAccess, 2=ConstrainedInternet, 3=InternetAccess
  adapterName: string | null;    // Network adapter GUID, null if no adapter
  isWifiAdapter: boolean;        // true if adapter is WiFi (IANA type 71)
}
```

:::important
When connected via Ethernet (not WiFi), `isWifiAdapter` is `false` and `ssid` is `null`. The `isConnected` and `connectivityLevel` fields still reflect the Ethernet connection state. This allows the plugin to be useful on desktop machines without WiFi hardware.
:::

### Key Implementation Details

**NetworkInformation API:**

The plugin uses `NetworkInformation.GetInternetConnectionProfile()` to get the active connection profile, then inspects the `NetworkAdapter` to determine if it is WiFi:

```csharp
var profile = NetworkInformation.GetInternetConnectionProfile();
var adapter = profile.NetworkAdapter;
var isWifi = adapter?.IanaInterfaceType == 71;
var connectivityLevel = (int)profile.GetNetworkConnectivityLevel();
```

**Event Subscription:**

A single `NetworkStatusChanged` event covers all network state changes. The JavaScript layer diffs previous and current state to emit specific events:

```csharp
NetworkInformation.NetworkStatusChanged += _statusChangedHandler;
```

:::note
Like the Power Helper, the `NetworkInformation` API works directly on any thread — no STA thread wrapper is needed. This simplifies the monitor implementation compared to the Bluetooth Helper.
:::

**SSID Extraction:**

The SSID is extracted via `ConnectionProfile.WlanConnectionProfileDetails.GetConnectedSsid()`. This method is only available for WiFi connections; for Ethernet or other adapters, it returns `null`.

### Source Files

| File | Responsibility |
|------|---------------|
| `src/WifiInfo.cs` | `WifiInfo` data model |
| `src/WifiController.cs` | Connection profile queries via `NetworkInformation` |
| `src/WifiMonitor.cs` | `NetworkStatusChanged` event subscription + Win32 event signaling |
| `wf-ctypes/WfExports.cs` | C-style exported functions for koffi FFI |
| `wf-ctypes/WfJsonContext.cs` | JSON source generator for NativeAOT serialization |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `wifi-monitor.js` | `WifiMonitor` EventEmitter — wraps DLL monitoring into Node.js events |
| `index.js` | Public API — exports `getWifiInfo()` + `WifiMonitor` |

### Build

```bash
cd plugins/windows/eisland-windows-wifi-helper
npm run build          # dotnet build src/eIslandWifiHelper.csproj
npm run build:ctypes   # dotnet publish wf-ctypes/... (NativeAOT DLL)
npm run build:all      # Both
```

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL — no runtime needed on client) |
| **Windows 10 SDK** | 10.0.19041.0+ | WinRT API projections for `Windows.Networking.Connectivity` |
| **koffi** | ^2.9.1 | FFI library for calling DLL from Node.js |

### Performance

| Metric | Value |
|--------|-------|
| Query latency | ~1ms (in-memory `NetworkInformation` profile reads) |
| Monitor startup | ~5ms (single event subscription) |
| Event detection | Event-driven (zero polling) |
| Memory | Single DLL loaded once; ~4MB resident |

### Exported C Functions (ctypes DLL)

| Function | Signature | Description |
|----------|-----------|-------------|
| `wf_free_string` | `(void*) → void` | Free a CoTaskMem-allocated string |
| `wf_get_last_error` | `() → char*` | Get last error message |
| `wf_get_wifi_info` | `() → char*` | JSON object of current WiFi status |
| `wf_start_monitoring` | `() → int` | Start WiFi monitoring. 0=success |
| `wf_stop_monitoring` | `() → int` | Stop monitoring. 0=success |
| `wf_wait_for_changes` | `(int timeoutMs) → int` | Block until change. 0=changed, 1=timeout |
| `wf_get_changes_count` | `() → int` | Read change counter (atomic) |
| `wf_get_monitored_wifi_info` | `() → char*` | JSON object of latest monitored WiFi status |

:::danger
You **must** call `wf_free_string()` on any pointer returned by `wf_get_*` functions to avoid memory leaks. The koffi FFI layer in Node.js handles this automatically.
:::

## Plugin: Windows Toast Listener

### Package

```
@eisland/windows-toast-listener
```

### Purpose

Provides Windows toast notification listening and suppression capabilities. Used by eIsland to monitor notification center changes in real-time and optionally suppress (hide) toast notifications from other applications.

:::info
This plugin is a **C++ N-API native addon** that wraps the Windows `Windows.UI.Notifications` WinRT APIs via COM interop. Unlike the .NET-based plugins, it compiles to a standard `.node` binary loaded directly by Node.js.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js)                                │
│  Queries: getNotifications() / getAccessStatus()            │
│  Monitor: startListening(callback) / stopListening()        │
│  Suppression: enableSuppression() / disableSuppression()    │
└──────────────────────────┬──────────────────────────────────┘
                           │ N-API
┌──────────────────────────▼──────────────────────────────────┐
│  windows_toast_listener.cpp                                 │
│  N-API binding + WinRT COM interop                          │
├─────────────────────────────────────────────────────────────┤
│  ToastManager         — Notification enumeration & access   │
│  ToastListener        — Event-driven notification watcher   │
│  ToastSuppression     — Toast popup suppression             │
└─────────────────────────────────────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `requestAccess` | `() → ToastAccessStatus` | Request access to user notifications |
| `getAccessStatus` | `() → ToastAccessStatus` | Check current notification access status |
| `getNotifications` | `() → ToastNotificationSnapshot[]` | Get all current toast notifications |
| `startListening` | `(callback) → boolean` | Start listening for notification changes |
| `stopListening` | `() → boolean` | Stop listening for notification changes |
| `isListening` | `() → boolean` | Check if currently listening |
| `enableSuppression` | `() → boolean` | Enable toast popup suppression |
| `disableSuppression` | `() → boolean` | Disable toast popup suppression |
| `isSuppressionEnabled` | `() → boolean` | Check if suppression is enabled |

### Result Structures

```ts
type ToastAccessStatus = 'unspecified' | 'allowed' | 'denied' | 'unknown';
type ToastNotificationChangeKind = 'added' | 'removed' | 'unknown';

interface ToastNotificationChangedEvent {
  kind: ToastNotificationChangeKind;
  notificationId: number;
}

interface ToastNotificationSnapshot {
  id: number;
  appUserModelId: string;
  appDisplayName: string;
  title: string;
  body: string;
  texts: string[];
  createdAt: number;
}
```

### Source Files

| File | Responsibility |
|------|---------------|
| `src/windows_toast_listener.cpp` | N-API binding, WinRT COM interop, toast enumeration and monitoring |
| `binding.gyp` | Build configuration — links `runtimeobject.lib` |
| `index.js` | Public API — exports all functions |
| `index.d.ts` | TypeScript type declarations |

## Desktop screenshots

The Rust desktop uses Win32 GDI on Windows and automatically retries with xcap in compatibility mode when GDI fails. macOS 14 and later use ScreenCaptureKit with Screen Recording permission. Earlier macOS versions use the xcap compatibility path. The application encodes the primary display and region captures as PNG and preserves the desktop layout across monitors.

## Testing

### Test Framework

Plugins with tests use **Vitest** with the following configuration:

```ts
// vitest.config.mts
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

### Test Commands

```bash
# Run unit tests
npm test

# Run smoke tests (manual verification)
npm run smoke
npm run smoke:polling
```

### Testing Patterns

**Shape Validation Tests:**

Tests verify that exported functions return objects with the correct structure and types:

```ts
it('returns CPU snapshot shape after baseline warmup', () => {
  monitor.getCpu();  // First call: baseline
  const cpu = monitor.getCpu();  // Second call: has delta

  expect(cpu.usagePercent).toBeTypeOf('number');
  expect(cpu.hasBaseline).toBe(true);
  expect(cpu.usagePercent).toBeGreaterThanOrEqual(0);
  expect(cpu.usagePercent).toBeLessThanOrEqual(100);
});
```

Fullscreen detection is covered by Rust boundary tests and native Win32 window-state tests, including untitled windows, hidden/minimized/tool windows, and the application's own process.

### Test Coverage by Plugin

| Plugin | Test Files | Test Types |
|--------|------------|------------|
| **Processes Attacker** | _(manual testing)_ | — |
| **SMTC Helper** | `smtc-helper.test.ts`, `smtc-helper.play.test.ts`, `smtc-helper.pause.test.ts`, `smtc-helper.next.test.ts`, `smtc-helper.previous.test.ts`, `smtc-helper.timestamp.test.ts` | Shape validation, export verification, command tests |
| **Bluetooth Helper** | `bluetooth.test.ts`, `bluetooth.monitor.test.ts` | Shape validation, export verification, monitor state management |
| **Power Helper** | `power.test.ts`, `power.monitor.test.ts` | Shape validation, consistency, monitor tests |
| **WiFi Helper** | `wifi.test.ts`, `wifi.monitor.test.ts` | Shape validation, consistency, monitor tests |
| **Toast Listener** | `windows-toast-listener.test.ts`, `windows-toast-listener.polling.test.ts` | Shape validation, export verification, polling tests |

## Integration with Electron

### Loading Native Plugins

Plugins are loaded in the Electron main process via `require()`:

Fullscreen auto-hide uses the Rust backend described above. Remaining legacy plugin packages expose their own JavaScript entry points.

### IPC Domain Integration

Each plugin's capabilities are exposed to the renderer via IPC handlers:

```ts
// Example: Process close via IPC
registerProcessHandlers({ getMainWindow });

// In the handler:
ipcMain.handle('win.close', async (_event, target) => {
  const result = closeProcess(target);
  return result;
});
```

### Usage in AI Agent Tools

Plugins power several AI agent tools:

| Tool | Plugin | Function Used |
|------|--------|---------------|
| `win.close` | Processes Attacker | `closeProcess(target)` |
| `win.list` | None (Rust backend, `features/agent/system_tools.rs`) | `system:open-windows:with-icons:get`, with an optional `filter` matched against process name and title |

## Performance Characteristics

:::tip
Performance characteristics and optimization recommendations for each plugin:
:::

| Plugin | Call Latency | Notes |
|--------|-------------|-------|
| **Processes Attacker** | ~1–5ms | Snapshot-based enumeration, single `TerminateProcess` call per match |
| **SMTC Helper** | ~50–200ms | Spawns a .NET process; WinRT session manager + media property reads |
| **SMTC Helper (FFI)** | ~1–5ms | Direct DLL call via koffi FFI; no process spawn |
| **Bluetooth Helper** | ~10–50ms | WinRT `FindAllAsync` + `FromIdAsync`; event-driven monitoring |
| **Power Helper** | ~1ms | In-memory `PowerManager` property reads; event-driven monitoring |
| **WiFi Helper** | ~1ms | In-memory `NetworkInformation` profile reads; event-driven monitoring |
| **Toast Listener** | ~1–3ms | WinRT COM interop; event-driven monitoring |

**Optimization Notes:**

- CPU and memory snapshots are nearly zero-cost — suitable for polling at 1-second intervals
- The fullscreen detector avoids COM/WMI — pure Win32 window API calls
- SMTC commands are direct DLL calls (~1-5ms via koffi FFI); monitoring is event-driven (zero polling)
- Power and WiFi helpers use in-memory WinRT property reads (~1ms) — suitable for frequent polling
- Application icon queries are fast (~5-20ms) but should be cached to avoid repeated Shell32 calls

## Plugin: Windows SMTC Helper

### Package

```
@eisland/windows-smtc-helper
```

### Purpose

Provides control over Windows System Media Transport Controls (SMTC) — the standard media playback interface that appears in the Windows notification center and on the lock screen. Used by eIsland to display and control currently playing media from any source (Spotify, QQ Music, Chrome, etc.).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + smtc-monitor.js + ffi-loader) │
│  Commands: play / pause / next / previous / seek / stop ... │
│  Monitor:  SmtcMonitor (EventEmitter) via koffi FFI         │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandSmtcCtypes.dll (NativeAOT)                          │
│  .NET 10 + Windows.Media.Control                            │
├─────────────────────────────────────────────────────────────┤
│  SmtcExports.cs        — C-style exported functions         │
│  SmtcController.cs     — Command execution (play/pause/…)   │
│  SmtcSessionMonitor.cs — Event-driven session monitoring    │
│  SmtcJsonContext.cs    — Source-generated JSON serialization│
│  Snapshots.cs          — Data models                        │
└─────────────────────────────────────────────────────────────┘
        ▲                           ▲
        │                           │
  ┌─────┴──────┐            ┌───────┴────────┐
  │  Node.js   │            │ Python / C /   │
  │  (koffi)   │            │ any FFI lang   │
  └────────────┘            └────────────────┘
```

:::info
Unlike other plugins that use C + N-API, the SMTC Helper is a **pure C# .NET application** compiled as a NativeAOT DLL. Node.js accesses it via **koffi** (a zero-compile FFI library), eliminating native addon build issues. The DLL also works from Python ctypes or any language with C FFI support.
:::

:::tip
The plugin provides two integration modes:

1. **Commands** — synchronous function calls (`play`, `pause`, `seek`, etc.) for media control
2. **Monitor** — event-driven session tracking (`SmtcMonitor` class) for real-time state updates, replacing the need for a separate monitoring package
:::

### Exported Functions

#### Commands

| Function | Signature | Description |
|----------|-----------|-------------|
| `play` | `() → CommandResult` | Resume playback of the current media session |
| `pause` | `() → CommandResult` | Pause the current media session |
| `next` | `() → CommandResult` | Skip to the next track |
| `previous` | `() → CommandResult` | Skip to the previous track |
| `getStatus` | `() → MediaStatus` | Get the full snapshot of the current media session |
| `getTimestamp` | `() → TimestampInfo` | Lightweight playback timestamp (no media metadata), optimized for lyrics calibration |
| `seek` | `(seconds: number) → CommandResult` | Seek to a position in seconds |
| `stop` | `() → CommandResult` | Stop playback |
| `setShuffle` | `(active: boolean) → CommandResult` | Toggle shuffle mode |
| `setRepeatMode` | `(mode: number) → CommandResult` | Set repeat mode (0=None, 1=Track, 2=List) |
| `setPlaybackRate` | `(rate: number) → CommandResult` | Set playback rate (1.0 = normal) |

#### SmtcMonitor

| Export | Type | Description |
|--------|------|-------------|
| `SmtcMonitor` | `class extends EventEmitter` | Real-time SMTC session monitor |

**Events** (compatible with `@coooookies/windows-smtc-monitor`):

| Event | Callback | Description |
|-------|----------|-------------|
| `session-added` | `(sourceAppId: string, media: MediaProps) => void` | New media session detected |
| `session-removed` | `(sourceAppId: string) => void` | Media session closed |
| `session-media-changed` | `(sourceAppId: string, media: MediaProps) => void` | Track metadata changed |
| `session-playback-changed` | `(sourceAppId: string, playback: PlaybackInfo) => void` | Play/pause/stop state changed |
| `session-timeline-changed` | `(sourceAppId: string, timeline: TimelineProps) => void` | Playback position updated |

### MediaStatus

```ts
interface MediaStatus {
  isAvailable: boolean;
  title: string | null;
  artist: string | null;
  albumTitle: string | null;
  albumArtist: string | null;
  trackNumber: number | null;
  genres: string[] | null;
  playbackStatus: 'playing' | 'paused' | 'stopped' | 'closed' | 'opened' | 'changing' | 'unknown';
  isShuffleActive: boolean | null;
  repeatMode: number | null;
  playbackRate: number | null;
  sourceAppUserModelId: string | null;
  thumbnail: string | null;               // data:image/jpeg;base64,...
  timeline: TimelineProperties | null;
  controls: PlaybackControls | null;
}

interface TimelineProperties {
  startTime: number;       // seconds
  endTime: number;         // seconds
  position: number;        // seconds
  minSeekTime: number;     // seconds
  maxSeekTime: number;     // seconds
}

interface PlaybackControls {
  isPlayEnabled: boolean;
  isPauseEnabled: boolean;
  isNextEnabled: boolean;
  isPreviousEnabled: boolean;
  isStopEnabled: boolean;
  isRecordEnabled: boolean;
  isFastForwardEnabled: boolean;
  isRewindEnabled: boolean;
  isChannelUpEnabled: boolean;
  isChannelDownEnabled: boolean;
}

interface CommandResult {
  success: boolean;
  error: string | null;
}

interface TimestampInfo {
  isAvailable: boolean;
  playbackStatus: 'playing' | 'paused' | 'stopped' | 'closed' | 'opened' | 'changing' | 'unknown';
  timeline: TimelineProperties | null;
}
```

:::tip
`getTimestamp()` is a lightweight alternative to `getStatus()` — it returns only playback status and timeline position without fetching media metadata (title, artist, album art, etc.). This makes it ideal for lyrics calibration where only the playback position is needed.
:::

### C# Implementation

#### SmtcController

The core controller uses `GlobalSystemMediaTransportControlsSessionManager` to access the active media session:

```csharp
public static class SmtcController
{
    private static async Task<GlobalSystemMediaTransportControlsSession?> GetCurrentSessionAsync()
    {
        var manager = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        return manager.GetCurrentSession();
    }

    public static async Task<CommandResult> PlayAsync()
    {
        var session = await GetCurrentSessionAsync();
        if (session == null)
            return CommandResult.Fail("No active media session.");

        var success = await session.TryPlayAsync();
        return success ? CommandResult.Ok : CommandResult.Fail("Play command was rejected.");
    }

    // Pause, Next, Previous follow the same pattern...
}
```

**Key behaviors:**

- `RequestAsync()` acquires the session manager — requires a UI thread or `CoreApplication` context
- `GetCurrentSession()` returns `null` if no app is currently playing media
- `TryPlayAsync()` / `TryPauseAsync()` return `false` if the media source rejects the command
- `SourceAppUserModelId` identifies the media source (e.g., `"QQMusic.exe"`, `"Spotify.exe"`)
- Thumbnail is read as a stream, converted to base64, and returned as a `data:image/jpeg;base64,...` data URI

#### Timeline Properties

Timeline data is read from `session.GetTimelineProperties()` and converted to seconds:

```csharp
var timeline = session.GetTimelineProperties();
var timelineProperties = new TimelineProperties
{
    StartTime = timeline.StartTime.TotalSeconds,
    EndTime = timeline.EndTime.TotalSeconds,
    Position = timeline.Position.TotalSeconds,
    MinSeekTime = timeline.MinSeekTime.TotalSeconds,
    MaxSeekTime = timeline.MaxSeekTime.TotalSeconds,
};
```

:::note
Some media sources (like QQ Music) report `minSeekTime` and `maxSeekTime` as 0, even though seeking works. This is a limitation of the media source's SMTC implementation, not the plugin.
:::

#### Playback Controls

The `PlaybackControls` object reports which transport buttons the media source has enabled:

```csharp
var controls = new PlaybackControls
{
    IsPlayEnabled = playbackInfo.Controls.IsPlayEnabled,
    IsPauseEnabled = playbackInfo.Controls.IsPauseEnabled,
    IsNextEnabled = playbackInfo.Controls.IsNextEnabled,
    IsPreviousEnabled = playbackInfo.Controls.IsPreviousEnabled,
    // ... and so on
};
```

### SmtcMonitor Usage

```typescript
import { SmtcMonitor } from '@eisland/windows-smtc-helper';

const monitor = new SmtcMonitor();

monitor.on('session-added', (sourceAppId, media) => {
  console.log(`Now playing: ${media.title} — ${media.artist}`);
});

monitor.on('session-playback-changed', (sourceAppId, playback) => {
  console.log(`Status: ${playback.playbackStatus}`); // 4=playing, 5=paused
});

monitor.on('session-timeline-changed', (sourceAppId, timeline) => {
  console.log(`Position: ${timeline.position.toFixed(1)}s`);
});

monitor.start();
// ... later
monitor.stop();
```

:::note
The `SmtcMonitor` uses WinRT event callbacks (`MediaPropertiesChanged`, `PlaybackInfoChanged`, `TimelinePropertiesChanged`) for zero-polling real-time updates. Timeline events are throttled to 200ms intervals. The `getMediaSessions()` method returns a synchronous snapshot of all active sessions.
:::

### CLI Modes

| Invocation | Mode | Output |
|------------|------|--------|
| `eIslandSmtcHelper.exe status` | Status (default) | `MediaStatus` JSON |
| `eIslandSmtcHelper.exe play` | Play | `CommandResult` JSON |
| `eIslandSmtcHelper.exe pause` | Pause | `CommandResult` JSON |
| `eIslandSmtcHelper.exe next` | Next | `CommandResult` JSON |
| `eIslandSmtcHelper.exe previous` | Previous | `CommandResult` JSON |
| `eIslandSmtcHelper.exe seek <seconds>` | Seek | `CommandResult` JSON |
| `eIslandSmtcHelper.exe stop` | Stop | `CommandResult` JSON |
| `eIslandSmtcHelper.exe set-shuffle <0|1>` | Shuffle | `CommandResult` JSON |
| `eIslandSmtcHelper.exe set-repeat-mode <0|1|2>` | Repeat | `CommandResult` JSON |
| `eIslandSmtcHelper.exe set-playback-rate <rate>` | Rate | `CommandResult` JSON |

### Source Files

| File | Responsibility |
|------|---------------|
| `src/Program.cs` | CLI entry point, argument parsing, JSON output |
| `src/SmtcController.cs` | SMTC command execution (play, pause, seek, stop, shuffle, repeat, rate) |
| `src/SmtcSessionMonitor.cs` | Event-driven session monitoring engine (WinRT callbacks + Win32 events) |
| `src/Snapshots.cs` | Data models (`MediaStatus`, `CommandResult`, `SessionInfo`, `MediaMetadata`, etc.) |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `smtc-monitor.js` | `SmtcMonitor` EventEmitter — wraps DLL monitoring into Node.js events |
| `index.js` | Public API — exports commands + `SmtcMonitor` |

### Build

```bash
cd plugins/windows/eisland-windows-smtc-helper
npm run build    # Runs: dotnet build src/eIslandSmtcHelper.csproj -c Release
```

Output: `src/bin/Release/net10.0-windows10.0.19041.0/eIslandSmtcHelper.exe`

:::warning
The SMTC helper targets `net10.0-windows10.0.19041.0` to access WinRT APIs. This requires the Windows 10 SDK (10.0.19041.0) or later installed alongside the .NET 10 SDK.
:::

### Dependencies

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0-windows10.0.19041.0</TargetFramework>
  </PropertyGroup>
</Project>
```

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL — no runtime needed on client) |
| **Windows 10 SDK** | 10.0.19041.0+ | WinRT API projections for `Windows.Media.Control` |

:::tip Self-Contained Deployment
The SMTC Helper DLL is built with `<SelfContained>true</SelfContained>` and `<StaticICU>true</StaticICU>`, so all .NET and ICU dependencies are statically linked. Client machines do **not** need the .NET runtime installed.
:::

### Example Output

**getStatus() with QQ Music playing:**

```json
{
  "isAvailable": true,
  "title": "Chasing Gold and Gloory",
  "artist": "Gruup24",
  "albumTitle": "Chasing Gold and Gloory",
  "albumArtist": "",
  "trackNumber": 0,
  "genres": null,
  "playbackStatus": "playing",
  "isShuffleActive": null,
  "repeatMode": null,
  "playbackRate": null,
  "sourceAppUserModelId": "QQMusic.exe",
  "thumbnail": "data:image/jpeg;base64,/9j/4AAQ...",
  "timeline": {
    "startTime": 0,
    "endTime": 229.277,
    "position": 134.091,
    "minSeekTime": 0,
    "maxSeekTime": 0
  },
  "controls": {
    "isPlayEnabled": false,
    "isPauseEnabled": true,
    "isNextEnabled": true,
    "isPreviousEnabled": true,
    "isStopEnabled": false,
    "isRecordEnabled": false,
    "isFastForwardEnabled": false,
    "isRewindEnabled": false,
    "isChannelUpEnabled": false,
    "isChannelDownEnabled": false
  }
}
```

### ctypes DLL (NativeAOT)

The plugin also ships a **NativeAOT-compiled DLL** (`eIslandSmtcCtypes.dll`) that exports C-style functions for use from Python, C, or any language with FFI support.

#### Build

```bash
cd plugins/windows/eisland-windows-smtc-helper
npm run build:ctypes    # dotnet publish smtc-ctypes/eIslandSmtcCtypes.csproj -c Release -r win-x64
```

Output: `smtc-ctypes/bin/Release/net10.0-windows10.0.19041.0/win-x64/publish/eIslandSmtcCtypes.dll`

:::warning
Building the NativeAOT DLL requires `vswhere.exe` in PATH. If the build fails with `'vswhere.exe' is not recognized`, add it:
```bash
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/Installer:$PATH"
```
:::

#### Exported C Functions

**Commands:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `smtc_play` | `() → int` | Play. Returns 0=success, 1=failure |
| `smtc_pause` | `() → int` | Pause. Returns 0=success, 1=failure |
| `smtc_next` | `() → int` | Next track. Returns 0=success, 1=failure |
| `smtc_previous` | `() → int` | Previous track. Returns 0=success, 1=failure |
| `smtc_seek` | `(double seconds) → int` | Seek to position. Returns 0=success |
| `smtc_stop` | `() → int` | Stop playback. Returns 0=success |
| `smtc_set_shuffle` | `(int active) → int` | Set shuffle (0=off, 1=on). Returns 0=success |
| `smtc_set_repeat_mode` | `(int mode) → int` | Set repeat (0=None, 1=Track, 2=List). Returns 0=success |
| `smtc_set_playback_rate` | `(double rate) → int` | Set playback rate. Returns 0=success |
| `smtc_get_status` | `() → char*` | Get status JSON. Returns NULL on failure |
| `smtc_get_timestamp` | `() → char*` | Get lightweight timestamp JSON (no media metadata). Returns NULL on failure |
| `smtc_free_string` | `(char*) → void` | Free a string returned by status/error functions |
| `smtc_get_last_error` | `() → char*` | Get last error message |

**Monitoring:**

| Function | Signature | Description |
|----------|-----------|-------------|
| `smtc_start_monitoring` | `() → int` | Start session monitoring. Returns 0=success |
| `smtc_stop_monitoring` | `() → int` | Stop session monitoring. Returns 0=success |
| `smtc_wait_for_changes` | `(int timeoutMs) → int` | Block until change or timeout. 0=changed, 1=timeout |
| `smtc_get_sessions_changed` | `() → int` | Read change counter (atomic) |
| `smtc_get_all_sessions` | `() → char*` | Get all sessions as JSON array |
| `smtc_get_session` | `(char* appId) → char*` | Get specific session by source app ID |

:::danger
You **must** call `smtc_free_string()` on any pointer returned by `smtc_get_status()`, `smtc_get_timestamp()`, `smtc_get_last_error()`, `smtc_get_all_sessions()`, or `smtc_get_session()` to avoid memory leaks. The koffi FFI layer in Node.js handles this automatically.
:::

#### Python Usage

```python
import ctypes, json

dll = ctypes.CDLL("./eIslandSmtcCtypes.dll")

dll.smtc_get_status.restype = ctypes.c_void_p
dll.smtc_get_timestamp.restype = ctypes.c_void_p
dll.smtc_free_string.argtypes = [ctypes.c_void_p]

# Full status (includes media metadata)
ptr = dll.smtc_get_status()
if ptr:
    status = json.loads(ctypes.string_at(ptr).decode("utf-8"))
    dll.smtc_free_string(ptr)
    print(status["title"], status["artist"])

# Lightweight timestamp (playback position only, no metadata)
ptr = dll.smtc_get_timestamp()
if ptr:
    ts = json.loads(ctypes.string_at(ptr).decode("utf-8"))
    dll.smtc_free_string(ptr)
    print(ts["playbackStatus"], ts["timeline"]["position"])

dll.smtc_play()    # Returns 0 on success
dll.smtc_pause()   # Returns 0 on success
```

#### NativeAOT Implementation Notes

The NativeAOT DLL has two key implementation details:

**1. STA Thread for WinRT**

WinRT async APIs require COM STA initialization. Each exported function spawns a dedicated STA thread:

```csharp
private static T RunOnSTAThread<T>(Func<Task<T>> asyncFunc)
{
    T result = default!;
    Exception? ex = null;
    var thread = new Thread(() =>
    {
        CoInitializeEx(IntPtr.Zero, COINIT_APARTMENTTHREADED);
        result = asyncFunc().GetAwaiter().GetResult();
    });
    thread.SetApartmentState(ApartmentState.STA);
    thread.Start();
    thread.Join();
    if (ex != null) throw ex;
    return result;
}
```

**2. JSON Source Generation**

NativeAOT disables reflection-based serialization. A source generator context provides compile-time JSON serialization:

```csharp
[JsonSerializable(typeof(MediaStatus))]
[JsonSerializable(typeof(CommandResult))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
internal partial class SmtcJsonContext : JsonSerializerContext { }
```

#### Source Files (ctypes)

| File | Responsibility |
|------|---------------|
| `smtc-ctypes/eIslandSmtcCtypes.csproj` | NativeAOT class library project |
| `smtc-ctypes/SmtcExports.cs` | C-style exported functions (commands + monitoring) |
| `smtc-ctypes/SmtcJsonContext.cs` | JSON source generator for NativeAOT serialization |

#### Performance

| Metric | Value |
|--------|-------|
| Command latency (FFI) | ~1-5ms (direct DLL call, no process spawn) |
| Command latency (EXE CLI) | ~50-200ms (process startup overhead) |
| Session detection | Event-driven (WinRT `SessionsChanged` callback) |
| Timeline updates | Event-driven (`TimelinePropertiesChanged`, 200ms throttle) |
| Memory | Single DLL loaded once; ~5MB resident |

#### Testing

```bash
# Build the DLL first
npm run build:ctypes

# Run Python test
npm run test:ctypes    # python test/smtc_ctypes_test.py
```
