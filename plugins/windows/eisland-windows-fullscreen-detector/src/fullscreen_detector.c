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
 * @file fullscreen_detector.c
 * @description 全屏检测器 Node-API 绑定层
 * @description 将 C 语言全屏检测能力暴露为 Node.js 原生模块接口
 * @author 鸡哥
 */

#include <node_api.h>
#include "fullscreen_types.h"
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static napi_value make_number(napi_env env, int32_t value) {
  napi_value result;
  napi_create_int32(env, value, &result);
  return result;
}

static napi_value make_bool(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

static napi_value make_wide_string(napi_env env, const WCHAR* value) {
  napi_value result;
  napi_create_string_utf16(env, (const char16_t*)value, NAPI_AUTO_LENGTH, &result);
  return result;
}

static napi_value make_rect(napi_env env, const RECT* rect) {
  napi_value object;
  napi_create_object(env, &object);
  napi_set_named_property(env, object, "left", make_number(env, rect->left));
  napi_set_named_property(env, object, "top", make_number(env, rect->top));
  napi_set_named_property(env, object, "right", make_number(env, rect->right));
  napi_set_named_property(env, object, "bottom", make_number(env, rect->bottom));
  napi_set_named_property(env, object, "width", make_number(env, rect_width(rect)));
  napi_set_named_property(env, object, "height", make_number(env, rect_height(rect)));
  return object;
}

static napi_value make_monitor_info(napi_env env, const MONITORINFO* monitor_info) {
  napi_value object = make_rect(env, &monitor_info->rcMonitor);
  napi_set_named_property(env, object, "isPrimary", make_bool(env, (monitor_info->dwFlags & MONITORINFOF_PRIMARY) != 0));
  return object;
}

static napi_value make_hwnd_string(napi_env env, HWND hwnd) {
  char buffer[32];
  napi_value result;
#if defined(_WIN64)
  snprintf(buffer, sizeof(buffer), "0x%llx", (unsigned long long)(uintptr_t)hwnd);
#else
  snprintf(buffer, sizeof(buffer), "0x%lx", (unsigned long)(uintptr_t)hwnd);
#endif
  napi_create_string_utf8(env, buffer, NAPI_AUTO_LENGTH, &result);
  return result;
}

static napi_value make_fullscreen_info(napi_env env, const FullscreenWindowInfo* info, BOOL is_foreground) {
  napi_value object;
  napi_create_object(env, &object);
  napi_set_named_property(env, object, "hwnd", make_hwnd_string(env, info->hwnd));
  napi_set_named_property(env, object, "title", make_wide_string(env, info->title));
  napi_set_named_property(env, object, "processId", make_number(env, (int32_t)info->process_id));
  napi_set_named_property(env, object, "bounds", make_rect(env, &info->bounds));
  napi_set_named_property(env, object, "monitor", make_monitor_info(env, &info->monitor_info));
  napi_set_named_property(env, object, "isForeground", make_bool(env, is_foreground));
  return object;
}

static napi_value get_foreground_fullscreen_window(napi_env env, napi_callback_info callback_info) {
  HWND foreground = GetForegroundWindow();
  FullscreenWindowInfo info;
  napi_value result;

  (void)callback_info;

  if (foreground != NULL && get_fullscreen_info(foreground, &info)) {
    return make_fullscreen_info(env, &info, TRUE);
  }

  napi_get_null(env, &result);
  return result;
}

static napi_value get_fullscreen_windows(napi_env env, napi_callback_info callback_info) {
  WindowList list;
  HWND foreground;
  napi_value result;
  size_t index;

  (void)callback_info;

  memset(&list, 0, sizeof(list));
  foreground = GetForegroundWindow();

  EnumWindows(enum_windows_callback, (LPARAM)&list);
  napi_create_array_with_length(env, list.length, &result);

  for (index = 0; index < list.length; index += 1) {
    napi_value item = make_fullscreen_info(env, &list.items[index], list.items[index].hwnd == foreground);
    napi_set_element(env, result, (uint32_t)index, item);
  }

  free(list.items);
  return result;
}

static napi_value is_any_fullscreen_window(napi_env env, napi_callback_info callback_info) {
  HWND foreground = GetForegroundWindow();
  FullscreenWindowInfo info;
  BOOL is_fullscreen;

  (void)callback_info;

  is_fullscreen = foreground != NULL && get_fullscreen_info(foreground, &info);
  return make_bool(env, is_fullscreen != FALSE);
}

static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor descriptors[] = {
    { "getForegroundFullscreenWindow", NULL, get_foreground_fullscreen_window, NULL, NULL, NULL, napi_default, NULL },
    { "getFullscreenWindows", NULL, get_fullscreen_windows, NULL, NULL, NULL, napi_default, NULL },
    { "isAnyFullscreenWindow", NULL, is_any_fullscreen_window, NULL, NULL, NULL, napi_default, NULL }
  };

  napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
