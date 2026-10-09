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
 * @file napi_binding.c
 * @description N-API argument parsing and exported function implementations.
 * @author JNTMTMTM
 */

#include "napi_binding.h"
#include "types.h"
#include "string_utils.h"
#include "process_ops.h"
#include "napi_helpers.h"
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

static bool read_string_target(napi_env env, napi_value value, ProcessTarget* target) {
  size_t copied_length;
  napi_status status;

  status = napi_get_value_string_utf16(env, value, (char16_t*)target->name, MAX_PROCESS_NAME_LENGTH, &copied_length);
  if (status != napi_ok || copied_length == 0) {
    napi_throw_type_error(env, NULL, "Process name must be a non-empty string.");
    return false;
  }

  target->kind = PROCESS_TARGET_NAME;
  target->pid = 0;
  target->name[MAX_PROCESS_NAME_LENGTH - 1] = L'\0';
  normalize_process_name(target->name, target->normalized_name, MAX_PROCESS_NAME_LENGTH);
  return true;
}

static bool read_number_target(napi_env env, napi_value value, ProcessTarget* target) {
  uint32_t pid;
  napi_status status = napi_get_value_uint32(env, value, &pid);

  if (status != napi_ok || pid == 0) {
    napi_throw_type_error(env, NULL, "Process id must be a positive integer.");
    return false;
  }

  target->kind = PROCESS_TARGET_PID;
  target->pid = (DWORD)pid;
  target->name[0] = L'\0';
  target->normalized_name[0] = L'\0';
  return true;
}

bool read_target(napi_env env, napi_value value, ProcessTarget* target) {
  napi_valuetype value_type;

  memset(target, 0, sizeof(ProcessTarget));
  napi_typeof(env, value, &value_type);

  if (value_type == napi_string) {
    return read_string_target(env, value, target);
  }

  if (value_type == napi_number) {
    return read_number_target(env, value, target);
  }

  napi_throw_type_error(env, NULL, "Process target must be a process name string or process id number.");
  return false;
}

napi_value close_single_process(napi_env env, napi_callback_info callback_info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value result;
  ProcessTarget target;
  ProcessCloseResult close_result;

  napi_get_cb_info(env, callback_info, &argc, args, NULL, NULL);
  if (argc < 1) {
    napi_throw_type_error(env, NULL, "closeProcess requires one process target.");
    napi_get_undefined(env, &result);
    return result;
  }

  if (!read_target(env, args[0], &target)) {
    napi_get_undefined(env, &result);
    return result;
  }

  close_matching_processes(&target, &close_result);
  result = make_result(env, &target, &close_result);
  free(close_result.failures);
  return result;
}

napi_value close_multiple_processes(napi_env env, napi_callback_info callback_info) {
  size_t argc = 1;
  uint32_t length;
  uint32_t index;
  bool is_array;
  napi_value args[1];
  napi_value results;

  napi_get_cb_info(env, callback_info, &argc, args, NULL, NULL);
  if (argc < 1) {
    napi_throw_type_error(env, NULL, "closeProcesses requires one process target array.");
    napi_get_undefined(env, &results);
    return results;
  }

  napi_is_array(env, args[0], &is_array);
  if (!is_array) {
    napi_throw_type_error(env, NULL, "closeProcesses requires an array of process targets.");
    napi_get_undefined(env, &results);
    return results;
  }

  napi_get_array_length(env, args[0], &length);
  napi_create_array_with_length(env, length, &results);

  for (index = 0; index < length; index += 1) {
    napi_value item;
    napi_value item_result;
    ProcessTarget target;
    ProcessCloseResult close_result;

    napi_get_element(env, args[0], index, &item);
    if (!read_target(env, item, &target)) {
      return results;
    }

    close_matching_processes(&target, &close_result);
    item_result = make_result(env, &target, &close_result);
    napi_set_element(env, results, index, item_result);
    free(close_result.failures);
  }

  return results;
}
