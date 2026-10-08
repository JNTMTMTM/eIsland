---
title: Plugins Tech Stack
icon: toolbox
---

# Plugins Tech Stack

:::warning
This document provides an overview of the native Node.js addon plugins used in the eIsland application. Plugins are **Windows-only**. Two plugins (Processes Attacker, Fullscreen Detector) use **C + N-API** via **node-gyp**, one (Toast Listener) uses **C++ + N-API**, and the remaining seven use **C# .NET** with **koffi FFI** (NativeAOT DLL) or **child process** integration.
:::

## Overview

The eIsland plugin system consists of ten native addons that provide low-level Windows system capabilities unavailable through standard Node.js APIs:

| Plugin | Package | Purpose |
|--------|---------|---------|
| **Processes Attacker** | `@eisland/windows-processes-attacker` | Terminate processes by name or PID |
| **Fullscreen Detector** | `@eisland/windows-fullscreen-detector` | Detect foreground fullscreen windows |
| **Performance Monitor** | `@eisland/windows-performance-monitor` | CPU, memory, and temperature snapshots |
| **SMTC Helper** | `@eisland/windows-smtc-helper` | System Media Transport Controls (play, pause, next, previous, status) |
| **Bluetooth Helper** | `@eisland/windows-bluetooth-helper` | Bluetooth device enumeration and real-time connection monitoring |
| **Power Helper** | `@eisland/windows-power-helper` | Battery status and power event monitoring |
| **WiFi Helper** | `@eisland/windows-wifi-helper` | WiFi connection status and event monitoring |
| **Brightness Helper** | `@eisland/windows-brightness-helper` | Screen brightness query, control, and real-time WMI event monitoring |
| **Application Icon Helper** | `@eisland/windows-application-icon-helper` | Application icon extraction by process name, PID, path, or shortcut |
| **Screenshot Helper** | `@eisland/windows-screenshot-helper` | Primary display screen capture as PNG via Win32 GDI APIs |
| **Toast Listener** | `@eisland/windows-toast-listener` | Windows toast notification listening and suppression |

**Architecture Categories:**

| Category | Plugins | Build System | Runtime |
|----------|---------|-------------|---------|
| **C + N-API** | Processes Attacker, Fullscreen Detector | `node-gyp` | Native `.node` addon loaded by Node.js |
| **C + .NET helper (spawnSync)** | Performance Monitor (temperature) | `node-gyp` + `dotnet build` | C addon + spawned .NET EXE |
| **C# NativeAOT + koffi FFI** | SMTC, Bluetooth, Power, WiFi, Application Icon Helper, Screenshot Helper | `dotnet publish` (NativeAOT) | Self-contained DLL loaded via koffi |
| **C# .NET EXE (spawnSync/spawn)** | Brightness Helper | `dotnet build` | Spawned .NET console EXE |
| **C++ + N-API** | Toast Listener | `node-gyp` | Native `.node` addon loaded by Node.js |

**Common Characteristics:**

- **Platform**: Windows only (`"os": ["win32"]`)
- **License**: GPL-3.0
- **TypeScript**: `.d.ts` type declarations provided

## Build System

### Node-Gyp Configuration

Each plugin uses a `binding.gyp` file to define compilation targets:

```json
{
  "targets": [
    {
      "target_name": "windows_fullscreen_detector",
      "sources": ["src/fullscreen_detector.c", "src/fullscreen_core.c"],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "libraries": ["user32.lib", "dwmapi.lib"]
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
| **Fullscreen Detector** | `user32.lib`, `dwmapi.lib` | Window enumeration (`EnumWindows`), DWM frame bounds (`DwmGetWindowAttribute`) |
| **Performance Monitor** | _(none linked)_ | Uses `GetSystemTimes`, `GlobalMemoryStatusEx` from kernel32 (auto-linked) |

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

## Plugin: Windows Fullscreen Detector

### Package

```
@eisland/windows-fullscreen-detector
```

### Purpose

Detects whether any window is currently in fullscreen mode. Used by eIsland to auto-hide the dynamic island when a user enters fullscreen (e.g., watching a video, gaming, or presenting).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer                                           │
│  getForegroundFullscreenWindow()                            │
│  getFullscreenWindows()                                     │
│  isAnyFullscreenWindow()                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ N-API
┌──────────────────────────▼──────────────────────────────────┐
│  fullscreen_detector.c                                      │
│  N-API binding: EnumWindows callback → JS array conversion  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  fullscreen_core.c                                          │
│  Window filtering + monitor bounds comparison               │
│  DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS)         │
└─────────────────────────────────────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getForegroundFullscreenWindow` | `() → FullscreenWindowInfo \| null` | Returns the foreground window if it is fullscreen, otherwise `null` |
| `getFullscreenWindows` | `() → FullscreenWindowInfo[]` | Returns all currently fullscreen windows across all monitors |
| `isAnyFullscreenWindow` | `() → boolean` | Quick boolean check — `true` if the foreground window is fullscreen |

### Result Structure

```ts
interface FullscreenWindowInfo {
  hwnd: string;                    // Window handle as hex string (e.g., "0x1a2b3c")
  title: string;                   // Window title
  processId: number;               // Owning process ID
  bounds: NativeRect;              // Window bounds (DWM-adjusted)
  monitor: NativeMonitorInfo;      // Monitor the window is on
  isForeground: boolean;           // Whether this is the foreground window
}

interface NativeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface NativeMonitorInfo extends NativeRect {
  isPrimary: boolean;              // Whether this is the primary monitor
}
```

### Fullscreen Detection Algorithm

The detection uses a **bounds-comparison approach** with DWM awareness:

