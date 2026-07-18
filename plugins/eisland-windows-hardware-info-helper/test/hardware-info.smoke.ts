/*
 * eIsland - A sleek, Apple Dynamic Island inspired floating widget for Windows, built with Electron.
 * https://github.com/JNTMTMTM/eIsland
 *
 * Copyright (C) 2026 JNTMTMTM
 * Copyright (C) 2026 pyisland.com
 *
 * Original author: JNTMTMTM[](https://github.com/JNTMTMTM)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 */

/**
 * @file hardware-info.smoke.ts
 * @description Smoke test for hardware info helper — prints all query results
 * @author 鸡哥
 */

if (process.platform !== 'win32') {
  console.log('Skipping: Windows-only plugin');
  process.exit(0);
}

const hw = require('../');

console.log('=== Hardware Info Smoke Test ===\n');

const tests: Array<{ name: string; fn: () => unknown[] }> = [
  { name: 'CPU',          fn: hw.getCpuInfo },
  { name: 'GPU',          fn: hw.getGpuInfo },
  { name: 'Memory',       fn: hw.getMemoryInfo },
  { name: 'Disk',         fn: hw.getDiskInfo },
  { name: 'Network',      fn: hw.getNetworkAdapterInfo },
  { name: 'Bluetooth',    fn: hw.getBluetoothDevices },
  { name: 'Motherboard',  fn: hw.getMotherboardInfo },
  { name: 'Monitor',      fn: hw.getMonitorInfo },
];

for (const t of tests) {
  console.log(`--- ${t.name} ---`);
  try {
    const result = t.fn();
    if (Array.isArray(result) && result.length > 0) {
      console.log(`  Found ${result.length} item(s)`);
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('  No data returned');
    }
  } catch (e) {
    console.error(`  Error: ${e}`);
  }
  console.log();
}

console.log('=== Smoke Test Complete ===');
