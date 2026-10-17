---
watermark: true
title: getHardwareList / getHardwareListAsync
icon: fa6-solid:code
---

# getHardwareList / getHardwareListAsync

```typescript
function getHardwareList(): HardwareListSnapshot
function getHardwareListAsync(): Promise<HardwareListSnapshot>
```

Since 26.1.0, `getHardwareList()` immediately returns the immutable device-list cache. Before initial discovery it returns `{ isAvailable: false, cpus: [], gpus: [] }` and starts the helper asynchronously. Use `getHardwareListAsync()` to wait for discovery. Temperature and hardware requests share one process and one initial request.

Device names and identifiers do not require sensor updates. The list is collected once per helper session and cached after the helper exits. Reading an available cached list does not start a process or poll sensors. `dispose()` clears it, so a subsequent query discovers hardware again. A new temperature session also refreshes the device list. Helper failures do not discard an already discovered device list.

## Example

```typescript
import { getHardwareListAsync, dispose } from '@eisland/windows-performance-monitor';

try {
  const hardware = await getHardwareListAsync();
  if (hardware.isAvailable) {
    hardware.cpus.forEach(cpu => console.log(cpu.id, cpu.name));
    hardware.gpus.forEach(gpu => console.log(gpu.id, gpu.name));
  }
} finally {
  dispose();
}
```

## Return value

See [HardwareListSnapshot](hardware-list-snapshot.md) and [HardwareDevice](hardware-device.md). IDs and names retain the LibreHardwareMonitor identifiers used by earlier versions. Empty arrays indicate that discovery is pending or unavailable. Snapshots and device arrays are frozen; copy them before modification.

## Migration from 26.0.x

Replace a cold `getHardwareList()` call with `await getHardwareListAsync()` when a device picker must wait for discovery. Repeated queries reuse the cached result. Call `dispose()` before requesting explicit hardware rediscovery.