```c
BOOL get_fullscreen_info(HWND hwnd, FullscreenWindowInfo* info) {
  // 1. Filter candidate windows
  if (!is_candidate_window(hwnd)) return FALSE;

  // 2. Get DWM-adjusted window bounds
  RECT bounds;
  DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, &bounds, sizeof(RECT));

  // 3. Get monitor that owns this window
  HMONITOR monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
  GetMonitorInfoW(monitor, &monitor_info);

  // 4. Compare window bounds to monitor bounds (with tolerance)
  if (!is_rect_close_to_monitor(&bounds, &monitor_info.rcMonitor))
    return FALSE;

  // 5. Populate result
  info->hwnd = hwnd;
  info->bounds = bounds;
  info->monitor_info = monitor_info;
  GetWindowThreadProcessId(hwnd, &info->process_id);
  GetWindowTextW(hwnd, info->title, TITLE_BUFFER_LENGTH);
  return TRUE;
}
```

**Window Filtering Rules:**

| Check | API | Purpose |
|-------|-----|---------|
| Valid window | `IsWindow(hwnd)` | Skip destroyed windows |
| Visible | `IsWindowVisible(hwnd)` | Skip hidden windows |
| Not minimized | `!IsIconic(hwnd)` | Skip minimized windows |
| Not disabled | `!(style & WS_DISABLED)` | Skip disabled windows |
| Not tool window | `!(ex_style & WS_EX_TOOLWINDOW)` | Skip floating tool windows |

**Bounds Comparison:**

```c
#define FULLSCREEN_TOLERANCE_PX 2

static BOOL is_rect_close_to_monitor(const RECT* window_rect, const RECT* monitor_rect) {
  return abs(window_rect->left - monitor_rect->left) <= FULLSCREEN_TOLERANCE_PX &&
         abs(window_rect->top - monitor_rect->top) <= FULLSCREEN_TOLERANCE_PX &&
         abs(window_rect->right - monitor_rect->right) <= FULLSCREEN_TOLERANCE_PX &&
         abs(window_rect->bottom - monitor_rect->bottom) <= FULLSCREEN_TOLERANCE_PX;
}
```

A 2-pixel tolerance handles windows that report slightly off-monitor bounds (common with DWM compositing).

**Multi-Monitor Support:**

- `EnumWindows` iterates all top-level windows across all monitors
- `MonitorFromWindow` resolves which monitor owns each window
- Each result includes the monitor's `rcMonitor` bounds and `isPrimary` flag

### Source Files

| File | Responsibility |
|------|---------------|
| `fullscreen_detector.c` | N-API binding layer, JS value construction |
| `fullscreen_core.c` | Core detection logic, window enumeration callback |
| `fullscreen_types.h` | Shared type definitions (`FullscreenWindowInfo`, `WindowList`) |

## Plugin: Windows Performance Monitor

### Package

```
@eisland/windows-performance-monitor
```

### Purpose

Provides low-overhead system performance snapshots for CPU usage, memory utilization, and hardware temperatures. Used by the eIsland system monitoring UI and the AI agent's `monitor.*` tools.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js)                                │
│  getCpu() / getMemory()  ← native binding                   │
│  getTemperature() / getHardwareList() ← .NET helper process │
└────────┬──────────────────────────────────┬─────────────────┘
         │ N-API                            │ spawnSync
┌────────▼───────────────┐    ┌─────────────▼─────────────────┐
│  performance_monitor.c │    │  eIslandTemperatureReader.exe │
│  N-API binding         │    │  .NET 10 + LibreHardware      │
├────────────────────────┤    │  MonitorLib                   │
│  performance_core.c    │    ├───────────────────────────────┤
│  GetSystemTimes        │    │  TemperatureCollector         │
│  GlobalMemoryStatusEx  │    │  HardwareListCollector        │
└────────────────────────┘    └───────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getCpu` | `() → CpuSnapshot` | CPU usage percentage (delta-based) |
| `getMemory` | `() → MemorySnapshot` | Memory usage (total, used, available) |
| `getTemperature` | `() → TemperatureSnapshot` | Hardware temperature readings via .NET helper |
| `getHardwareList` | `() → HardwareListSnapshot` | CPU and GPU device enumeration via .NET helper |

### CPU Snapshot

```ts
interface CpuSnapshot {
  usagePercent: number;    // 0–100, CPU usage since last call
  hasBaseline: boolean;    // false on first call (no prior delta)
}
```

**Implementation:**

```c
bool get_cpu_snapshot(CpuSnapshot* snapshot) {
  FILETIME idle_time, kernel_time, user_time;
  GetSystemTimes(&idle_time, &kernel_time, &user_time);

  // Delta calculation
  ULONGLONG total_delta = (kernel - last_kernel) + (user - last_user);
  ULONGLONG idle_delta = idle - last_idle;

  snapshot->usage_percent = clamp_percent(
    (double)(total_delta - idle_delta) * 100.0 / (double)total_delta
  );
}
```

- Uses `GetSystemTimes` for kernel-level CPU time accounting
- **Delta-based**: each call computes usage since the previous call
- First call returns `hasBaseline: false` (no prior data for delta)
- `clamp_percent` ensures values stay within [0, 100]

### Memory Snapshot

```ts
interface MemorySnapshot {
  totalBytes: number;       // Total physical memory
  usedBytes: number;        // Total - Available
  availableBytes: number;   // Available physical memory
  usagePercent: number;     // 0–100
}
```

**Implementation:**

```c
bool get_memory_snapshot(MemorySnapshot* snapshot) {
  MEMORYSTATUSEX status;
  status.dwLength = sizeof(status);
  GlobalMemoryStatusEx(&status);

  snapshot->total_bytes = status.ullTotalPhys;
  snapshot->available_bytes = status.ullAvailPhys;
  snapshot->used_bytes = status.ullTotalPhys - status.ullAvailPhys;
  snapshot->usage_percent = (double)used * 100.0 / (double)total;
}
```

- Uses `GlobalMemoryStatusEx` for system-wide memory stats
- Returns raw bytes (as `double` to avoid JS number precision limits)

### Temperature Snapshot

```ts
interface TemperatureSnapshot {
  isAvailable: boolean;                    // Whether readings were obtained
  readings: TemperatureReading[];          // Individual sensor readings
  maxTemperatureCelsius: number | null;    // Highest temperature across all sensors
}

