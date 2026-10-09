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
 * @file performance_monitor.c
 * @description Windows 性能采集插件 Node-API 绑定层
 * @description 暴露 CPU 与内存两个独立的低开销采集方法
 * @author 鸡哥
 */

#include <node_api.h>
#include "performance_types.h"
#include <stdint.h>

static napi_value make_double(napi_env env, double value) {
  napi_value result;
  napi_create_double(env, value, &result);
  return result;
}

static napi_value make_uint64_as_double(napi_env env, DWORDLONG value) {
  napi_value result;
  napi_create_double(env, (double)value, &result);
  return result;
}

static napi_value make_bool(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

static napi_value get_cpu(napi_env env, napi_callback_info callback_info) {
  CpuSnapshot snapshot;
  napi_value result;

  (void)callback_info;

  if (!get_cpu_snapshot(&snapshot)) {
    napi_throw_error(env, NULL, "Unable to query CPU performance data.");
    napi_get_undefined(env, &result);
    return result;
  }

  napi_create_object(env, &result);
  napi_set_named_property(env, result, "usagePercent", make_double(env, snapshot.usage_percent));
  napi_set_named_property(env, result, "hasBaseline", make_bool(env, snapshot.has_baseline));
  return result;
}

static napi_value get_memory(napi_env env, napi_callback_info callback_info) {
  MemorySnapshot snapshot;
  napi_value result;

  (void)callback_info;

  if (!get_memory_snapshot(&snapshot)) {
    napi_throw_error(env, NULL, "Unable to query memory performance data.");
    napi_get_undefined(env, &result);
    return result;
  }

  napi_create_object(env, &result);
  napi_set_named_property(env, result, "totalBytes", make_uint64_as_double(env, snapshot.total_bytes));
  napi_set_named_property(env, result, "usedBytes", make_uint64_as_double(env, snapshot.used_bytes));
  napi_set_named_property(env, result, "availableBytes", make_uint64_as_double(env, snapshot.available_bytes));
  napi_set_named_property(env, result, "usagePercent", make_double(env, snapshot.usage_percent));
  return result;
}

static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    { "getCpu", NULL, get_cpu, NULL, NULL, NULL, napi_default, NULL },
    { "getMemory", NULL, get_memory, NULL, NULL, NULL, napi_default, NULL }
  };

  initialize_cpu_snapshot_baseline();
  napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)