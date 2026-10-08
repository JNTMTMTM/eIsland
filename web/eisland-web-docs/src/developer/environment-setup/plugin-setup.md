---
title: Plugin Setup
icon: toolbox
---

# Plugin Setup

:::info
This guide covers the environment configuration for eIsland plugin development. eIsland plugins are native C/C++ addons that communicate with Windows system APIs. Building them requires Visual Studio Build Tools 2022 with specific workloads and components.
:::

## Overview

eIsland uses ten native plugins to access Windows features that web technologies cannot provide:

| Plugin | Language | Windows Libraries | Purpose |
|--------|----------|-------------------|---------|
| **eisland-windows-fullscreen-detector** | C | user32, dwmapi | Detects fullscreen applications |
| **eisland-windows-performance-monitor** | C + .NET | — | CPU, memory, and temperature monitoring |
| **eisland-windows-processes-attacker** | C | kernel32 | Process management |
| **eisland-windows-toast-listener** | C++ | runtimeobject | Windows notification listener |
| **eisland-windows-smtc-helper** | C# (.NET) | — | System Media Transport Controls (play, pause, next, previous, status) |
| **eisland-windows-bluetooth-helper** | C# (.NET) | — | Bluetooth device enumeration and real-time connection monitoring |
| **eisland-windows-power-helper** | C# (.NET) | — | Battery status and power event monitoring |
| **eisland-windows-wifi-helper** | C# (.NET) | — | WiFi connection status and event monitoring |
| **eisland-windows-brightness-helper** | C# (.NET) | — | Screen brightness query, control, and WMI event monitoring |
| **eisland-windows-application-icon-helper** | C# (.NET) | Shell32 | Application icon extraction by process name, PID, path, or shortcut |
| **eisland-windows-screenshot-helper** | C# (.NET) | GDI32 | Primary display screen capture as PNG |

:::important
All plugins are compiled using **node-gyp** or **dotnet publish**, which requires Visual Studio Build Tools 2022 as the native compiler. The `npm run plugins:build` command in the root project automatically triggers these builds.
:::

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | >= 22.x | JavaScript runtime for node-gyp |
| **npm** | >= 10.x | Package manager |
| **Visual Studio Build Tools 2022** | Latest | C/C++ compiler toolchain |
| **.NET 10 SDK** | >= 10.0 | Build .NET Native AOT plugins and temperature-helper |
| **Python** | >= 3.10 | SMTC ctypes DLL testing |
| **Git** | Latest | Version control |

:::warning
These plugins are **Windows-only**. They cannot be built or run on macOS or Linux because they depend on Windows-specific system libraries (kernel32, user32, dwmapi, runtimeobject).
:::

## Visual Studio Build Tools 2022

The native C/C++ plugins require Visual Studio Build Tools 2022 with specific workloads and components. This section covers the complete installation.

### Download

Download the **Visual Studio Build Tools 2022** installer from:

:::tip
[https://visualstudio.microsoft.com/visual-cpp-build-tools/](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
:::

:::note
You do **not** need the full Visual Studio IDE. The Build Tools installer provides only the compiler and toolchain without the IDE, which is sufficient for plugin development.
:::

### Required Workloads

In the installer, select the following workload:

| Workload | Description |
|----------|-------------|
| **Desktop development with C++** | Core C++ compiler, linker, and Windows SDK — required for all four plugins |

:::important
The "Desktop development with C++" workload is the primary requirement. It includes MSVC v143, Windows SDK, and MSBuild. The individual components listed below are automatically included when you select this workload, but verify they are checked in the "Individual components" tab.
:::

### Required Components

The following components must be installed. They are typically included with the "Desktop development with C++" workload, but verify each one in the **"Individual components"** tab of the installer:

#### Compiler and Build Tools

| Component | ID | Description |
|-----------|-----|-------------|
| **MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)** | `Microsoft.VisualStudio.Component.VC.Tools.x86.x64` | The MSVC compiler (cl.exe) and linker (link.exe) — compiles all C/C++ plugin source code |
| **MSBuild** | `Microsoft.Component.MSBuild` | The build engine that processes `.vcxproj` and `binding.gyp` project files |
| **C++ Build Tools core features** | `Microsoft.VisualStudio.ComponentGroup.NativeDesktop.Core` | Core build infrastructure — headers, libraries, and runtime components |