interface TemperatureReading {
  id: string;                              // Sensor identifier
  label: string;                           // Human-readable label
  category: 'cpu' | 'gpu' | 'motherboard' | 'storage' | 'unknown';
  temperatureCelsius: number;              // Temperature in °C
  source: 'libre-hardware-monitor';        // Data source
}
```

### Hardware List Snapshot

```ts
interface HardwareListSnapshot {
  isAvailable: boolean;       // Whether hardware was enumerated
  cpus: HardwareDevice[];     // CPU devices
  gpus: HardwareDevice[];     // GPU devices
}

interface HardwareDevice {
  id: string;
  name: string;
  category: 'cpu' | 'gpu';
  hardwareType: string;       // e.g., "Cpu", "GpuNvidia", "GpuAmd"
  source: 'libre-hardware-monitor';
}
```

### .NET Temperature Helper

:::info
Temperature and hardware enumeration use a separate **.NET 10 console application** (`eIslandTemperatureReader.exe`) that wraps **LibreHardwareMonitorLib**. It operates as a CLI tool — invoked via `spawnSync`, reads hardware sensors, outputs JSON to stdout, then exits.
:::

#### Why a Separate Process?

- LibreHardwareMonitorLib requires COM interop and WMI access, which can destabilize a long-running process
- Cannot be safely loaded into the Electron main process (crash risk, memory leaks, handle leaks)
- Separate process provides crash isolation — if it fails, the main app continues unaffected
- `spawnSync` with a 5-second timeout ensures the main process never blocks indefinitely
- Process exits after each invocation — no lingering state or resource accumulation

#### Entry Point

```csharp
// Program.cs
var command = args.FirstOrDefault() ?? "temperature";
var computer = new Computer
{
    IsCpuEnabled = true,
    IsGpuEnabled = true,
    IsMotherboardEnabled = true,
    IsStorageEnabled = true,
};

computer.Open();

var payload = command == "hardware-list"
    ? JsonSerializer.Serialize(HardwareListCollector.Collect(computer))
    : JsonSerializer.Serialize(TemperatureCollector.Collect(computer));

Console.WriteLine(payload);
computer.Close();
```

**CLI Modes:**

| Invocation | Mode | Output |
|------------|------|--------|
| `eIslandTemperatureReader.exe` | Temperature (default) | `TemperatureSnapshot` JSON |
| `eIslandTemperatureReader.exe temperature` | Temperature | `TemperatureSnapshot` JSON |
| `eIslandTemperatureReader.exe hardware-list` | Hardware enumeration | `HardwareListSnapshot` JSON |

The `Computer` object from LibreHardwareMonitorLib is configured to enable all hardware categories (CPU, GPU, motherboard, storage). `computer.Open()` initializes WMI subscriptions and COM interfaces; `computer.Close()` releases them.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Program.cs                                                 │
│  CLI entry point — parses args, opens Computer, dispatches  │
└────────────┬──────────────────────────┬─────────────────────┘
             │                          │
    ┌────────▼───────────┐    ┌────────▼──────────────────┐
    │ TemperatureCollector│    │ HardwareListCollector      │
    │ .Collect(computer)  │    │ .Collect(computer)         │
    └────────┬────────────┘    └────────┬──────────────────┘
             │                          │
    ┌────────▼──────────────────────────▼──────────────────┐
    │ HardwareCategoryMapper                               │
    │ Maps HardwareType → category string                   │
    └──────────────────────────────────────────────────────┘
             │
    ┌────────▼────────────┐
    │ Snapshots.cs         │
    │ Data models (POCOs)  │
    └──────────────────────┘
```

#### TemperatureCollector

Recursively traverses the hardware tree and collects all temperature sensor readings:

```csharp
static class TemperatureCollector
{
    public static TemperatureSnapshot Collect(Computer computer)
    {
        var readings = new List<TemperatureReading>();

        foreach (var hardware in computer.Hardware)
        {
            CollectHardwareTemperatures(hardware, readings);
        }

        return new TemperatureSnapshot
        {
            IsAvailable = readings.Count > 0,
            Readings = readings,
            MaxTemperatureCelsius = readings.Count == 0
                ? null
                : readings.Max(r => r.TemperatureCelsius),
        };
    }

    private static void CollectHardwareTemperatures(
        IHardware hardware, List<TemperatureReading> readings)
    {
        hardware.Update();  // Refresh sensor values

        // Recurse into sub-hardware (e.g., CPU cores under a CPU package)
        foreach (var sub in hardware.SubHardware)
            CollectHardwareTemperatures(sub, readings);

        // Collect temperature sensors
        foreach (var sensor in hardware.Sensors)
        {
            if (sensor.SensorType != SensorType.Temperature || sensor.Value is null)
                continue;

            readings.Add(new TemperatureReading
            {
                Id = $"{hardware.Identifier}/{sensor.Identifier}",
                Label = string.IsNullOrWhiteSpace(sensor.Name)
                    ? hardware.Name
                    : $"{hardware.Name} {sensor.Name}",
                Category = HardwareCategoryMapper.Map(hardware.HardwareType),
                TemperatureCelsius = Math.Round(sensor.Value.Value, 1),
                Source = "libre-hardware-monitor",
            });
        }
    }
}
```

