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
 * @file addon.c
 * @description 将 Swift 原生亮度读写接口暴露为稳定 Node-API 8 模块。
 * @author 鸡哥
 */
#include <node_api.h>
#include <math.h>
#include <stdint.h>
#include <stdlib.h>

extern char *brightness_get(void);
extern int32_t brightness_set(double percent);
extern void brightness_free(char *value);

/**
 * 返回 Swift JSON，并在构造 JS 字符串后释放原生缓冲区。
 * @param env - 当前 Node-API 环境。
 * @param info - 未使用的调用参数。
 * @returns JS 字符串；Node-API 失败时返回 NULL。
 */
static napi_value get_json(napi_env env, napi_callback_info info) {
  (void)info;
  char *json = brightness_get();
  napi_value result = NULL;
  napi_status status = napi_create_string_utf8(env, json ? json : "null", NAPI_AUTO_LENGTH, &result);
  brightness_free(json);
  if (status != napi_ok) return NULL;
  return result;
}

/**
 * 验证有限数值，避免不可信调用进入浮点到整数转换。
 * @param env - 当前 Node-API 环境。
 * @param info - 包含百分比参数的调用信息。
 * @returns JS 布尔值；参数错误时抛出 RangeError 并返回 NULL。
 */
static napi_value set_percent(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argument = NULL;
  if (napi_get_cb_info(env, info, &argc, &argument, NULL, NULL) != napi_ok) return NULL;
  double percent = 0;
  if (argc != 1 || napi_get_value_double(env, argument, &percent) != napi_ok || !isfinite(percent)) {
    napi_throw_range_error(env, NULL, "Brightness must be a finite number.");
    return NULL;
  }
  napi_value result = NULL;
  if (napi_get_boolean(env, brightness_set(percent) != 0, &result) != napi_ok) return NULL;
  return result;
}

/**
 * 注册不依赖 Node/V8 ABI 的原生入口。
 * @param env - 当前 Node-API 环境。
 * @param exports - 模块导出对象。
 * @returns 注册后的导出对象；失败时返回 NULL。
 */
static napi_value initialize(napi_env env, napi_value exports) {
  napi_property_descriptor properties[] = {
    {"getJson", NULL, get_json, NULL, NULL, NULL, napi_default, NULL},
    {"setBrightness", NULL, set_percent, NULL, NULL, NULL, napi_default, NULL},
  };
  if (napi_define_properties(env, exports, sizeof(properties) / sizeof(properties[0]), properties) != napi_ok) return NULL;
  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, initialize)