:::details MSVC v143 — What It Does
MSVC (Microsoft Visual C++) v143 is the C/C++ compiler toolchain shipped with Visual Studio 2022. The "v143" refers to the compiler version. It provides:

- **cl.exe** — The C/C++ compiler that translates `.c` and `.cpp` source files into object files
- **link.exe** — The linker that combines object files into `.dll` or `.exe` binaries
- **C/C++ runtime libraries** — Required by compiled binaries to run on Windows
:::

#### Windows SDK

| Component | ID | Description |
|-----------|-----|-------------|
| **Windows 10/11 SDK (Latest)** | `Microsoft.VisualStudio.Component.Windows11SDK.*` | Windows API headers and libraries — provides `windows.h`, `user32.h`, `dwmapi.h`, and other system headers used by the plugins |

:::note
The Windows SDK provides the header files (`.h`) and import libraries (`.lib`) that allow the plugins to call Windows API functions. The `fullscreen-detector` uses `user32.lib` and `dwmapi.lib` from the SDK; the `processes-attacker` uses `kernel32.lib`; the `toast-listener` uses `runtimeobject.lib`.
:::

#### CMake and Testing Tools

| Component | ID | Description |
|-----------|-----|-------------|
| **C++ CMake tools for Windows** | `Microsoft.VisualStudio.Component.VC.CMake.Project` | CMake build system support — provides `cmake.exe` for projects that use CMake instead of MSBuild |
| **Testing tools core features - Build Tools** | `Microsoft.VisualStudio.Component.TestTools.BuildTools` | Testing infrastructure — enables running C++ unit tests from the command line |
| **C++ AddressSanitizer** | `Microsoft.VisualStudio.Component.CLangCL` | Runtime memory error detector — detects buffer overflows, use-after-free, and other memory bugs during testing |

:::details CMake — When You Need It
CMake is an alternative build system to MSBuild. The eIsland plugins use **node-gyp** (which generates MSBuild `.vcxproj` files), so CMake is not required for building the plugins themselves. However, CMake is useful when:

- Building third-party C/C++ libraries from source
- Debugging build issues by generating alternative project files
- Contributing to upstream dependencies that use CMake
:::

:::details AddressSanitizer — Memory Safety Testing
AddressSanitizer (ASan) is a runtime memory error detector. When enabled, it instruments the compiled code to catch:

- **Buffer overflows** — Reading or writing beyond allocated memory
- **Use-after-free** — Accessing memory that has already been freed
- **Memory leaks** — Allocated memory that is never released
- **Stack buffer overflow** — Writing beyond the bounds of a stack-allocated array

To enable ASan for a plugin test build, add the flag to the compiler options in `binding.gyp`:

```json
"msvs_settings": {
  "VCCLCompilerTool": {
    "AdditionalOptions": ["/fsanitize=address"]
  }
}
```
:::

#### Package Managers

| Component | ID | Description |
|-----------|-----|-------------|
| **vcpkg Package Manager** | `Microsoft.VisualStudio.Component.VC.vcpkg` | C/C++ package manager — installs third-party libraries (headers + pre-built binaries) with a single command |

:::tip
vcpkg is the recommended way to install C/C++ dependencies on Windows. For example, if a plugin needs a JSON parsing library:

```bash
vcpkg install nlohmann-json:x64-windows
```

vcpkg automatically downloads the source, compiles it with MSVC, and installs headers + libraries to a known location.
:::

#### .NET Components

The `eisland-windows-performance-monitor` plugin includes a .NET helper application (`eIslandTemperatureReader`) that reads hardware temperature sensors using LibreHardwareMonitorLib. The `eisland-windows-smtc-helper` plugin is a pure .NET console application that controls Windows media playback via SMTC APIs.