**Key behaviors:**

- **Recursive traversal**: `hardware.SubHardware` contains child devices (e.g., individual CPU cores, GPU memory controllers). The collector walks the full tree.
- **`hardware.Update()`**: Triggers a fresh read of all sensors for this hardware node. Must be called before accessing `sensor.Value`.
- **Sensor filtering**: Only `SensorType.Temperature` sensors with non-null values are collected.
- **ID format**: `{hardware.Identifier}/{sensor.Identifier}` — unique across the hardware tree, e.g., `cpu/0/temperature/2`.
- **Label fallback**: If `sensor.Name` is empty, uses `hardware.Name` alone.
- **Precision**: Temperature values are rounded to 1 decimal place (`Math.Round(value, 1)`).

#### HardwareListCollector

Enumerates CPU and GPU devices from the hardware tree:

```csharp
static class HardwareListCollector
{
    public static HardwareListSnapshot Collect(Computer computer)
    {
        var cpus = new List<HardwareDevice>();
        var gpus = new List<HardwareDevice>();

        foreach (var hardware in computer.Hardware)
        {
            CollectHardwareDevice(hardware, cpus, gpus);
        }

        return new HardwareListSnapshot
        {
            IsAvailable = cpus.Count > 0 || gpus.Count > 0,
            Cpus = cpus,
            Gpus = gpus,
        };
    }

    private static void CollectHardwareDevice(
        IHardware hardware, List<HardwareDevice> cpus, List<HardwareDevice> gpus)
    {
        hardware.Update();

        var category = HardwareCategoryMapper.Map(hardware.HardwareType);
        if (category == "cpu")
            cpus.Add(CreateHardwareDevice(hardware, category));
        else if (category == "gpu")
            gpus.Add(CreateHardwareDevice(hardware, category));

        // Recurse into sub-hardware
        foreach (var sub in hardware.SubHardware)
            CollectHardwareDevice(sub, cpus, gpus);
    }

    private static HardwareDevice CreateHardwareDevice(
        IHardware hardware, string category) => new()
    {
        Id = hardware.Identifier.ToString(),
        Name = hardware.Name,
        Category = category,
        HardwareType = hardware.HardwareType.ToString(),
        Source = "libre-hardware-monitor",
    };
}
```

**Key behaviors:**

- **Category filtering**: Only `"cpu"` and `"gpu"` devices are collected. Motherboard and storage devices are excluded from the hardware list (but their temperature sensors are still collected by `TemperatureCollector`).
- **`HardwareType` mapping**: The raw `HardwareType` enum value (e.g., `GpuNvidia`, `GpuAmd`, `GpuIntel`) is preserved as a string in the `HardwareType` field for downstream differentiation.

#### HardwareCategoryMapper

Maps LibreHardwareMonitor's `HardwareType` enum to simplified category strings:

```csharp
static class HardwareCategoryMapper
{
    public static string Map(HardwareType hardwareType) => hardwareType switch
    {
        HardwareType.Cpu                            => "cpu",
        HardwareType.GpuAmd
            or HardwareType.GpuIntel
            or HardwareType.GpuNvidia               => "gpu",
        HardwareType.Motherboard                    => "motherboard",
        HardwareType.Storage                        => "storage",
        _                                           => "unknown",
    };
}
```

**Mapping Table:**

| `HardwareType` | Category | Examples |
|----------------|----------|----------|
| `Cpu` | `cpu` | Intel Core, AMD Ryzen |
| `GpuNvidia` | `gpu` | NVIDIA GeForce, RTX series |
| `GpuAmd` | `gpu` | AMD Radeon, RX series |
| `GpuIntel` | `gpu` | Intel Arc, integrated graphics |
| `Motherboard` | `motherboard` | ASUS, MSI, Gigabyte boards |
| `Storage` | `storage` | NVMe SSDs, SATA drives |
| _(other)_ | `unknown` | SuperIO, TBalancer, etc. |

#### Snapshots (Data Models)

All data models use C# `required` init-only properties and provide static `Empty` singletons for fallback scenarios:

```csharp
sealed class TemperatureSnapshot
{
    public static TemperatureSnapshot Empty { get; } = new()
    {
        IsAvailable = false,
        Readings = [],
        MaxTemperatureCelsius = null,
    };

    public required bool IsAvailable { get; init; }
    public required List<TemperatureReading> Readings { get; init; }
    public required double? MaxTemperatureCelsius { get; init; }
}

sealed class TemperatureReading
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string Category { get; init; }
    public required double TemperatureCelsius { get; init; }
    public required string Source { get; init; }
}

sealed class HardwareListSnapshot
{
    public static HardwareListSnapshot Empty { get; } = new()
    {
        IsAvailable = false,
        Cpus = [],
        Gpus = [],
    };

    public required bool IsAvailable { get; init; }
    public required List<HardwareDevice> Cpus { get; init; }
    public required List<HardwareDevice> Gpus { get; init; }
}

sealed class HardwareDevice
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Category { get; init; }
    public required string HardwareType { get; init; }
    public required string Source { get; init; }
}
```

**Design decisions:**

- **`sealed` classes**: No inheritance needed; enables JIT optimizations.
- **`required` init-only properties**: Enforced at compile time — prevents incomplete construction.
- **`Empty` singletons**: Used as fallback when the helper binary is missing or crashes. Serialized to JSON as `{"isAvailable":false,"readings":[],...}`.
- **JSON serialization**: Uses `JsonSerializerDefaults.Web` for camelCase property naming (matching the TypeScript interfaces).

#### JSON Output Format

