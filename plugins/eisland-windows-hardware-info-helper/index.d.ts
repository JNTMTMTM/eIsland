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

// -- Data Types --

export interface CpuInfo {
  name: string | null;
  manufacturer: string | null;
  numberOfCores: number | null;
  numberOfLogicalProcessors: number | null;
  maxClockSpeedMhz: number | null;
  currentClockSpeedMhz: number | null;
  socketDesignation: string | null;
  architecture: string | null;
  l2CacheSizeKb: number | null;
  l3CacheSizeKb: number | null;
}

export interface GpuInfo {
  name: string | null;
  manufacturer: string | null;
  adapterRamBytes: number | null;
  driverVersion: string | null;
  driverDate: string | null;
  videoProcessor: string | null;
  currentHorizontalResolution: number | null;
  currentVerticalResolution: number | null;
  currentRefreshRate: number | null;
  status: string | null;
}

export interface MemorySlotInfo {
  deviceLocator: string | null;
  manufacturer: string | null;
  capacityBytes: number | null;
  speedMhz: number | null;
  memoryType: string | null;
  formFactor: string | null;
  dataWidth: number | null;
  partNumber: string | null;
  serialNumber: string | null;
}

export interface DiskInfo {
  model: string | null;
  manufacturer: string | null;
  sizeBytes: number | null;
  mediaType: string | null;
  interfaceType: string | null;
  partitions: number | null;
  serialNumber: string | null;
  status: string | null;
}

export interface NetworkAdapterInfo {
  name: string | null;
  manufacturer: string | null;
  macAddress: string | null;
  adapterType: string | null;
  speedBps: number | null;
  netConnectionStatus: boolean | null;
  pnpDeviceId: string | null;
  status: string | null;
}

export interface BluetoothDeviceInfo {
  name: string | null;
  deviceId: string | null;
  pnpDeviceId: string | null;
  status: string | null;
}

export interface MotherboardInfo {
  manufacturer: string | null;
  product: string | null;
  serialNumber: string | null;
  version: string | null;
}

export interface MonitorInfo {
  name: string | null;
  manufacturer: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  pnpDeviceId: string | null;
  status: string | null;
}

// -- Query Functions --

/** Get CPU information */
export function getCpuInfo(): CpuInfo[];

/** Get GPU information */
export function getGpuInfo(): GpuInfo[];

/** Get memory slot information */
export function getMemoryInfo(): MemorySlotInfo[];

/** Get disk information */
export function getDiskInfo(): DiskInfo[];

/** Get network adapter information */
export function getNetworkAdapterInfo(): NetworkAdapterInfo[];

/** Get Bluetooth device information (paired devices via WMI) */
export function getBluetoothDevices(): BluetoothDeviceInfo[];

/** Get motherboard information */
export function getMotherboardInfo(): MotherboardInfo[];

/** Get monitor information */
export function getMonitorInfo(): MonitorInfo[];