| Component | ID | Description |
|-----------|-----|-------------|
| **.NET 10 SDK** | `Microsoft.Component.NetFX` | Required for building the `eIslandTemperatureReader` console application (`net10.0` target) |
| **.NET Framework 4.8 development tools** | `Microsoft.VisualStudio.Component.ManagedDesktop` | .NET Framework targeting support — required for some NuGet packages and tooling |
| **ClickOnce Build Tools** | `Microsoft.VisualStudio.Component.ClickOnce.BuildTools` | Deployment packaging tools — used for creating self-contained .NET deployments |

:::details .NET Component Architecture
The temperature helper has a specific build chain:

```
eisland-windows-performance-monitor/
├── binding.gyp              # C plugin → compiled by node-gyp (MSVC)
├── src/
│   ├── performance_monitor.c
│   └── performance_core.c
└── temperature-helper/
    └── eIslandTemperatureReader.csproj   # .NET console app
        └── TargetFramework: net10.0
        └── NuGet: LibreHardwareMonitorLib
```

1. **node-gyp** compiles the C source files using MSVC v143
2. **dotnet build** compiles the .NET console application using .NET 10 SDK
3. At runtime, the C plugin calls the .NET executable to read temperature data

The SMTC helper is a pure .NET application with two build targets:

```
eisland-windows-smtc-helper/
├── package.json
├── index.js               # JS entry point, spawns .NET helper
├── index.d.ts             # TypeScript type declarations
├── src/
│   └── eIslandSmtcHelper.csproj   # .NET console app (for Node.js)
│       └── TargetFramework: net10.0-windows10.0.19041.0
│       └── Uses: Windows.Media.Control (WinRT)
└── smtc-ctypes/
    └── eIslandSmtcCtypes.csproj   # NativeAOT DLL (for Python ctypes / FFI)
        └── TargetFramework: net10.0-windows10.0.19041.0
        └── PublishAot: true
        └── SelfContained: true
        └── StaticICU: true
```

1. **dotnet build** compiles the .NET console application using .NET 10 SDK + Windows SDK
2. **dotnet publish** compiles the self-contained NativeAOT DLL (requires `vswhere.exe` in PATH)
3. At runtime, `index.js` spawns the .NET executable via `spawnSync` with CLI arguments
4. The .NET app outputs JSON to stdout and exits

The Bluetooth helper follows the same architecture as the SMTC helper:

```
eisland-windows-bluetooth-helper/
├── package.json
├── index.js               # JS entry point (exports queries + BluetoothMonitor)
├── index.d.ts             # TypeScript type declarations
├── ffi-loader.js          # koffi FFI loader for the NativeAOT DLL
├── bluetooth-monitor.js   # EventEmitter wrapper for device monitoring
├── src/
│   └── eIslandBluetoothHelper.csproj  # .NET class library
│       └── TargetFramework: net10.0-windows10.0.19041.0
│       └── Uses: Windows.Devices.Bluetooth (WinRT)
└── bt-ctypes/
    └── eIslandBluetoothCtypes.csproj  # NativeAOT DLL (for koffi FFI)
        └── TargetFramework: net10.0-windows10.0.19041.0
        └── PublishAot: true
        └── SelfContained: true
        └── StaticICU: true
```

1. **dotnet build** compiles the .NET class library
2. **dotnet publish** compiles the self-contained NativeAOT DLL (requires `vswhere.exe` in PATH)
3. At runtime, `index.js` loads the DLL via koffi FFI and calls C-style exported functions

:::important Self-Contained Native AOT
All .NET Native AOT DLLs are built with `<SelfContained>true</SelfContained>` and `<StaticICU>true</StaticICU>`. This means **client machines do not need the .NET runtime installed** — all dependencies are statically linked into the DLL. The trade-off is a larger DLL size (~5MB per plugin).
:::

The Power and WiFi helpers follow the same architecture. The Brightness helper is different — it uses a .NET console EXE (not NativeAOT) because `System.Management` (WMI) is incompatible with NativeAOT.
:::

### Installation Summary

:::details Complete Component Checklist
Use this checklist in the Visual Studio Build Tools 2022 installer (**Individual components** tab):

**Compiler & Build Tools:**
- [ ] MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)
- [ ] MSBuild
- [ ] C++ Build Tools core features

