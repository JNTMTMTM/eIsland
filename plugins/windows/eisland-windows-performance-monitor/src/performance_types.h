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
 * @file performance_types.h
 * @description Windows 性能采集插件公共类型定义
 * @description 定义低开销 CPU 与内存快照数据结构
 * @author 鸡哥
 */

#ifndef PERFORMANCE_TYPES_H
#define PERFORMANCE_TYPES_H

#include <windows.h>
#include <stdbool.h>

typedef struct CpuSnapshot {
  double usage_percent;
  bool has_baseline;
} CpuSnapshot;

typedef struct MemorySnapshot {
  DWORDLONG total_bytes;
  DWORDLONG used_bytes;
  DWORDLONG available_bytes;
  double usage_percent;
} MemorySnapshot;

/* performance_core.c */
bool initialize_cpu_snapshot_baseline(void);
bool get_cpu_snapshot(CpuSnapshot* snapshot);
bool get_memory_snapshot(MemorySnapshot* snapshot);

#endif