**Temperature mode** (`eIslandTemperatureReader.exe`):

```json
{
  "isAvailable": true,
  "readings": [
    {
      "id": "cpu/0/temperature/0",
      "label": "CPU Package",
      "category": "cpu",
      "temperatureCelsius": 52.3,
      "source": "libre-hardware-monitor"
    },
    {
      "id": "gpu-nvidia/0/temperature/0",
      "label": "NVIDIA GeForce RTX 4070 GPU Core",
      "category": "gpu",
      "temperatureCelsius": 41.0,
      "source": "libre-hardware-monitor"
    }
  ],
  "maxTemperatureCelsius": 52.3
}
```

**Hardware list mode** (`eIslandTemperatureReader.exe hardware-list`):

```json
{
  "isAvailable": true,
  "cpus": [
    {
      "id": "cpu/0",
      "name": "Intel Core i7-13700K",
      "category": "cpu",
      "hardwareType": "Cpu",
      "source": "libre-hardware-monitor"
    }
  ],
  "gpus": [
    {
      "id": "gpu-nvidia/0",
      "name": "NVIDIA GeForce RTX 4070",
      "category": "gpu",
      "hardwareType": "GpuNvidia",
      "source": "libre-hardware-monitor"
    }
  ]
}
```

#### Invocation from Node.js

The main plugin's `index.js` bridges the .NET helper via synchronous child process execution:

```js
function readHelperSnapshot(args, fallback) {
  const readerPath = findTemperatureReader();
  if (!readerPath) return fallback;

  const result = spawnSync(readerPath, args, {
    encoding: 'utf8',
    windowsHide: true,    // Hide console window on Windows
    timeout: 5000,         // 5-second hard timeout
  });

  if (result.status !== 0 || result.error || !result.stdout) {
    return fallback;
  }

  return JSON.parse(result.stdout);
}
```

**Binary resolution order:**

```js
const temperatureReaderCandidates = [
  path.join(__dirname, 'temperature-helper', 'bin', 'Release', 'net10.0', 'eIslandTemperatureReader.exe'),
  path.join(__dirname, 'temperature-helper', 'bin', 'Debug', 'net10.0', 'eIslandTemperatureReader.exe'),
];
```

**Fallback Behavior:**

| Condition | Result |
|-----------|--------|
| Binary not found | `emptyTemperatureSnapshot` / `emptyHardwareListSnapshot` |
| Process exits with non-zero status | Fallback |
| Process times out (>5s) | Fallback |
| stdout is empty | Fallback |
| JSON parse error | Fallback |
| Success | Parsed snapshot object |

#### Dependencies

```xml
<!-- eIslandTemperatureReader.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="LibreHardwareMonitorLib" Version="0.9.6" />
  </ItemGroup>
</Project>
```

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Runtime (required on client — this is NOT a NativeAOT build) |
| **LibreHardwareMonitorLib** | 0.9.6 | Hardware sensor access via WMI/COM |

#### Build

The .NET helper is built alongside the native addon:

```bash
# Build native addon + .NET helper
npm run build

# Equivalent to:
node-gyp rebuild
dotnet build temperature-helper/eIslandTemperatureReader.csproj -c Release
```

Output: `temperature-helper/bin/Release/net10.0/eIslandTemperatureReader.exe`

### Source Files

| File | Responsibility |
|------|---------------|
| `performance_monitor.c` | N-API binding layer, exports `getCpu` and `getMemory` |
| `performance_core.c` | Core implementation using Win32 APIs |
| `performance_types.h` | Shared type definitions (`CpuSnapshot`, `MemorySnapshot`) |
| `index.js` | Entry point, loads native binding, adds `getTemperature`/`getHardwareList` |
| `index.d.ts` | TypeScript type declarations |
| `temperature-helper/Program.cs` | .NET CLI entry point, opens `Computer`, dispatches to collectors |
| `temperature-helper/TemperatureCollector.cs` | Recursive temperature sensor collection |
| `temperature-helper/HardwareListCollector.cs` | CPU/GPU device enumeration |
| `temperature-helper/HardwareCategoryMapper.cs` | `HardwareType` → category string mapping |
| `temperature-helper/Snapshots.cs` | Data models with `Empty` fallback singletons |

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

## Plugin: Windows Brightness Helper

### Package

```
@eisland/windows-brightness-helper
```

### Purpose

Provides screen brightness query, control, and real-time monitoring via WMI. Used by eIsland to display and adjust the user's screen brightness, and to react to brightness changes made through hardware keys or system settings.

:::info
Unlike the Bluetooth, Power, and WiFi Helpers which use **koffi FFI + NativeAOT DLL**, the Brightness Helper uses a **.NET console EXE** spawned via `spawnSync` (queries) and `spawn` (monitoring). This is because `System.Management` (WMI) is incompatible with NativeAOT — the COM interop layer breaks during AOT compilation.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js)                                │
│  Queries: getBrightness() / setBrightness() via spawnSync   │
│  Monitor: BrightnessMonitor (EventEmitter) via spawn        │
└──────────────────────────┬──────────────────────────────────┘
                           │ spawnSync / spawn (child process)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandBrightnessReader.exe (.NET 10 Console App)          │