**Windows SDK:**
- [ ] Windows 10 SDK (10.0.19041.0) or Windows 11 SDK (Latest)

**CMake & Testing:**
- [ ] C++ CMake tools for Windows
- [ ] Testing tools core features - Build Tools
- [ ] C++ AddressSanitizer

**Package Manager:**
- [ ] vcpkg Package Manager

**.NET:**
- [ ] .NET 10 SDK
- [ ] .NET Framework 4.8 development tools
- [ ] ClickOnce Build Tools
:::

## .NET 10 SDK

The `temperature-helper` and `smtc-helper` components target .NET 10.0. Install the .NET 10 SDK separately if not included with the Build Tools installer.

### Installation

**Windows (recommended — using winget):**

```bash
winget install Microsoft.DotNet.SDK.10
```

**Windows (alternative — direct download):**

:::note
Download the .NET 10 SDK from [dotnet.microsoft.com/download/dotnet/10.0](https://dotnet.microsoft.com/download/dotnet/10.0).
:::

**Verify installation:**

```bash
dotnet --version  # Should print 10.x.x or later
```

## Plugin Project Structure

Each plugin follows a consistent structure:

```
plugin-name/
├── package.json           # npm metadata, build scripts, devDependencies
├── binding.gyp            # node-gyp build configuration (sources, libraries, flags)
├── index.js               # JavaScript entry point (exports native bindings)
├── index.d.ts             # TypeScript type definitions
├── vitest.config.ts       # Test configuration
├── src/                   # C/C++ source files
│   ├── *.c or *.cpp       # Native implementation
│   └── ...
└── test/                  # Test files
    ├── *.test.ts          # Unit tests (Vitest)
    ├── *.smoke.ts         # Smoke tests (manual verification)
    └── *.polling.test.ts  # Polling-mode tests (where applicable)
```

:::note
The `eisland-windows-smtc-helper` plugin uses C# instead of C/C++. Its `src/` directory contains `.cs` files and a `.csproj` project file instead of C sources and `binding.gyp`.
:::

### binding.gyp Configuration

Each plugin has a `binding.gyp` file that tells node-gyp how to compile the native code:

| Field | Purpose |
|-------|---------|
| `target_name` | Output binary name (e.g., `windows_fullscreen_detector`) |
| `sources` | List of C/C++ source files to compile |
| `defines` | Preprocessor macros (e.g., `WIN32_LEAN_AND_MEAN`, `NAPI_VERSION=8`) |
| `libraries` | Windows system libraries to link (e.g., `user32.lib`, `kernel32.lib`) |
| `msvs_settings` | MSVC-specific compiler and linker options |

:::details Example binding.gyp — eisland-windows-fullscreen-detector
```json
{
  "targets": [
    {
      "target_name": "windows_fullscreen_detector",
      "sources": ["src/fullscreen_detector.c", "src/fullscreen_core.c"],
      "defines": ["WIN32_LEAN_AND_MEAN", "NAPI_VERSION=8"],
      "libraries": ["user32.lib", "dwmapi.lib"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": ["/GL-"]
        },
        "VCLinkerTool": {
          "AdditionalOptions": ["/LTCG:OFF"]
        }
      }
    }
  ]
}
```

Key settings:
- `WIN32_LEAN_AND_MEAN` — Excludes rarely-used Windows headers to speed up compilation
- `NAPI_VERSION=8` — Targets Node-API version 8 for compatibility
- `/GL-` — Disables whole-program optimization (faster builds during development)
- `/LTCG:OFF` — Disables link-time code generation (faster linking during development)
:::

### common.gypi — LTO Configuration

The `eisland-windows-toast-listener` plugin includes a `common.gypi` file that defines project-wide build variables. node-gyp **automatically loads** this file when present in the project root — no explicit `includes` directive is needed.

```json
{
  "variables": {
    "enable_thin_lto": "false",
    "enable_lto": "false"
  }
}
```

Both LTO modes are **disabled** for this plugin.

:::details What is LTO (Link-Time Optimization)?
**LTO (Link-Time Optimization)** is a compiler optimization technique that defers optimization to the link stage of the build process, rather than optimizing each source file individually during compilation.

**Standard build (no LTO):**

```
Source A → Compile → Object A ─┐
                                ├─ Link → Final Binary
Source B → Compile → Object B ─┘
```

Each source file is compiled and optimized independently. The linker combines the object files without cross-file optimization.

**Build with LTO:**

```
Source A → Compile → IR* A ─┐
                             ├─ Link + Optimize → Final Binary (smaller/faster)
Source B → Compile → IR* B ─┘
```

*IR = Intermediate Representation (LLVM bitcode or MSVC IL)

Each source file is compiled to an intermediate representation. The linker then performs cross-file optimization — inlining functions across files, eliminating unused code paths, and optimizing data layout — before generating the final binary.
:::

| LTO Variant | MSVC Flag | Description |
|-------------|-----------|-------------|
| **Full LTO** | `/GL` + `/LTCG` | All object files merged into one module at link time — maximum optimization, slower build |
| **Thin LTO** | `/GL` + `/LTCG:thin` | Parallel optimization with incremental caching — faster build, slightly less optimized |

:::important
LTO is disabled in this plugin because:

1. **Build speed** — The plugin is small (3 C++ source files); LTO overhead outweighs the marginal performance gain
2. **Debugging** — LTO can inline functions across files and optimize out variables, making debugging harder
3. **node-gyp compatibility** — node-gyp's MSVC integration does not fully support LTO out of the box
4. **Binary size** — The plugin runs inside Electron's Chromium engine; size savings are negligible

The `binding.gyp` disables LTO with `/GL-` (compile) and `/LTCG:OFF` (link), which work in conjunction with `common.gypi` to ensure a clean, non-LTO build.
:::

:::tip
To enable LTO for a production build, set both variables to `"true"` in `common.gypi` and change the `binding.gyp` flags to `/GL` and `/LTCG`. Expect 2-5x longer build times.
:::

## Building Plugins

### Build All Plugins (via root project)

The recommended way to build plugins is through the root eIsland project:

```bash
cd eIsland
npm install  # Automatically builds all plugins via postinstall hook
```

:::tip
The `postinstall` script runs `electron-builder install-app-deps`, which triggers `node-gyp rebuild` for each native plugin.
:::

### Build a Single Plugin

To build a single plugin independently:

```bash
cd plugins/windows/eisland-windows-fullscreen-detector
npm run build    # Runs: node-gyp rebuild
```

### Rebuild After Code Changes

```bash
cd plugins/windows/eisland-windows-fullscreen-detector
npm run rebuild  # Runs: node-gyp clean && node-gyp rebuild
```

:::warning
After modifying `binding.gyp` (e.g., adding a new source file or library), you must run `npm run rebuild` — a regular `npm run build` may use cached artifacts.
:::

## Plugin SDK

The `@eisland/plugin-sdk` provides TypeScript type definitions and manifest validation helpers for plugin development.

### Build the SDK

```bash
cd sdk
npm run build        # Compiles TypeScript to dist/
npm run typecheck    # Type-check only (no output)
```

### SDK Structure

```
sdk/
├── package.json
├── tsconfig.json
├── dist/            # Compiled output (committed)
│   ├── index.js
│   └── index.d.ts
└── templates/       # Plugin templates for scaffolding
```

## Testing

### Run Plugin Tests

Each plugin has its own test suite using Vitest:

```bash
cd plugins/windows/eisland-windows-fullscreen-detector

# Run all tests
npm run test

# Run polling-mode tests only
npm run test:polling

# Run smoke test (manual verification)
npm run smoke

# Run polling smoke test
npm run smoke:polling
```

:::details Test Types Explained
| Type | File Pattern | Purpose |
|------|-------------|---------|
| **Unit tests** | `*.test.ts` | Automated tests that verify individual functions and behaviors |
| **Smoke tests** | `*.smoke.ts` | Manual verification scripts that test the plugin in a real environment |
| **Polling tests** | `*.polling.test.ts` | Tests that verify the plugin works correctly in polling (non-event) mode |
:::

### SMTC Helper Tests

The `eisland-windows-smtc-helper` plugin has per-command test files:

```bash
cd plugins/windows/eisland-windows-smtc-helper

npm run test                    # All tests
npm run test:play               # Play command tests
npm run test:pause              # Pause command tests
npm run test:next               # Next command tests
npm run test:previous           # Previous command tests
npm run test:timestamp          # Timestamp (getTimestamp) tests
npm run smoke                   # Full smoke test
npm run smoke:play              # Play smoke test
npm run smoke:pause             # Pause smoke test
npm run smoke:next              # Next smoke test
npm run smoke:previous          # Previous smoke test
npm run smoke:status            # Status-only smoke test
npm run smoke:timestamp         # Timestamp smoke test
```

### Toast Listener Special Tests

The `eisland-windows-toast-listener` plugin has additional test modes:

```bash
cd plugins/windows/eisland-windows-toast-listener

npm run test                    # All tests
npm run test:polling            # Polling-mode tests
npm run smoke                   # Basic smoke test
npm run smoke:polling           # Polling smoke test
npm run smoke:event             # Event-driven smoke test
npm run smoke:suppression       # Toast suppression smoke test
npm run cli:suppression         # CLI tool for testing toast suppression
```

### Bluetooth Helper Tests

The `eisland-windows-bluetooth-helper` plugin has query and monitor test files:

```bash
cd plugins/windows/eisland-windows-bluetooth-helper

npm run test                    # All tests
npm run test:query              # Query function tests (getPairedDevices, etc.)
npm run test:monitor            # Monitor state management tests
npm run smoke                   # Full smoke test — all query functions
npm run smoke:monitor           # Monitor smoke test — event-driven tracking for 8s
```

:::tip
The Bluetooth Helper smoke tests require a real Bluetooth adapter and at least one paired device to produce meaningful results. Without Bluetooth hardware, queries return empty arrays and the monitor reports no events.
:::

### Brightness Helper Tests

The `eisland-windows-brightness-helper` plugin has query and monitor test files:

```bash
cd plugins/windows/eisland-windows-brightness-helper

npm run test                    # All tests
npm run test:query              # Query function tests (getBrightness, setBrightness)
npm run test:monitor            # Monitor state management tests
npm run smoke                   # Full smoke test — getBrightness, setBrightness
npm run smoke:monitor           # Monitor smoke test — WMI event tracking for 15s
```

:::tip
The Brightness Helper smoke tests require a display that supports WMI brightness control (most laptop built-in displays). On desktops without a backlight, `getBrightness()` returns `null` and `setBrightness()` returns `false`.
:::

### Screenshot Helper Tests

The `eisland-windows-screenshot-helper` plugin has screenshot capture test files:

```bash
cd plugins/windows/eisland-windows-screenshot-helper

npm run test                    # All tests
npm run test:screenshot         # Screenshot capture and PNG validation tests
npm run smoke                   # Smoke test — capture and validate primary display
```

:::tip
The Screenshot Helper smoke test captures the actual primary display and validates the PNG header bytes. It requires a display connected to the system. On headless or remote desktop environments without a physical display, the capture may fail.
:::

## IDE Configuration

### Visual Studio Code

**Required extensions:**

| Extension | Purpose |
|-----------|---------|
| [C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) | IntelliSense, debugging, and code navigation for C/C++ |
| [CMake Tools](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cmake-tools) | CMake project support (for building dependencies) |
| [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) | Test runner UI for TypeScript tests |

**Recommended settings (`.vscode/settings.json`):**

```json
{
  "C_Cpp.default.cStandard": "c17",
  "C_Cpp.default.cppStandard": "c++20",
  "C_Cpp.default.windowsSdkVersion": "10.0",
  "C_Cpp.default.compilerPath": "C:/Program Files/Microsoft Visual Studio/2022/BuildTools/VC/Tools/MSVC/*/bin/Hostx64/x64/cl.exe"
}
```

:::note
The `compilerPath` may vary depending on your installation. Adjust the path to match your Visual Studio Build Tools 2022 installation directory.
:::

### Visual Studio 2022 (Full IDE)

If you prefer the full Visual Studio IDE instead of VS Code:

1. Open the plugin directory as a folder (`File → Open → Folder`)
2. The `binding.gyp` file will not be recognized directly — use the terminal to run `npm run build`
3. For C++ IntelliSense, ensure the "Desktop development with C++" workload is installed
4. Use the **Developer Command Prompt** for node-gyp commands:

```bash
cd plugins\windows\eisland-windows-fullscreen-detector
npm run build
```

:::tip
The **Developer Command Prompt** (installed with Build Tools) pre-configures the environment with `cl.exe`, `link.exe`, and other MSVC tools in the PATH. Open it from the Start Menu: "x64 Native Tools Command Prompt for VS 2022".
:::

## Verifying the Setup

After completing the setup, verify everything works:

```bash
# 1. Check Node.js version
node -v  # Should be v22+ (v25 recommended)

# 2. Check .NET SDK
dotnet --version  # Should be 10.x.x or later

# 3. Check Python version
python --version  # Should be 3.10+

# 4. Verify MSVC compiler is available
# Open "x64 Native Tools Command Prompt for VS 2022" and run:
cl  # Should print Microsoft (R) C/C++ Optimizing Compiler version info

# 5. Build the SDK
cd sdk
npm run build

# 6. Build a plugin
cd ../plugins/windows/eisland-windows-fullscreen-detector
npm run build

# 7. Run tests
npm run test
```

:::tip
If `npm run build` completes without errors and `npm run test` passes, your plugin development environment is ready.
:::

## Troubleshooting

### node-gyp: MSB8036 — The Windows SDK version was not found

```bash
# Install the Windows SDK via Visual Studio Build Tools installer
# Or install it standalone:
winget install Microsoft.WindowsSDK.10.0.19041
```

:::warning
Ensure the Windows SDK version matches what node-gyp expects. The error message will specify the required version.
:::

### node-gyp: gyp ERR! find VS — Could not find Visual Studio

```bash
# Set the Visual Studio installation path manually
npm config set msvs_version 2022

# Or set the path to your Build Tools installation
set GYP_MSVS_VERSION=2022
set GYP_MSVS_OVERRIDE_PATH=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools
```

### node-gyp: fatal error C1083: Cannot open include file: 'windows.h'

The Windows SDK is not installed or not found:

```bash
# Verify the Windows SDK is installed
# Check: C:\Program Files (x86)\Windows Kits\10\Include\

# If missing, install via Visual Studio Build Tools installer
# Component: "Windows 10 SDK (10.0.19041.0)" or "Windows 11 SDK"
```

### .NET Build Fails — The framework 'net10.0' was not found

```bash
# Install .NET 10 SDK
winget install Microsoft.DotNet.SDK.10

# Verify installation
dotnet --list-sdks  # Should show 10.x.x

# Rebuild the temperature helper
cd plugins/windows/eisland-windows-performance-monitor/temperature-helper
dotnet build

# Or rebuild the SMTC helper
cd plugins/windows/eisland-windows-smtc-helper
npm run build
```

### NativeAOT Build Fails — 'vswhere.exe' is not recognized

Building NativeAOT DLLs requires `vswhere.exe` in PATH. Add it before building:

```bash
export PATH="/c/Program Files (x86)/Microsoft Visual Studio/Installer:$PATH"
npm run build:ctypes
```

:::note
This is only needed for `dotnet publish` with `PublishAot=true`. Regular `dotnet build` does not require `vswhere.exe`.
:::

### Plugin Loads but Returns undefined

If the native module compiles but returns `undefined` when imported:

:::note
This usually means the compiled `.node` binary was built for a different architecture (x86 vs x64) or Node.js version than expected. Rebuild for the correct target:

```bash
npm run rebuild
```
:::

### Access Violation or Crash in Plugin

If the plugin crashes with an access violation:

1. Enable AddressSanitizer in `binding.gyp`:
   ```json
   "msvs_settings": {
     "VCCLCompilerTool": {
       "AdditionalOptions": ["/fsanitize=address"]
     }
   }
   ```
2. Rebuild: `npm run rebuild`
3. Run the test again — ASan will print a detailed error report showing the exact line of code causing the crash
