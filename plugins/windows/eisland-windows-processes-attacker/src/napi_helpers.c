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
 * @file napi_helpers.c
 * @description N-API value creation and result-building implementations.
 * @author JNTMTMTM
 */

#include "napi_helpers.h"

napi_value make_uint32(napi_env env, uint32_t value) {
  napi_value result;
  napi_create_uint32(env, value, &result);
  return result;
}

napi_value make_wide_string(napi_env env, const WCHAR* value) {
  napi_value result;
  napi_create_string_utf16(env, (const char16_t*)value, NAPI_AUTO_LENGTH, &result);
  return result;
}

napi_value make_target_value(napi_env env, const ProcessTarget* target) {
  napi_value result;

  if (target->kind == PROCESS_TARGET_PID) {
    napi_create_uint32(env, target->pid, &result);
    return result;
  }

  return make_wide_string(env, target->name);
}

napi_value make_failure(napi_env env, const ProcessFailure* failure) {
  napi_value object;

  napi_create_object(env, &object);
  napi_set_named_property(env, object, "pid", make_uint32(env, failure->pid));
  napi_set_named_property(env, object, "name", make_wide_string(env, failure->name));
  napi_set_named_property(env, object, "errorCode", make_uint32(env, failure->error_code));
  return object;
}

napi_value make_result(napi_env env, const ProcessTarget* target, const ProcessCloseResult* close_result) {
  napi_value object;
  napi_value failures;
  DWORD index;

  napi_create_object(env, &object);
  napi_set_named_property(env, object, "target", make_target_value(env, target));
  napi_set_named_property(env, object, "matchedCount", make_uint32(env, close_result->matched_count));
  napi_set_named_property(env, object, "terminatedCount", make_uint32(env, close_result->terminated_count));
  napi_set_named_property(env, object, "failedCount", make_uint32(env, close_result->failed_count));

  napi_create_array_with_length(env, close_result->failed_count, &failures);
  for (index = 0; index < close_result->failed_count; index += 1) {
    napi_set_element(env, failures, index, make_failure(env, &close_result->failures[index]));
  }
  napi_set_named_property(env, object, "failures", failures);

  return object;
}