│  System.Management + WMI (root\wmi)                         │
├─────────────────────────────────────────────────────────────┤
│  Program.cs                                                 │
│  CLI entry point: get / set <n> / monitor                   │
│  BrightnessHelper (static class)                            │
│  ├─ GetBrightness()    → WmiMonitorBrightness               │
│  ├─ SetBrightness(n)   → WmiMonitorBrightnessMethods        │
│  └─ Monitor()          → WmiMonitorBrightnessEvent          │
└─────────────────────────────────────────────────────────────┘
```

:::tip
The `monitor` command uses `ManagementEventWatcher` to subscribe to `WmiMonitorBrightnessEvent` — a true WMI event subscription. The .NET process blocks until an event fires, then writes a JSON line to stdout. The Node.js `BrightnessMonitor` reads these lines via `spawn` stdout `data` events. This is **event-driven, not polling**.
:::

### Exported Functions

#### Queries

| Function | Signature | Description |
|----------|-----------|-------------|
| `getBrightness` | `() → BrightnessInfo \| null` | Current screen brightness snapshot |
| `setBrightness` | `(brightness: number) → boolean` | Set brightness (0–100), clamped. Returns `true` on success |

#### BrightnessMonitor

| Export | Type | Description |
|--------|------|-------------|
| `BrightnessMonitor` | `class extends EventEmitter` | Real-time brightness monitor via WMI events |

**Events:**

| Event | Callback | Description |
|-------|----------|-------------|
| `brightness-changed` | `(brightness: number, timestamp: number) => void` | Brightness changed (hardware key, system setting, or API) |
| `error` | `(err: Error) => void` | Monitor process error |

### Result Structure

```ts
interface BrightnessInfo {
  currentBrightness: number;   // 0–100, current brightness percentage
  levels: number[] | null;     // Supported brightness levels (0–100), typically 0–100 in steps of 1
  instanceName: string | null; // WMI monitor instance name (e.g., "DISPLAY\BOE381E\5&...")
}
```

:::important
The `levels` array contains all supported brightness values. Most laptop displays support 101 levels (0–100). External monitors connected via DDC/CI may support fewer levels or none at all. If WMI brightness data is unavailable (e.g., desktop with no backlight), `getBrightness()` returns `null`.
:::

### CLI Modes

The .NET helper is a CLI tool invoked with a single argument:

| Invocation | Mode | Output |
|------------|------|--------|
| `eIslandBrightnessReader.exe get` | Query (default) | `BrightnessInfo` JSON |
| `eIslandBrightnessReader.exe set <0-100>` | Set brightness | `{ success: true, brightness: N }` JSON |
| `eIslandBrightnessReader.exe monitor` | Event monitor | Stream of `{ brightness, timestamp }` JSON lines |

**Monitor output format** (one line per brightness change):

```json
{"brightness":75,"timestamp":1719700000000}
```

The monitor process stays alive until stdin is closed or a termination signal is received. The Node.js layer kills the process on `monitor.stop()`.

### Key Implementation Details

**WMI Queries:**

```csharp
// Get current brightness
using var searcher = new ManagementObjectSearcher(@"root\wmi", "SELECT * FROM WmiMonitorBrightness");
foreach (ManagementObject obj in searcher.Get())
{
    var currentBrightness = (byte)obj["CurrentBrightness"];
    var levels = obj["Level"] as byte[];
    var instanceName = obj["InstanceName"] as string;
}

// Set brightness
using var searcher = new ManagementObjectSearcher(@"root\wmi", "SELECT * FROM WmiMonitorBrightnessMethods");
foreach (ManagementObject obj in searcher.Get())
{
    var inParams = obj.GetMethodParameters("WmiSetBrightness");
    inParams["Brightness"] = brightness;
    inParams["Timeout"] = (uint)0;
    obj.InvokeMethod("WmiSetBrightness", inParams, null);
}
```

**WMI Event Subscription:**

```csharp
using var watcher = new ManagementEventWatcher(@"root\wmi", "SELECT * FROM WmiMonitorBrightnessEvent");
watcher.EventArrived += (sender, e) =>
{
    var brightness = (byte)e.NewEvent.Properties["Brightness"].Value;
    Console.WriteLine(JsonSerializer.Serialize(new { brightness, timestamp }));
};
watcher.Start();
```

:::warning
`System.Management` uses COM interop internally. The `Timeout` parameter in `WmiSetBrightness` must be cast to `uint`, not `int`, or the WMI call fails with a type mismatch error.
:::

**Why Not NativeAOT?**

Both `System.Management` and `Microsoft.Management.Infrastructure` produce fatal COM interop errors under NativeAOT:

- `System.Management`: `WbemContext..ctor()` always throws — the Wbem COM classes cannot be instantiated
- `Microsoft.Management.Infrastructure`: `DeserializerCallbacks` delegate marshalling data is missing

The .NET console EXE approach avoids this entirely — `System.Management` works perfectly under the standard .NET runtime.

### Source Files

| File | Responsibility |
|------|---------------|
| `src/eIslandBrightnessReader.csproj` | .NET 10 console app project file |
| `src/Program.cs` | CLI entry point (`get`/`set`/`monitor`) + `BrightnessHelper` static class |
| `index.js` | Public API — `getBrightness()`, `setBrightness()`, `BrightnessMonitor` class |
| `index.d.ts` | TypeScript type declarations |

### Build

```bash
cd plugins/windows/eisland-windows-brightness-helper
npm run build    # dotnet build src/eIslandBrightnessReader.csproj -c Release
```

Output: `src/bin/Release/net10.0/eIslandBrightnessReader.exe`

### Dependencies

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="System.Management" Version="10.0.0-preview.3.25171.5" />
  </ItemGroup>
</Project>
```

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Runtime (required on client — this is NOT a self-contained build; WMI is incompatible with NativeAOT) |
| **System.Management** | 10.0.0-preview.3 | WMI access (`ManagementObjectSearcher`, `ManagementEventWatcher`) |

### Performance

| Metric | Value |
|--------|-------|
| Query latency | ~100–300ms (process spawn + WMI query) |
| Set latency | ~100–300ms (process spawn + WMI method invocation) |
| Monitor startup | ~100ms (process spawn + WMI event subscription) |
| Event detection | Event-driven (WMI `WmiMonitorBrightnessEvent`, zero polling) |
| Memory | Process exits after each query; monitor process ~15MB resident |

