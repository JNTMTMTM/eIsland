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
 * @file performance_core.c
 * @description Windows 性能采集插件核心实现
 * @description 使用 Win32 原生 API 获取 CPU 增量占用率与内存快照
 * @author 鸡哥
 */

#include "performance_types.h"
#include <string.h>

static ULONGLONG file_time_to_ull(const FILETIME* file_time) {
  ULARGE_INTEGER value;
  value.LowPart = file_time->dwLowDateTime;
  value.HighPart = file_time->dwHighDateTime;
  return value.QuadPart;
}

static double clamp_percent(double value) {
  if (value < 0.0) return 0.0;
  if (value > 100.0) return 100.0;
  return value;
}

static FILETIME last_idle_time;
static FILETIME last_kernel_time;
static FILETIME last_user_time;
static bool has_cpu_baseline = false;

bool initialize_cpu_snapshot_baseline(void) {
  if (!GetSystemTimes(&last_idle_time, &last_kernel_time, &last_user_time)) {
    has_cpu_baseline = false;
    return false;
  }

  has_cpu_baseline = true;
  return true;
}

bool get_cpu_snapshot(CpuSnapshot* snapshot) {
  FILETIME idle_time;
  FILETIME kernel_time;
  FILETIME user_time;
  ULONGLONG idle;
  ULONGLONG kernel;
  ULONGLONG user;
  ULONGLONG last_idle;
  ULONGLONG last_kernel;
  ULONGLONG last_user;
  ULONGLONG total_delta;
  ULONGLONG idle_delta;

  if (snapshot == NULL) {
    return false;
  }

  memset(snapshot, 0, sizeof(*snapshot));

  if (!GetSystemTimes(&idle_time, &kernel_time, &user_time)) {
    return false;
  }

  if (!has_cpu_baseline) {
    last_idle_time = idle_time;
    last_kernel_time = kernel_time;
    last_user_time = user_time;
    has_cpu_baseline = true;
    snapshot->has_baseline = false;
    snapshot->usage_percent = 0.0;
    return true;
  }

  idle = file_time_to_ull(&idle_time);
  kernel = file_time_to_ull(&kernel_time);
  user = file_time_to_ull(&user_time);
  last_idle = file_time_to_ull(&last_idle_time);
  last_kernel = file_time_to_ull(&last_kernel_time);
  last_user = file_time_to_ull(&last_user_time);

  last_idle_time = idle_time;
  last_kernel_time = kernel_time;
  last_user_time = user_time;

  if (kernel < last_kernel || user < last_user || idle < last_idle) {
    snapshot->has_baseline = false;
    snapshot->usage_percent = 0.0;
    return true;
  }

  total_delta = (kernel - last_kernel) + (user - last_user);
  idle_delta = idle - last_idle;

  snapshot->has_baseline = true;
  if (total_delta == 0 || idle_delta > total_delta) {
    snapshot->usage_percent = 0.0;
  } else {
    snapshot->usage_percent = clamp_percent((double)(total_delta - idle_delta) * 100.0 / (double)total_delta);
  }

  return true;
}

bool get_memory_snapshot(MemorySnapshot* snapshot) {
  MEMORYSTATUSEX status;

  if (snapshot == NULL) {
    return false;
  }

  memset(snapshot, 0, sizeof(*snapshot));
  memset(&status, 0, sizeof(status));
  status.dwLength = sizeof(status);

  if (!GlobalMemoryStatusEx(&status)) {
    return false;
  }

  snapshot->total_bytes = status.ullTotalPhys;
  snapshot->available_bytes = status.ullAvailPhys;
  snapshot->used_bytes = status.ullTotalPhys >= status.ullAvailPhys ? status.ullTotalPhys - status.ullAvailPhys : 0;
  snapshot->usage_percent = status.ullTotalPhys == 0
    ? 0.0
    : clamp_percent((double)snapshot->used_bytes * 100.0 / (double)status.ullTotalPhys);

  return true;
}