:::note
Query and set operations spawn a new .NET process each time, incurring ~100ms startup overhead. For frequent polling, consider using the `BrightnessMonitor` event-driven approach instead of repeated `getBrightness()` calls.
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

## Plugin: Windows Application Icon Helper

### Package

```
@eisland/windows-application-icon-helper
```

### Purpose

Extracts Windows application and process icons as PNG buffers. Supports lookup by process name, PID, executable path, or shortcut (.lnk) path. Used by eIsland to display application icons in the process manager and AI agent tool results.

:::info
This plugin uses **koffi FFI + .NET NativeAOT DLL** architecture. It wraps Windows Shell32 APIs (`ExtractAssociatedIconW`) and COM `IShellLink` for shortcut resolution.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + ffi-loader.js)                │
│  getIconByProcessName / getIconByPid / getIconByPath /      │
│  getIconByShortcutPath                                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandAppIconHelper.dll (NativeAOT)                       │
│  .NET 10 + Shell32 APIs                                     │
├─────────────────────────────────────────────────────────────┤
│  IconExtractor.cs       — Core icon extraction logic        │
│  Exports.cs             — C-style exported functions        │
└─────────────────────────────────────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `getIconByProcessName` | `(processName: string) → IconResult \| null` | Get icon by running process name |
| `getIconByPid` | `(pid: number) → IconResult \| null` | Get icon by process ID |
| `getIconByPath` | `(exePath: string) → IconResult \| null` | Get icon by executable file path |
| `getIconByShortcutPath` | `(lnkPath: string) → IconResult \| null` | Get icon by shortcut (.lnk) path |

### Result Structure

```ts
interface IconResult {
  data: Buffer;      // PNG icon data
  size: number;      // Icon data size in bytes
  format: 'png';     // Image format (always 'png')
}
```

### Source Files

| File | Responsibility |
|------|---------------|
| `src/IconExtractor.cs` | Core icon extraction using `ExtractAssociatedIconW` and `IShellLink` |
| `src/Exports.cs` | C-style exported functions for koffi FFI |
| `src/eIslandAppIconHelper.csproj` | .NET 10 Native AOT project |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `index.js` | Public API — exports all icon functions |
| `index.d.ts` | TypeScript type declarations |

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL) |
| **koffi** | ^2.9.1 | FFI library for calling DLL from Node.js |

## Plugin: Windows Screenshot Helper

### Package

```
@eisland/windows-screenshot-helper
```

### Purpose

Captures the primary display as a PNG image buffer. Uses Win32 GDI APIs (`GetDC`, `CreateCompatibleBitmap`, `BitBlt`) to perform screen capture, then encodes the result to PNG inside the Native AOT DLL. Used by eIsland for screenshot and screen recording features.

:::info
This plugin uses **koffi FFI + .NET NativeAOT DLL** architecture. It wraps Windows GDI APIs for screen capture and `System.Drawing.Common` for PNG encoding.
:::

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  JavaScript Layer (index.js + ffi-loader.js)                │
│  capturePrimaryDisplayPng / getLastError                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ koffi FFI (direct DLL calls)
┌──────────────────────────▼──────────────────────────────────┐
│  eIslandScreenshotHelper.dll (NativeAOT)                    │
│  .NET 10 + GDI APIs + System.Drawing.Common                 │
├─────────────────────────────────────────────────────────────┤
│  ScreenCapture.cs       — Core GDI screen capture logic     │
│  ScExports.cs           — C-style exported functions        │
└─────────────────────────────────────────────────────────────┘
```

### Exported Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `capturePrimaryDisplayPng` | `() → ScreenshotResult \| null` | Capture the primary display as PNG |
| `getLastError` | `() → string` | Get the last error message from the DLL |

### Result Structure

```ts
interface ScreenshotResult {
  data: Buffer;      // PNG screenshot data
  size: number;      // Screenshot data size in bytes
  format: 'png';     // Image format (always 'png')
}
```

### Key Implementation Details

The capture uses a GDI device context chain:

1. `GetDC(IntPtr.Zero)` — acquires the screen device context
2. `CreateCompatibleDC` + `CreateCompatibleBitmap` — creates a compatible memory DC and bitmap
3. `BitBlt(SRCCOPY | CAPTUREBLT)` — copies screen content to the bitmap
4. `Image.FromHbitmap` + `Image.Save(stream, ImageFormat.Png)` — encodes to PNG
5. Proper cleanup in `finally` block (`SelectObject`, `DeleteObject`, `DeleteDC`, `ReleaseDC`)

The PNG bytes are base64-encoded in the DLL, returned as a CoTaskMem string, then decoded into a Node.js `Buffer` by the FFI loader.

### Source Files

| File | Responsibility |
|------|---------------|
| `src/ScreenCapture.cs` | Core screen capture using Win32 GDI APIs |
| `src/ScExports.cs` | C-style exported functions for koffi FFI |
| `src/Program.cs` | Native AOT library entry point (empty Main) |
| `src/eIslandScreenshotHelper.csproj` | .NET 10 Native AOT project |
| `ffi-loader.js` | koffi FFI loader — defines all DLL function signatures |
| `index.js` | Public API — exports capture and error functions |
| `index.d.ts` | TypeScript type declarations |

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **.NET** | 10.0 | Build-time only (self-contained DLL) |
| **koffi** | ^2.9.1 | FFI library for calling DLL from Node.js |
| **System.Drawing.Common** | 10.0.0-preview.2 | PNG encoding via `Image.Save` |

## Testing

### Test Framework

Plugins with tests use **Vitest** with the following configuration:

```ts
// vitest.config.ts
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

**Export Verification:**

Tests confirm all expected functions are exported:

```ts
it('exports detector methods', () => {
  expect(typeof detector.getForegroundFullscreenWindow).toBe('function');
  expect(typeof detector.getFullscreenWindows).toBe('function');
  expect(typeof detector.isAnyFullscreenWindow).toBe('function');
});
```

**Nullable Result Handling:**

Tests handle functions that may return `null` depending on system state:

```ts
const foreground = detector.getForegroundFullscreenWindow();
expect(foreground === null || typeof foreground === 'object').toBe(true);
```

### Test Coverage by Plugin

| Plugin | Test Files | Test Types |
|--------|------------|------------|
| **Processes Attacker** | _(manual testing)_ | — |
| **Fullscreen Detector** | `fullscreen-detector.test.ts`, `fullscreen-detector.polling.test.ts` | Shape validation, export verification |
| **Performance Monitor** | `performance-monitor.test.ts` | Shape validation, range checks |
| **SMTC Helper** | `smtc-helper.test.ts`, `smtc-helper.play.test.ts`, `smtc-helper.pause.test.ts`, `smtc-helper.next.test.ts`, `smtc-helper.previous.test.ts`, `smtc-helper.timestamp.test.ts` | Shape validation, export verification, command tests |
| **Bluetooth Helper** | `bluetooth.test.ts`, `bluetooth.monitor.test.ts` | Shape validation, export verification, monitor state management |
| **Power Helper** | `power.test.ts`, `power.monitor.test.ts` | Shape validation, consistency, monitor tests |
| **WiFi Helper** | `wifi.test.ts`, `wifi.monitor.test.ts` | Shape validation, consistency, monitor tests |
| **Brightness Helper** | `brightness.test.ts`, `brightness.monitor.test.ts` | Shape validation, export verification, boundary value tests, monitor state management |
| **Application Icon Helper** | `icon.test.ts` | Shape validation, export verification |
| **Screenshot Helper** | `screenshot.test.ts` | Shape validation, export verification, PNG header validation |
| **Toast Listener** | `windows-toast-listener.test.ts`, `windows-toast-listener.polling.test.ts` | Shape validation, export verification, polling tests |

## Integration with Electron

### Loading Native Plugins

Plugins are loaded in the Electron main process via `require()`:

```ts
// Example: Loading the fullscreen detector
const detector = require('@eisland/windows-fullscreen-detector');

// Check if any window is fullscreen
if (detector.isAnyFullscreenWindow()) {
  // Auto-hide the island
  mainWindow.hide();
}
```

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
| `win.list` | Fullscreen Detector | `getFullscreenWindows()` |
| `monitor.cpu` | Performance Monitor | `getCpu()` |
| `monitor.memory` | Performance Monitor | `getMemory()` |
| `monitor.temperature` | Performance Monitor | `getTemperature()` |
| `monitor.gpu` | Performance Monitor | `getHardwareList()` |
| `brightness.get` | Brightness Helper | `getBrightness()` |
| `brightness.set` | Brightness Helper | `setBrightness(level)` |

## Performance Characteristics

:::tip
Performance characteristics and optimization recommendations for each plugin:
:::

| Plugin | Call Latency | Notes |
|--------|-------------|-------|
| **Processes Attacker** | ~1–5ms | Snapshot-based enumeration, single `TerminateProcess` call per match |
| **Fullscreen Detector** | ~1–3ms | `EnumWindows` iterates all top-level windows; early-exit for `isAnyFullscreenWindow` |
| **Performance Monitor (CPU)** | <0.1ms | `GetSystemTimes` is a single kernel call |
| **Performance Monitor (Memory)** | <0.1ms | `GlobalMemoryStatusEx` is a single kernel call |
| **Performance Monitor (Temperature)** | ~500–2000ms | Spawns a .NET process; includes process startup + WMI queries |
| **SMTC Helper** | ~50–200ms | Spawns a .NET process; WinRT session manager + media property reads |
| **SMTC Helper (FFI)** | ~1–5ms | Direct DLL call via koffi FFI; no process spawn |
| **Bluetooth Helper** | ~10–50ms | WinRT `FindAllAsync` + `FromIdAsync`; event-driven monitoring |
| **Power Helper** | ~1ms | In-memory `PowerManager` property reads; event-driven monitoring |
| **WiFi Helper** | ~1ms | In-memory `NetworkInformation` profile reads; event-driven monitoring |
| **Brightness Helper** | ~100–300ms | Process spawn + WMI query; event-driven monitoring |
| **Application Icon Helper** | ~5–20ms | Shell32 `ExtractAssociatedIconW`; direct DLL call via koffi FFI |
| **Toast Listener** | ~1–3ms | WinRT COM interop; event-driven monitoring |

**Optimization Notes:**

- CPU and memory snapshots are nearly zero-cost — suitable for polling at 1-second intervals
- Temperature queries are expensive due to the .NET helper process — recommended at 5–10 second intervals
- The fullscreen detector avoids COM/WMI — pure Win32 window API calls
- SMTC commands are direct DLL calls (~1-5ms via koffi FFI); monitoring is event-driven (zero polling)
- Power and WiFi helpers use in-memory WinRT property reads (~1ms) — suitable for frequent polling
- Application icon queries are fast (~5-20ms) but should be cached to avoid repeated Shell32 calls
- Brightness queries spawn a .NET process each time — use the `BrightnessMonitor` event-driven approach for frequent updates

:::warning
Temperature queries involve .NET process startup and WMI queries, resulting in high latency (500–2000ms). Recommended polling interval is 5–10 seconds to avoid frequent calls impacting performance.
:::

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
